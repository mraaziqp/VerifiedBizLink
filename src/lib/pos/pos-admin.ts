import db, { withTransaction } from '@/lib/db';
import { ensurePosSchema } from './schema';
import { PosError, isUuid } from './errors';
import { logPosAudit } from './audit';
import { createFeeRule, type NewFeeRuleInput } from './fees';
import { feeWaiverJournal, postJournal } from './ledger';

/**
 * VerifiedBizLink's view of the POS business.
 *
 * Platform revenue is ONLY what has been collected (pos_billing_charges).
 * Fees accrued on merchants' sales are receivables until a statement is paid,
 * and merchants' sales are never counted as platform money.
 */

const dateOr = (v: string | undefined, fallback: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback);

export async function getAdminPosOverview(fromIn?: string, toIn?: string) {
  await ensurePosSchema();
  const today = new Date().toISOString().slice(0, 10);
  const from = dateOr(fromIn, `${today.slice(0, 7)}-01`);
  const to = dateOr(toIn, today);

  const [subs] = await db`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'trial') AS trial,
      COUNT(*) FILTER (WHERE status = 'grace') AS grace,
      COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
      COUNT(*) FILTER (WHERE status IN ('inactive', 'cancelled')) AS inactive,
      COALESCE(SUM(recurring_amount_cents) FILTER (WHERE status IN ('active', 'grace') AND cancel_at_period_end = false), 0) AS mrr_cents
    FROM pos_merchant_subscriptions
  `;
  const [sales] = await db`
    SELECT
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed_count,
      COALESCE(SUM(total_cents) FILTER (WHERE completed_at IS NOT NULL), 0) AS gmv_cents,
      COALESCE(SUM(refunded_cents), 0) AS refunds_cents,
      COALESCE(SUM(platform_fee_cents) FILTER (WHERE completed_at IS NOT NULL AND fee_status NOT IN ('not_billable', 'none')), 0) AS fees_accrued_cents,
      COALESCE(SUM(fee_reversed_cents), 0) AS fees_reversed_cents,
      COUNT(*) FILTER (WHERE payment_status IN ('failed', 'cancelled')) AS failed_count
    FROM pos_sales
    WHERE created_at >= ${from}::date AND created_at < ${to}::date + 1
  `;
  const [collected] = await db`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'subscription'), 0) AS subscription_cents,
      COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'setup_fee'), 0) AS setup_fee_cents,
      COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'fee_statement'), 0) AS fee_statement_cents
    FROM pos_billing_charges
    WHERE created_at >= ${from}::date AND created_at < ${to}::date + 1
  `;
  // Receivables are point-in-time, not period-bound.
  const [receivable] = await db`
    SELECT
      COALESCE((SELECT SUM(net_due_cents) FROM pos_fee_statements WHERE status = 'open' OR (status = 'carried' AND carried_to IS NULL)), 0) AS outstanding_cents,
      COALESCE((SELECT SUM(net_due_cents) FROM pos_fee_statements WHERE status = 'open' AND due_at < NOW()), 0) AS overdue_cents,
      COALESCE((SELECT SUM(platform_fee_cents) FROM pos_sales WHERE fee_statement_id IS NULL AND fee_status = 'accrued'), 0)
        - COALESCE((SELECT SUM(fee_reversal_cents) FROM pos_refunds WHERE fee_statement_id IS NULL), 0) AS unbilled_cents,
      COALESCE((SELECT SUM(net_due_cents) FROM pos_fee_statements WHERE status = 'waived'), 0) AS waived_cents
  `;
  const [issues] = await db`
    SELECT
      (SELECT COUNT(*) FROM pos_stock_conflicts WHERE resolved_at IS NULL) AS open_stock_conflicts,
      (SELECT COUNT(*) FROM pos_sales WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '1 hour') AS stale_pending_sales
  `;

  const platformRevenue = Number(collected.subscription_cents) + Number(collected.setup_fee_cents) + Number(collected.fee_statement_cents);
  return {
    period: { from, to },
    merchants: subs,
    mrrCents: Number(subs.mrr_cents),
    sales: {
      completedCount: Number(sales.completed_count),
      /** Merchants' money. Shown for scale, never counted as platform revenue. */
      merchantGmvCents: Number(sales.gmv_cents),
      refundsCents: Number(sales.refunds_cents),
      failedCount: Number(sales.failed_count),
    },
    fees: {
      accruedCents: Number(sales.fees_accrued_cents),
      reversedCents: Number(sales.fees_reversed_cents),
      unbilledCents: Number(receivable.unbilled_cents),
      outstandingCents: Number(receivable.outstanding_cents),
      overdueCents: Number(receivable.overdue_cents),
      waivedCents: Number(receivable.waived_cents),
    },
    collectedRevenue: {
      subscriptionCents: Number(collected.subscription_cents),
      setupFeeCents: Number(collected.setup_fee_cents),
      transactionFeeCents: Number(collected.fee_statement_cents),
      totalCents: platformRevenue,
    },
    issues,
  };
}

