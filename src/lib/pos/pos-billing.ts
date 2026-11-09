import db, { withTransaction, type DbRow } from '@/lib/db';
import { ensurePosSchema } from './schema';
import { PosError, isUuid } from './errors';
import { logPosAudit } from './audit';
import { postJournal, feePaymentJournal } from './ledger';
import { resolveFeeRule } from './fees';
import { randToCents, formatZar } from './money';
import { nextBillingDate, GRACE_PERIOD_HOURS, RENEWAL_GRACE_HOURS } from '@/lib/billing';
import { createPayfastCheckout, type CheckoutSession } from '@/lib/payfast-checkout-server';
import { cancelPayfastSubscription } from '@/lib/payfast-api';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * How VerifiedBizLink is paid for POS.
 *
 *  1. Activation: a PayFast subscription. The first charge is the setup fee
 *     plus the first month; PayFast then bills the monthly price. Only a
 *     validated ITN activates anything (applyPosSubscriptionCharge).
 *  2. Transaction fees: every completed sale accrues a fee (checkout.ts). At
 *     each month end the unbilled fees, less fee reversals from refunds and
 *     any carried credit, become a fee statement the merchant pays through
 *     PayFast (applyFeeStatementPayment). Only then is a fee "collected".
 *  3. The sweep (runPosBillingSweep) moves overdue accounts to grace and then
 *     to read-only; it never deletes anything.
 *
 * VerifiedBizLink never receives a merchant's sale money on this path: the
 * merchant is paid by their own customers (cash, own card machine) and pays
 * VerifiedBizLink its subscription and fees separately.
 */

export const POS_STATEMENT_DUE_DAYS = 7;
/** PayFast's smallest charge. Statements below it carry forward instead. */
export const POS_MIN_COLLECTION_CENTS = 500;
const SA_TZ = 'Africa/Johannesburg';

export const POS_PURCHASE_PREFIX = 'pos_subscription_';
export const POS_FEE_STATEMENT_PURCHASE = 'pos_fee_statement';

async function notifyOwner(businessId: string, type: string, title: string, content: string) {
  await db`
    INSERT INTO notifications (user_id, type, title, content)
    SELECT user_id, ${type}, ${title}, ${content} FROM businesses WHERE id = ${businessId}
  `.catch((err) => console.error('[pos] notification failed:', err?.message));
}

// ==========================================
// Plans & subscription (merchant view)
// ==========================================

export async function getPosPlans(includeInactive = false) {
  await ensurePosSchema();
  const plans = await db`
    SELECT * FROM pos_subscription_plans WHERE (${includeInactive} OR is_active = true) ORDER BY sort_order ASC
  `;
  const out = [];
  for (const p of plans) {
    const [rule] = await db`
      SELECT rate_bps FROM pos_fee_rules
      WHERE scope = 'plan' AND plan_key = ${p.plan_key} AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY effective_from DESC LIMIT 1
    `;
    const [global] = rule ? [null] : await db`
      SELECT rate_bps FROM pos_fee_rules WHERE scope = 'global' AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY effective_from DESC LIMIT 1
    `;
    const rateBps = Number(rule?.rate_bps ?? global?.rate_bps ?? 100);
    out.push({
      ...p,
      monthly_price_cents: randToCents(p.monthly_price_rand),
      setup_fee_cents: randToCents(p.setup_fee_rand),
      fee_rate_bps: rateBps,
      // Kept for older clients; derived from the live fee rule.
      transaction_fee_percent: rateBps / 100,
    });
  }
  return out;
}

export async function getMerchantPosSubscription(businessId: string): Promise<DbRow | null> {
  await ensurePosSchema();
  const [sub] = await db`
    SELECT ms.*, p.name AS plan_name, p.monthly_price_rand, p.setup_fee_rand, p.max_tills, p.max_staff, p.features, p.trial_days
    FROM pos_merchant_subscriptions ms
    JOIN pos_subscription_plans p ON ms.plan_key = p.plan_key
    WHERE ms.business_id = ${businessId}
    LIMIT 1
  `;
  if (!sub) return null;
  const rule = await resolveFeeRule(businessId, String(sub.plan_key));
  return { ...sub, fee_rate_bps: rule.exempt ? 0 : rule.rateBps, fee_rule_scope: rule.scope };
}

/** Starts a free trial, only when the plan offers one and the business never had POS. */
export async function startPosTrial(businessId: string, planKey: string, actorUserId: string) {
  await ensurePosSchema();
  const [plan] = await db`SELECT * FROM pos_subscription_plans WHERE plan_key = ${planKey} AND is_active = true`;
  if (!plan) throw new PosError(404, 'PLAN_NOT_FOUND', 'That plan is not available.');
  const days = Number(plan.trial_days ?? 0);
  if (days <= 0) throw new PosError(409, 'NO_TRIAL', 'This plan does not include a free trial.');
  const [row] = await db`
    INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, trial_ends_at, started_at)
    VALUES (${businessId}, ${planKey}, 'trial', NOW() + (${days} || ' days')::interval, NOW())
    ON CONFLICT (business_id) DO NOTHING
    RETURNING *
  `;
  if (!row) throw new PosError(409, 'TRIAL_USED', 'Your business has already used POS, so a new trial is not available.');
  await logPosAudit({ businessId, actorUserId, actorRole: 'owner', action: 'trial_started', targetType: 'plan', targetId: planKey });
  return row;
}

/**
 * Builds the PayFast checkout that activates (or reactivates, or changes) a
 * POS plan. Nothing is activated here — the browser is sent to PayFast, and
 * the ITN does the rest.
 */
export async function startPosActivationCheckout(p: { session: CheckoutSession; businessId: string; planKey: string }) {
  await ensurePosSchema();
  if (typeof p.planKey !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(p.planKey)) throw new PosError(400, 'BAD_PLAN', 'Choose a plan.');
  const [plan] = await db`SELECT * FROM pos_subscription_plans WHERE plan_key = ${p.planKey} AND is_active = true`;
  if (!plan) throw new PosError(404, 'PLAN_NOT_FOUND', 'That plan is not available.');
  const [sub] = await db`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${p.businessId}`;

  if (sub && sub.status === 'active' && sub.plan_key === p.planKey && !sub.cancel_at_period_end) {
    throw new PosError(409, 'ALREADY_ACTIVE', `You are already on ${plan.name}.`);
  }

  const setupFeeCents = sub?.setup_fee_paid ? 0 : randToCents(plan.setup_fee_rand);
  const monthlyCents = randToCents(plan.monthly_price_rand);
  if (monthlyCents <= 0) throw new PosError(409, 'PLAN_NOT_PRICED', 'This plan has no monthly price set. Contact support.');
  const firstChargeCents = setupFeeCents + monthlyCents;

  const result = await createPayfastCheckout({
    session: p.session,
    amount: firstChargeCents / 100,
    description: setupFeeCents > 0
      ? `VerifiedBizLink POS ${plan.name} — setup fee ${formatZar(setupFeeCents)} + first month`
      : `VerifiedBizLink POS ${plan.name} — monthly`,
    purchaseType: `${POS_PURCHASE_PREFIX}${p.planKey}`,
    customStr1: p.businessId,
    customStr4: p.planKey,
    customInt1: setupFeeCents,
    recurringAmount: monthlyCents / 100,
    returnPath: '/business/pos/fees',
  });
  if (!result.ok) throw new PosError(result.status, 'CHECKOUT_FAILED', result.error);

  await db`
    INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, pending_plan_key)
    VALUES (${p.businessId}, ${p.planKey}, 'inactive', ${p.planKey})
    ON CONFLICT (business_id) DO UPDATE SET pending_plan_key = EXCLUDED.pending_plan_key, updated_at = NOW()
  `;
  await logPosAudit({
    businessId: p.businessId, actorUserId: p.session.id, actorRole: 'owner', action: 'activation_checkout_started',
    targetType: 'plan', targetId: p.planKey, detail: { firstChargeCents, setupFeeCents, monthlyCents, paymentRef: result.paymentRef },
  });
  return { ...result, firstChargeCents, setupFeeCents, monthlyCents };
}

export interface PosSubscriptionCharge {
  userId: string;
  businessId: string | null;
  planKey: string;
  paidCents: number;
  token: string | null;
  pfReference: string;
  isRenewal: boolean;
  /** The server-created checkout row's amount (first charge), in cents. */
  checkoutAmountCents: number | null;
  setupFeeCents: number;
}

/**
 * Applies a validated PayFast charge for a POS plan. Called only from the
 * ITN handler after signature + server validation. Idempotent on the PayFast
 * payment id: a re-delivered notification changes nothing.
 */