export async function getAdminMerchants(search?: string) {
  await ensurePosSchema();
  const q = search ? `%${search.trim().toLowerCase().slice(0, 80)}%` : null;
  return db`
    SELECT
      b.id AS business_id, b.company_name, b.status AS verification_status,
      s.plan_key, s.status AS subscription_status, s.activated_at, s.renews_at, s.cancel_at_period_end,
      s.suspended_reason, (s.payfast_token IS NOT NULL) AS has_payfast_subscription,
      (SELECT COUNT(*) FROM pos_tills t WHERE t.business_id = b.id) AS tills,
      COALESCE(x.month_sales_cents, 0) AS month_sales_cents,
      COALESCE(x.lifetime_sales_cents, 0) AS lifetime_sales_cents,
      COALESCE(x.tx_count, 0) AS tx_count,
      COALESCE(x.fees_accrued_cents, 0) AS fees_accrued_cents,
      x.last_sale_at,
      COALESCE((SELECT SUM(amount_cents) FROM pos_billing_charges c WHERE c.business_id = b.id AND c.kind = 'fee_statement'), 0) AS fees_collected_cents,
      COALESCE((SELECT SUM(net_due_cents) FROM pos_fee_statements f WHERE f.business_id = b.id AND f.status = 'open'), 0) AS outstanding_cents,
      (SELECT r.rate_bps FROM pos_fee_rules r WHERE r.scope = 'merchant' AND r.business_id = b.id
         AND r.effective_from <= NOW() AND (r.effective_to IS NULL OR r.effective_to > NOW()) ORDER BY r.effective_from DESC LIMIT 1) AS fee_override_bps
    FROM pos_merchant_subscriptions s
    JOIN businesses b ON b.id = s.business_id
    LEFT JOIN LATERAL (
      SELECT
        SUM(total_cents) FILTER (WHERE completed_at >= date_trunc('month', NOW())) AS month_sales_cents,
        SUM(total_cents) AS lifetime_sales_cents,
        COUNT(*) AS tx_count,
        SUM(platform_fee_cents - fee_reversed_cents) FILTER (WHERE fee_status NOT IN ('not_billable', 'none')) AS fees_accrued_cents,
        MAX(completed_at) AS last_sale_at
      FROM pos_sales WHERE business_id = b.id AND completed_at IS NOT NULL
    ) x ON true
    WHERE (${q}::text IS NULL OR LOWER(b.company_name) LIKE ${q})
    ORDER BY lifetime_sales_cents DESC NULLS LAST, b.company_name
    LIMIT 500
  `;
}