export async function applyPosSubscriptionCharge(c: PosSubscriptionCharge): Promise<{ ok: boolean; duplicate?: boolean; reason?: string; businessId?: string }> {
  await ensurePosSchema();

  // Whose subscription is this? The business named on the checkout, owned by
  // the paying user — or, for a renewal, the business holding this token.
  let businessId: string | null = null;
  if (c.businessId && isUuid(c.businessId)) {
    const [owned] = await db`SELECT id FROM businesses WHERE id = ${c.businessId} AND user_id = ${c.userId}`;
    if (owned) businessId = String(owned.id);
  }
  if (!businessId && c.token) {
    const [byToken] = await db`SELECT business_id FROM pos_merchant_subscriptions WHERE payfast_token = ${c.token}`;
    if (byToken) businessId = String(byToken.business_id);
  }
  if (!businessId) return { ok: false, reason: 'no business owned by the payer matches this POS charge' };

  const [plan] = await db`SELECT * FROM pos_subscription_plans WHERE plan_key = ${c.planKey}`;
  if (!plan) return { ok: false, reason: `unknown POS plan "${c.planKey}"`, businessId };
  const [sub] = await db`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${businessId}`;

  const setupCents = c.isRenewal ? 0 : Math.max(0, Math.trunc(c.setupFeeCents || 0));
  let requiredCents: number;
  if (c.isRenewal) {
    requiredCents = Number(sub?.recurring_amount_cents ?? randToCents(plan.monthly_price_rand));
  } else {
    if (c.checkoutAmountCents === null) return { ok: false, reason: 'no server-side checkout record for this first charge', businessId };
    // Held to the checkout amount AND to today's plan price, so a checkout
    // row created any other way can never buy POS for less.
    const planMinimum = randToCents(plan.monthly_price_rand) + (sub?.setup_fee_paid ? 0 : randToCents(plan.setup_fee_rand));
    requiredCents = Math.max(c.checkoutAmountCents, planMinimum);
    if (setupCents > 0 && setupCents > c.checkoutAmountCents) return { ok: false, reason: 'setup fee larger than the checkout', businessId };
  }
  if (c.paidCents + 1 < requiredCents) {
    return { ok: false, reason: `paid ${formatZar(c.paidCents)} but ${formatZar(requiredCents)} was required`, businessId };
  }

  const replacedToken = sub?.payfast_token && c.token && sub.payfast_token !== c.token ? String(sub.payfast_token) : null;
  const subscriptionCents = c.paidCents - setupCents;
  const nextBilling = nextBillingDate(new Date(), 1);

  const applied = await withTransaction(async (tx) => {
    const [charge] = await tx`
      INSERT INTO pos_billing_charges (business_id, kind, amount_cents, payment_reference, plan_key, period_start, period_end)
      VALUES (${businessId}, 'subscription', ${subscriptionCents}, ${c.pfReference}, ${c.planKey}, NOW(), ${nextBilling.toISOString()})
      ON CONFLICT (kind, payment_reference) DO NOTHING
      RETURNING id
    `;
    if (!charge) return false;
    if (setupCents > 0) {
      await tx`
        INSERT INTO pos_billing_charges (business_id, kind, amount_cents, payment_reference, plan_key)
        VALUES (${businessId}, 'setup_fee', ${setupCents}, ${c.pfReference}, ${c.planKey})
        ON CONFLICT (kind, payment_reference) DO NOTHING
      `;
    }
    await tx`
      INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, started_at)
      VALUES (${businessId}, ${c.planKey}, 'active', NOW())
      ON CONFLICT (business_id) DO NOTHING
    `;
    await tx`
      UPDATE pos_merchant_subscriptions SET
        plan_key = ${c.planKey},
        status = 'active',
        payfast_token = COALESCE(${c.token}, payfast_token),
        recurring_amount_cents = CASE WHEN ${c.isRenewal} THEN COALESCE(recurring_amount_cents, ${subscriptionCents}) ELSE ${subscriptionCents} END,
        setup_fee_paid = setup_fee_paid OR ${setupCents > 0},
        setup_fee_paid_at = CASE WHEN ${setupCents > 0} THEN COALESCE(setup_fee_paid_at, NOW()) ELSE setup_fee_paid_at END,
        activated_at = COALESCE(activated_at, NOW()),
        renews_at = ${nextBilling.toISOString()},
        payment_failed_at = NULL,
        suspended_at = NULL,
        suspended_reason = NULL,
        cancel_at_period_end = false,
        cancelled_at = NULL,
        pending_plan_key = NULL,
        last_payment_reference = ${c.pfReference},
        updated_at = NOW()
      WHERE business_id = ${businessId}
    `;
    await logPosAudit({
      businessId, actorUserId: c.userId, actorRole: 'payfast', action: c.isRenewal ? 'subscription_renewed' : 'subscription_activated',
      targetType: 'plan', targetId: c.planKey, detail: { paidCents: c.paidCents, setupCents, pfReference: c.pfReference },
    }, tx);
    return true;
  });

  if (!applied) return { ok: true, duplicate: true, businessId };

  if (replacedToken) {
    const cancelled = await cancelPayfastSubscription(replacedToken);
    await logBillingEvent({
      event: cancelled.ok ? 'old_subscription_cancelled' : 'old_subscription_cancel_failed',
      severity: cancelled.ok ? 'info' : 'critical',
      businessId,
      userId: c.userId,
      reference: replacedToken,
      detail: cancelled.ok
        ? `Old POS PayFast subscription ${replacedToken} cancelled after the merchant moved to ${c.planKey}.`
        : `POS plan changed to ${c.planKey} on subscription ${c.token}, but old subscription ${replacedToken} could NOT be cancelled automatically (HTTP ${cancelled.status}: ${cancelled.detail}). Cancel it in the PayFast dashboard or they may be billed twice.`,
      alertAdmins: !cancelled.ok,
      alertTitle: 'Cancel an old POS PayFast subscription by hand',
    });
  }

  await notifyOwner(
    businessId,
    'pos_subscription',
    c.isRenewal ? 'POS subscription renewed' : 'VerifiedBizLink POS is active',
    c.isRenewal
      ? `${formatZar(c.paidCents)} received for ${plan.name}. Next billing ${nextBilling.toLocaleDateString('en-ZA')}.`
      : `${formatZar(c.paidCents)} received${setupCents ? ` (including the ${formatZar(setupCents)} setup fee)` : ''}. Your till is ready.`,
  );
  return { ok: true, businessId };
}

/** A POS subscription charge failed at PayFast: open the grace window. */
export async function markPosRenewalFailed(p: { token: string | null; businessId: string | null; reference: string }) {
  await ensurePosSchema();
  const rows = await db`
    UPDATE pos_merchant_subscriptions
    SET status = CASE WHEN status IN ('active', 'grace') THEN 'grace' ELSE status END,
        payment_failed_at = COALESCE(payment_failed_at, NOW()),
        updated_at = NOW()
    WHERE (${p.token}::text IS NOT NULL AND payfast_token = ${p.token})
       OR (${p.token}::text IS NULL AND business_id = ${p.businessId}::uuid)
    RETURNING business_id
  `;
  for (const r of rows) {
    await notifyOwner(String(r.business_id), 'pos_payment_failed', 'POS payment failed',
      `PayFast could not collect your POS subscription. Your till stays open for ${GRACE_PERIOD_HOURS / 24} days — update your payment from Payments & Fees.`);
  }
  return rows.length;
}

/** PayFast reported the subscription cancelled (e.g. from the PayFast side). */
export async function markPosSubscriptionCancelledAtProvider(token: string) {
  await ensurePosSchema();
  await db`
    UPDATE pos_merchant_subscriptions SET cancel_at_period_end = true, cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW()
    WHERE payfast_token = ${token}
  `;
}

/**
 * Merchant cancels. The PayFast subscription is cancelled first; only if
 * PayFast confirms do we record it. Access continues to the end of the paid
 * month, then the till goes read-only. Nothing is deleted.
 */
export async function cancelPosSubscription(businessId: string, actorUserId: string) {
  await ensurePosSchema();
  const [sub] = await db`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${businessId}`;
  if (!sub || !['active', 'grace'].includes(sub.status)) throw new PosError(409, 'NOT_ACTIVE', 'There is no active POS subscription to cancel.');
  if (sub.cancel_at_period_end) throw new PosError(409, 'ALREADY_CANCELLED', 'Your subscription is already set to end.');
  if (sub.payfast_token) {
    const res = await cancelPayfastSubscription(String(sub.payfast_token));
    if (!res.ok) {
      await logBillingEvent({
        event: 'old_subscription_cancel_failed', severity: 'critical', businessId, userId: actorUserId,
        reference: String(sub.payfast_token),
        detail: `Merchant asked to cancel POS, but PayFast did not confirm cancelling ${sub.payfast_token} (HTTP ${res.status}: ${res.detail}).`,
        alertAdmins: true, alertTitle: 'POS cancellation needs a person',
      });
      throw new PosError(502, 'CANCEL_FAILED', 'PayFast did not confirm the cancellation. Nothing was changed — please try again, or contact support.');
    }
  }
  const [row] = await db`
    UPDATE pos_merchant_subscriptions SET cancel_at_period_end = true, cancelled_at = NOW(), updated_at = NOW()
    WHERE business_id = ${businessId} RETURNING *
  `;
  await logPosAudit({ businessId, actorUserId, actorRole: 'owner', action: 'subscription_cancelled', targetType: 'subscription', targetId: String(row.id) });
  return row;
}

// ==========================================
// Fee statements
// ==========================================

class NothingToBill extends Error {}

function monthStart(d: Date): string {
  const sa = new Date(d.toLocaleString('en-US', { timeZone: SA_TZ }));
  return `${sa.getFullYear()}-${String(sa.getMonth() + 1).padStart(2, '0')}-01`;
}