export async function getAdminMerchantDetail(businessId: string) {
  await ensurePosSchema();
  if (!isUuid(businessId)) throw new PosError(400, 'BAD_BUSINESS', 'Invalid business.');
  const [merchant] = await db`
    SELECT b.id, b.company_name, b.status AS verification_status, s.*
    FROM businesses b LEFT JOIN pos_merchant_subscriptions s ON s.business_id = b.id
    WHERE b.id = ${businessId}
  `;
  if (!merchant) throw new PosError(404, 'NOT_FOUND', 'Business not found.');
  const recentSales = await db`
    SELECT id, receipt_number, total_cents, platform_fee_cents, refunded_cents, payment_method, payment_status, created_at, review_reason
    FROM pos_sales WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 50
  `;
  const statements = await db`SELECT * FROM pos_fee_statements WHERE business_id = ${businessId} ORDER BY period_start DESC LIMIT 24`;
  const charges = await db`SELECT * FROM pos_billing_charges WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 50`;
  const feeRules = await db`SELECT * FROM pos_fee_rules WHERE scope = 'merchant' AND business_id = ${businessId} ORDER BY effective_from DESC`;
  const [inventory] = await db`
    SELECT COUNT(*) AS products, COALESCE(SUM(ROUND(stock_quantity * cost_price_cents)), 0) AS cost_value_cents,
      COUNT(*) FILTER (WHERE stock_quantity <= 0) AS out_of_stock
    FROM pos_products WHERE business_id = ${businessId} AND is_active
  `;
  const audit = await db`SELECT * FROM pos_audit_logs WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 50`;
  return { merchant, recentSales, statements, charges, feeRules, inventory, audit };
}

export interface AdminActor {
  userId: string;
  role: string;
}

function reasonRequired(reason: unknown): string {
  const r = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (r.length < 3) throw new PosError(400, 'REASON_REQUIRED', 'Give a reason — it is recorded in the audit log.');
  return r;
}

export async function adminSetMerchantAccess(businessId: string, action: 'suspend' | 'reactivate', actor: AdminActor, reasonIn: unknown) {
  await ensurePosSchema();
  if (!isUuid(businessId)) throw new PosError(400, 'BAD_BUSINESS', 'Invalid business.');
  const reason = reasonRequired(reasonIn);
  return withTransaction(async (tx) => {
    const [before] = await tx`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${businessId} FOR UPDATE`;
    if (!before) throw new PosError(404, 'NO_SUBSCRIPTION', 'This business has no POS subscription.');
    let after;
    if (action === 'suspend') {
      [after] = await tx`
        UPDATE pos_merchant_subscriptions SET status = 'suspended', suspended_at = NOW(), suspended_reason = 'admin', updated_at = NOW()
        WHERE business_id = ${businessId} RETURNING *
      `;
    } else {
      if (before.status !== 'suspended') throw new PosError(409, 'NOT_SUSPENDED', 'This merchant is not suspended.');
      // Back to active only if the paid term is current; otherwise they must pay.
      [after] = await tx`
        UPDATE pos_merchant_subscriptions
        SET status = CASE WHEN renews_at > NOW() THEN 'active' ELSE 'inactive' END,
            suspended_at = NULL, suspended_reason = NULL, payment_failed_at = NULL, updated_at = NOW()
        WHERE business_id = ${businessId} RETURNING *
      `;
    }
    await logPosAudit({
      businessId, actorUserId: actor.userId, actorRole: `platform:${actor.role}`, action: `admin_${action}`,
      targetType: 'subscription', targetId: String(before.id),
      detail: { reason, from: before.status, to: after.status },
    }, tx);
    return after;
  });
}