export function previousMonthStart(now: Date = new Date()): string {
  const [y, m] = monthStart(now).split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, '0')}-01`;
}

/**
 * Bills a merchant's unbilled fees up to the end of the month starting
 * `periodStart` (YYYY-MM-01, SA time). Includes any earlier fee that was
 * never billed, subtracts fee reversals from refunds and any unused credit.
 * Returns null if there was nothing to bill; idempotent per period.
 */
export async function generateFeeStatement(businessId: string, periodStart: string) {
  await ensurePosSchema();
  if (!/^\d{4}-\d{2}-01$/.test(periodStart)) throw new PosError(400, 'BAD_PERIOD', 'Period must be the first of a month.');
  try {
    return await withTransaction(async (tx) => {
      const [{ end_ts, period_end }] = await tx`
        SELECT ((${periodStart}::date + INTERVAL '1 month')::timestamp AT TIME ZONE ${SA_TZ}) AS end_ts,
               ((${periodStart}::date + INTERVAL '1 month' - INTERVAL '1 day')::date)::text AS period_end
      `;
      const [stmt] = await tx`
        INSERT INTO pos_fee_statements (business_id, statement_number, period_start, period_end, status)
        VALUES (${businessId}, ${`pending-${businessId}-${periodStart}`}, ${periodStart}::date, ${period_end}::date, 'open')
        ON CONFLICT (business_id, period_start) DO NOTHING
        RETURNING id
      `;
      if (!stmt) {
        const [existing] = await tx`SELECT * FROM pos_fee_statements WHERE business_id = ${businessId} AND period_start = ${periodStart}::date`;
        return existing;
      }

      const sales = await tx`
        UPDATE pos_sales SET fee_statement_id = ${stmt.id}, fee_status = 'billed'
        WHERE business_id = ${businessId} AND fee_statement_id IS NULL AND platform_fee_cents > 0 AND fee_status = 'accrued'
          AND completed_at IS NOT NULL AND completed_at < ${end_ts}
        RETURNING total_cents, platform_fee_cents
      `;
      const refunds = await tx`
        UPDATE pos_refunds SET fee_statement_id = ${stmt.id}
        WHERE business_id = ${businessId} AND fee_statement_id IS NULL AND fee_reversal_cents > 0 AND created_at < ${end_ts}
        RETURNING fee_reversal_cents
      `;
      // Earlier credits (negative) and too-small balances (positive) roll in once.
      const rolled = await tx`
        UPDATE pos_fee_statements SET carried_to = ${stmt.id}
        WHERE business_id = ${businessId} AND status IN ('credit', 'carried') AND carried_to IS NULL AND id <> ${stmt.id}
        RETURNING net_due_cents
      `;
      const accrued = sales.reduce((a, s) => a + Number(s.platform_fee_cents), 0);
      const eligible = sales.reduce((a, s) => a + Number(s.total_cents), 0);
      const reversals = refunds.reduce((a, r) => a + Number(r.fee_reversal_cents), 0);
      const carried = rolled.reduce((a, c) => a + Number(c.net_due_cents), 0);
      if (accrued === 0 && reversals === 0 && carried === 0) throw new NothingToBill();

      const net = accrued - reversals + carried;
      // PayFast cannot collect less than R5, so a smaller balance waits for the next statement.
      const status = net >= POS_MIN_COLLECTION_CENTS ? 'open' : net > 0 ? 'carried' : net === 0 ? 'zero' : 'credit';
      const [{ last_number }] = await tx`
        INSERT INTO pos_counters (business_id, kind, last_number) VALUES (${businessId}, 'fee_statement', 1)
        ON CONFLICT (business_id, kind) DO UPDATE SET last_number = pos_counters.last_number + 1
        RETURNING last_number
      `;
      const number = `FS-${periodStart.slice(0, 7).replace('-', '')}-${businessId.slice(0, 6).toUpperCase()}-${last_number}`;
      const [final] = await tx`
        UPDATE pos_fee_statements SET
          statement_number = ${number}, sales_count = ${sales.length}, eligible_sales_cents = ${eligible},
          fees_accrued_cents = ${accrued}, fee_reversals_cents = ${reversals}, carried_forward_cents = ${carried},
          net_due_cents = ${net}, status = ${status},
          due_at = CASE WHEN ${status} = 'open' THEN NOW() + (${POS_STATEMENT_DUE_DAYS} || ' days')::interval ELSE NULL END
        WHERE id = ${stmt.id}
        RETURNING *
      `;
      return final;
    });
  } catch (err) {
    if (err instanceof NothingToBill) return null;
    throw err;
  }
}

/** Generates last month's statement for every merchant with unbilled fee activity. */
export async function generateDueStatements(now: Date = new Date(), limit = 500) {
  await ensurePosSchema();
  const period = previousMonthStart(now);
  const [{ end_ts }] = await db`SELECT ((${period}::date + INTERVAL '1 month')::timestamp AT TIME ZONE ${SA_TZ}) AS end_ts`;
  const candidates = await db`
    SELECT DISTINCT business_id FROM (
      SELECT business_id FROM pos_sales WHERE fee_statement_id IS NULL AND platform_fee_cents > 0 AND fee_status = 'accrued' AND completed_at < ${end_ts}
      UNION
      SELECT business_id FROM pos_refunds WHERE fee_statement_id IS NULL AND fee_reversal_cents > 0 AND created_at < ${end_ts}
    ) x
    WHERE NOT EXISTS (SELECT 1 FROM pos_fee_statements f WHERE f.business_id = x.business_id AND f.period_start = ${period}::date)
    LIMIT ${limit}
  `;
  const created: DbRow[] = [];
  for (const c of candidates) {
    const s = await generateFeeStatement(String(c.business_id), period);
    if (s) {
      created.push(s);
      if (s.status === 'open') {
        await notifyOwner(String(c.business_id), 'pos_fee_statement', 'Your VerifiedBizLink fee statement',
          `Statement ${s.statement_number}: ${formatZar(s.net_due_cents)} in transaction fees for ${period.slice(0, 7)}. Due within ${POS_STATEMENT_DUE_DAYS} days — pay from Payments & Fees.`);
      }
    }
  }
  return created;
}

export async function startFeeStatementCheckout(p: { session: CheckoutSession; businessId: string; statementId: string }) {
  await ensurePosSchema();
  if (!isUuid(p.statementId)) throw new PosError(400, 'BAD_STATEMENT', 'Invalid statement.');
  const [s] = await db`SELECT * FROM pos_fee_statements WHERE id = ${p.statementId} AND business_id = ${p.businessId}`;
  if (!s) throw new PosError(404, 'STATEMENT_NOT_FOUND', 'Statement not found.');
  if (s.status !== 'open') throw new PosError(409, 'STATEMENT_NOT_OPEN', `This statement is ${s.status}.`);
  const result = await createPayfastCheckout({
    session: p.session,
    amount: Number(s.net_due_cents) / 100,
    description: `VerifiedBizLink POS fees — statement ${s.statement_number}`,
    purchaseType: POS_FEE_STATEMENT_PURCHASE,
    customStr1: p.businessId,
    customStr4: p.statementId,
    returnPath: '/business/pos/fees',
  });
  if (!result.ok) throw new PosError(result.status, 'CHECKOUT_FAILED', result.error);
  return result;
}

/**
 * Applies a validated PayFast payment against a fee statement. Idempotent:
 * only an 'open' statement can become 'paid'.
 */
export async function applyFeeStatementPayment(p: { userId: string; businessId: string; statementId: string; paidCents: number; pfReference: string }) {
  await ensurePosSchema();
  if (!isUuid(p.businessId) || !isUuid(p.statementId)) return { ok: false, reason: 'malformed statement reference' };
  const [owned] = await db`SELECT id FROM businesses WHERE id = ${p.businessId} AND user_id = ${p.userId}`;
  if (!owned) return { ok: false, reason: 'the payer does not own this business' };
  const [s] = await db`SELECT * FROM pos_fee_statements WHERE id = ${p.statementId} AND business_id = ${p.businessId}`;
  if (!s) return { ok: false, reason: 'statement not found' };
  if (s.status === 'paid') return { ok: true, duplicate: true };
  if (s.status !== 'open') return { ok: false, reason: `statement is ${s.status}` };
  if (p.paidCents + 1 < Number(s.net_due_cents)) return { ok: false, reason: `paid ${formatZar(p.paidCents)} of ${formatZar(s.net_due_cents)}` };

  const applied = await withTransaction(async (tx) => {
    const [paid] = await tx`
      UPDATE pos_fee_statements SET status = 'paid', paid_at = NOW(), payment_reference = ${p.pfReference}
      WHERE id = ${p.statementId} AND business_id = ${p.businessId} AND status = 'open'
      RETURNING *
    `;
    if (!paid) return false;
    await tx`
      INSERT INTO pos_billing_charges (business_id, kind, amount_cents, payment_reference, fee_statement_id, period_start, period_end)
      SELECT ${p.businessId}, 'fee_statement', ${Number(paid.net_due_cents)}, ${p.pfReference}, id, period_start::timestamp AT TIME ZONE 'Africa/Johannesburg', (period_end + 1)::timestamp AT TIME ZONE 'Africa/Johannesburg'
      FROM pos_fee_statements WHERE id = ${p.statementId}
      ON CONFLICT (kind, payment_reference) DO NOTHING
    `;
    // This statement's sales, and those of any small statements carried into it.
    await tx`
      WITH RECURSIVE chain AS (
        SELECT id FROM pos_fee_statements WHERE id = ${p.statementId}
        UNION ALL
        SELECT f.id FROM pos_fee_statements f JOIN chain c ON f.carried_to = c.id WHERE f.status = 'carried'
      )
      UPDATE pos_sales SET fee_status = 'collected'
      WHERE business_id = ${p.businessId} AND fee_statement_id IN (SELECT id FROM chain)
    `;
    await postJournal(tx, feePaymentJournal({
      businessId: p.businessId, statementId: p.statementId, statementNumber: String(paid.statement_number), amountCents: Number(paid.net_due_cents),
    }));
    // Back to good standing if nothing else is overdue and the plan is paid up.
    await tx`
      UPDATE pos_merchant_subscriptions SET status = 'active', payment_failed_at = NULL, suspended_at = NULL, suspended_reason = NULL, updated_at = NOW()
      WHERE business_id = ${p.businessId}
        AND (status = 'grace' OR (status = 'suspended' AND suspended_reason = 'fee_statement_overdue'))
        AND renews_at > NOW() - (${RENEWAL_GRACE_HOURS} || ' hours')::interval
        AND NOT EXISTS (SELECT 1 FROM pos_fee_statements f WHERE f.business_id = ${p.businessId} AND f.status = 'open' AND f.due_at < NOW())
    `;
    return true;
  });
  if (applied) {
    await notifyOwner(p.businessId, 'pos_fee_statement_paid', 'Fee statement paid', `Thank you — ${formatZar(s.net_due_cents)} received for statement ${s.statement_number}.`);
  }
  return { ok: true, duplicate: !applied };
}

// ==========================================
// Lifecycle sweep
// ==========================================

export async function runPosBillingSweep(now: Date = new Date()) {
  await ensurePosSchema();
  const result = { renewalsOverdue: 0, statementsOverdue: 0, suspended: 0, cancelledEnded: 0, statementsCreated: 0, errors: 0 };
  const nowIso = now.toISOString();

  try {
    // 1. Renewal never charged: active, billed by PayFast, past due + settle time.
    const overdue = await db`
      UPDATE pos_merchant_subscriptions
      SET status = 'grace', payment_failed_at = COALESCE(payment_failed_at, ${nowIso}::timestamptz), updated_at = NOW()
      WHERE status = 'active' AND payfast_token IS NOT NULL AND cancel_at_period_end = false
        AND renews_at < ${nowIso}::timestamptz - (${RENEWAL_GRACE_HOURS} || ' hours')::interval
      RETURNING business_id
    `;
    result.renewalsOverdue = overdue.length;
    for (const r of overdue) {
      await notifyOwner(String(r.business_id), 'pos_payment_failed', 'POS renewal not received',
        `Your POS renewal has not come through. Your till stays open for ${GRACE_PERIOD_HOURS / 24} days — reactivate from Payments & Fees.`);
    }

    // 2. Cancelled at period end and the period is over.
    const ended = await db`
      UPDATE pos_merchant_subscriptions SET status = 'cancelled', updated_at = NOW()
      WHERE status IN ('active', 'grace') AND cancel_at_period_end = true AND renews_at <= ${nowIso}::timestamptz
      RETURNING business_id
    `;
    result.cancelledEnded = ended.length;

    // 3. Fee statements past their due date put the account into grace.
    const late = await db`
      UPDATE pos_merchant_subscriptions s
      SET status = 'grace',
          payment_failed_at = COALESCE(s.payment_failed_at, f.oldest_due),
          suspended_reason = 'fee_statement_overdue',
          updated_at = NOW()
      FROM (
        SELECT business_id, MIN(due_at) AS oldest_due FROM pos_fee_statements
        WHERE status = 'open' AND due_at < ${nowIso}::timestamptz GROUP BY business_id
      ) f
      WHERE s.business_id = f.business_id AND s.status = 'active'
      RETURNING s.business_id
    `;
    result.statementsOverdue = late.length;

    // 4. Grace over: read-only (never deleted).
    const suspended = await db`
      UPDATE pos_merchant_subscriptions
      SET status = 'suspended', suspended_at = NOW(), suspended_reason = COALESCE(suspended_reason, 'payment_overdue'), updated_at = NOW()
      WHERE status = 'grace' AND payment_failed_at < ${nowIso}::timestamptz - (${GRACE_PERIOD_HOURS} || ' hours')::interval
      RETURNING business_id
    `;
    result.suspended = suspended.length;
    for (const r of suspended) {
      await notifyOwner(String(r.business_id), 'pos_suspended', 'Your till is read-only',
        'A POS payment is overdue, so new sales are paused. All your records are safe — pay from Payments & Fees to reopen the till.');
    }

    // 5. Month-end fee statements.
    const created = await generateDueStatements(now);
    result.statementsCreated = created.length;
  } catch (err) {
    result.errors += 1;
    console.error('[pos] billing sweep failed:', err);
    await logBillingEvent({
      event: 'payment_unrecorded', severity: 'critical',
      detail: `The POS billing sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      alertAdmins: true, alertTitle: 'POS billing sweep failed',
    });
  }
  return result;
}

// ==========================================
// Merchant fee transparency
// ==========================================

export async function getMerchantFeeSummary(businessId: string) {
  await ensurePosSchema();
  const [sales] = await db`
    SELECT
      COALESCE(SUM(total_cents) FILTER (WHERE completed_at IS NOT NULL), 0) AS gross_sales_cents,
      COALESCE(SUM(refunded_cents), 0) AS refunds_cents,
      COALESCE(SUM(platform_fee_cents) FILTER (WHERE fee_status NOT IN ('not_billable', 'none')), 0) AS fees_accrued_lifetime_cents,
      COALESCE(SUM(fee_reversed_cents), 0) AS fees_reversed_lifetime_cents,
      COALESCE(SUM(platform_fee_cents) FILTER (WHERE fee_statement_id IS NULL AND fee_status = 'accrued'), 0) AS unbilled_fees_cents,
      COALESCE(SUM(provider_fee_cents), 0) AS provider_fees_cents
    FROM pos_sales WHERE business_id = ${businessId}
  `;
  const [unbilledReversals] = await db`
    SELECT COALESCE(SUM(fee_reversal_cents), 0) AS cents FROM pos_refunds WHERE business_id = ${businessId} AND fee_statement_id IS NULL
  `;
  const [stmts] = await db`
    SELECT
      COALESCE(SUM(net_due_cents) FILTER (WHERE status = 'open'), 0) AS outstanding_cents,
      COALESCE(SUM(net_due_cents) FILTER (WHERE status = 'open' AND due_at < NOW()), 0) AS overdue_cents,
      COALESCE(SUM(net_due_cents) FILTER (WHERE status = 'paid'), 0) AS paid_cents,
      COALESCE(SUM(net_due_cents) FILTER (WHERE status = 'waived'), 0) AS waived_cents,
      COALESCE(SUM(-net_due_cents) FILTER (WHERE status = 'credit' AND carried_to IS NULL), 0) AS credit_cents,
      COALESCE(SUM(net_due_cents) FILTER (WHERE status = 'carried' AND carried_to IS NULL), 0) AS carried_cents
    FROM pos_fee_statements WHERE business_id = ${businessId}
  `;
  const [charges] = await db`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'subscription'), 0) AS subscription_paid_cents,
      COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'setup_fee'), 0) AS setup_fee_paid_cents
    FROM pos_billing_charges WHERE business_id = ${businessId}
  `;
  const statements = await db`SELECT * FROM pos_fee_statements WHERE business_id = ${businessId} ORDER BY period_start DESC LIMIT 36`;
  const billingCharges = await db`SELECT * FROM pos_billing_charges WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 100`;
  return {
    grossSalesCents: Number(sales.gross_sales_cents),
    refundsCents: Number(sales.refunds_cents),
    feesAccruedLifetimeCents: Number(sales.fees_accrued_lifetime_cents),
    feesReversedLifetimeCents: Number(sales.fees_reversed_lifetime_cents),
    /** Fees on sales not yet on a statement, less reversals not yet on one. */
    unbilledFeesCents: Number(sales.unbilled_fees_cents) - Number(unbilledReversals.cents),
    outstandingCents: Number(stmts.outstanding_cents),
    overdueCents: Number(stmts.overdue_cents),
    feesCollectedCents: Number(stmts.paid_cents),
    feesWaivedCents: Number(stmts.waived_cents),
    creditCents: Number(stmts.credit_cents),
    /** Owed but under R5, waiting to be added to the next statement. */
    carriedForwardCents: Number(stmts.carried_cents),
    providerFeesCents: Number(sales.provider_fees_cents),
    subscriptionPaidCents: Number(charges.subscription_paid_cents),
    setupFeePaidCents: Number(charges.setup_fee_paid_cents),
    statements,
    billingCharges,
  };
}

export async function getFeeStatementDetail(businessId: string, statementId: string) {
  await ensurePosSchema();
  if (!isUuid(statementId)) return null;
  const [statement] = await db`SELECT * FROM pos_fee_statements WHERE id = ${statementId} AND business_id = ${businessId}`;
  if (!statement) return null;
  const sales = await db`
    SELECT id, receipt_number, completed_at, total_cents, platform_fee_cents, fee_rate_bps, payment_method
    FROM pos_sales WHERE fee_statement_id = ${statementId} AND business_id = ${businessId} ORDER BY completed_at
  `;
  const refunds = await db`
    SELECT r.id, r.created_at, r.amount_cents, r.fee_reversal_cents, s.receipt_number
    FROM pos_refunds r JOIN pos_sales s ON s.id = r.sale_id
    WHERE r.fee_statement_id = ${statementId} AND r.business_id = ${businessId} ORDER BY r.created_at
  `;
  return { statement, sales, refunds };
}