export async function adminChangePlan(businessId: string, planKey: unknown, actor: AdminActor, reasonIn: unknown) {
  await ensurePosSchema();
  if (!isUuid(businessId)) throw new PosError(400, 'BAD_BUSINESS', 'Invalid business.');
  const reason = reasonRequired(reasonIn);
  const [plan] = await db`SELECT plan_key FROM pos_subscription_plans WHERE plan_key = ${String(planKey)}`;
  if (!plan) throw new PosError(404, 'PLAN_NOT_FOUND', 'Unknown plan.');
  return withTransaction(async (tx) => {
    const [before] = await tx`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${businessId} FOR UPDATE`;
    if (!before) throw new PosError(404, 'NO_SUBSCRIPTION', 'This business has no POS subscription.');
    const [after] = await tx`
      UPDATE pos_merchant_subscriptions SET plan_key = ${plan.plan_key}, updated_at = NOW() WHERE business_id = ${businessId} RETURNING *
    `;
    await logPosAudit({
      businessId, actorUserId: actor.userId, actorRole: `platform:${actor.role}`, action: 'admin_plan_change',
      targetType: 'subscription', targetId: String(before.id),
      detail: { reason, from: before.plan_key, to: plan.plan_key, note: 'Limits change now; the PayFast recurring amount is unchanged.' },
    }, tx);
    return after;
  });
}

export async function adminCreateFeeRule(input: Omit<NewFeeRuleInput, 'createdBy'>, actor: AdminActor) {
  await ensurePosSchema();
  if (input.scope === 'merchant' && !isUuid(input.businessId)) throw new PosError(400, 'BAD_BUSINESS', 'Invalid business.');
  return withTransaction(async (tx) => {
    let rule;
    try {
      rule = await createFeeRule(tx, { ...input, createdBy: actor.userId });
    } catch (err) {
      throw new PosError(400, 'BAD_FEE_RULE', err instanceof Error ? err.message : 'Invalid fee rule.');
    }
    if (input.scope === 'plan') {
      // Keep the plan's display column in step with the rule.
      await tx`UPDATE pos_subscription_plans SET transaction_fee_percent = ${input.rateBps / 100}, updated_at = NOW() WHERE plan_key = ${input.planKey}`;
    }
    await logPosAudit({
      businessId: input.scope === 'merchant' ? input.businessId ?? null : null,
      actorUserId: actor.userId, actorRole: `platform:${actor.role}`, action: 'fee_rule_created',
      targetType: 'fee_rule', targetId: String(rule.id),
      detail: { scope: input.scope, planKey: input.planKey ?? null, rateBps: input.rateBps, exempt: Boolean(input.exempt), reason: input.reason },
    }, tx);
    return rule;
  });
}

export async function adminWaiveStatement(statementId: string, actor: AdminActor, reasonIn: unknown) {
  await ensurePosSchema();
  if (!isUuid(statementId)) throw new PosError(400, 'BAD_STATEMENT', 'Invalid statement.');
  const reason = reasonRequired(reasonIn);
  return withTransaction(async (tx) => {
    const [s] = await tx`
      UPDATE pos_fee_statements SET status = 'waived', waived_by = ${actor.userId}, waived_reason = ${reason}
      WHERE id = ${statementId} AND status = 'open' RETURNING *
    `;
    if (!s) throw new PosError(409, 'NOT_OPEN', 'Only an open statement can be waived.');
    await tx`UPDATE pos_sales SET fee_status = 'waived' WHERE fee_statement_id = ${statementId}`;
    await postJournal(tx, feeWaiverJournal({
      businessId: String(s.business_id), statementId, statementNumber: String(s.statement_number), amountCents: Number(s.net_due_cents),
    }));
    await logPosAudit({
      businessId: String(s.business_id), actorUserId: actor.userId, actorRole: `platform:${actor.role}`, action: 'fee_statement_waived',
      targetType: 'fee_statement', targetId: statementId, detail: { reason, amountCents: Number(s.net_due_cents) },
    }, tx);
    return s;
  });
}


export async function adminUpdatePlan(planKey: string, updates: Record<string, unknown>, actor: AdminActor) {
  await ensurePosSchema();
  const [before] = await db`SELECT * FROM pos_subscription_plans WHERE plan_key = ${planKey}`;
  if (!before) throw new PosError(404, 'PLAN_NOT_FOUND', 'Unknown plan.');
  const num = (k: string, min: number, max: number) => {
    if (!(k in updates)) return null;
    const n = Number(updates[k]);
    if (!Number.isFinite(n) || n < min || n > max) throw new PosError(400, 'BAD_PLAN_FIELD', `${k} must be between ${min} and ${max}.`);
    return n;
  };
  const monthly = num('monthly_price_rand', 0, 100000);
  const setup = num('setup_fee_rand', 0, 100000);
  const tills = num('max_tills', 1, 1000);
  const staff = num('max_staff', 1, 10000);
  const trial = num('trial_days', 0, 90);
  const sort = num('sort_order', 0, 1000);
  const features = 'features' in updates
    ? (Array.isArray(updates.features) ? updates.features.map((f) => String(f).slice(0, 120)).slice(0, 20) : null)
    : null;
  if ('features' in updates && !features) throw new PosError(400, 'BAD_PLAN_FIELD', 'features must be a list.');

  const [after] = await db`
    UPDATE pos_subscription_plans SET
      name = COALESCE(${'name' in updates ? String(updates.name).slice(0, 80) : null}, name),
      monthly_price_rand = COALESCE(${monthly}, monthly_price_rand),
      setup_fee_rand = COALESCE(${setup}, setup_fee_rand),
      max_tills = COALESCE(${tills === null ? null : Math.trunc(tills)}, max_tills),
      max_staff = COALESCE(${staff === null ? null : Math.trunc(staff)}, max_staff),
      trial_days = COALESCE(${trial === null ? null : Math.trunc(trial)}, trial_days),
      sort_order = COALESCE(${sort === null ? null : Math.trunc(sort)}, sort_order),
      is_active = COALESCE(${'is_active' in updates ? Boolean(updates.is_active) : null}, is_active),
      features = COALESCE(${features ? JSON.stringify(features) : null}::jsonb, features),
      description = COALESCE(${'description' in updates ? String(updates.description).slice(0, 500) : null}, description),
      updated_at = NOW()
    WHERE plan_key = ${planKey}
    RETURNING *
  `;
  await logPosAudit({
    businessId: null, actorUserId: actor.userId, actorRole: `platform:${actor.role}`, action: 'plan_updated',
    targetType: 'plan', targetId: planKey,
    detail: { before: { monthly: before.monthly_price_rand, setup: before.setup_fee_rand, tills: before.max_tills, staff: before.max_staff, active: before.is_active },
              after: { monthly: after.monthly_price_rand, setup: after.setup_fee_rand, tills: after.max_tills, staff: after.max_staff, active: after.is_active },
              note: 'Existing PayFast subscriptions keep the amount they signed up at.' },
  });
  return after;
}

export async function getAdminAuditLog(limit = 200) {
  await ensurePosSchema();
  return db`
    SELECT a.*, b.company_name, u.email AS actor_email
    FROM pos_audit_logs a
    LEFT JOIN businesses b ON b.id = a.business_id
    LEFT JOIN users u ON u.id = a.actor_user_id
    ORDER BY a.created_at DESC LIMIT ${Math.min(Math.max(1, limit), 1000)}
  `;
}

export async function getAdminStatements(status?: string) {
  await ensurePosSchema();
  const st = status && ['open', 'paid', 'waived', 'credit', 'zero', 'carried'].includes(status) ? status : null;
  return db`
    SELECT f.*, b.company_name FROM pos_fee_statements f JOIN businesses b ON b.id = f.business_id
    WHERE (${st}::text IS NULL OR f.status = ${st})
    ORDER BY f.period_start DESC, b.company_name LIMIT 1000
  `;
}

export async function getAdminCharges(from?: string, to?: string) {
  await ensurePosSchema();
  return db`
    SELECT c.*, b.company_name FROM pos_billing_charges c JOIN businesses b ON b.id = c.business_id
    WHERE (${from ?? null}::date IS NULL OR c.created_at >= ${from ?? null}::date)
      AND (${to ?? null}::date IS NULL OR c.created_at < ${to ?? null}::date + 1)
    ORDER BY c.created_at DESC LIMIT 5000
  `;
}
