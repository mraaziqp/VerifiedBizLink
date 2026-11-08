import db, { type Sql } from '@/lib/db';

/**
 * The VerifiedBizLink platform fee.
 *
 * One pure function decides the fee for an amount under a rule; one resolver
 * decides which rule applies to a merchant at a moment in time. Nothing else
 * in the codebase computes a fee — the checkout, refunds, statements and every
 * report read the result this produces and the rate it snapshots on the sale.
 *
 * Rates are basis points (100 bps = 1%). Money is integer cents.
 */

export interface FeeRule {
  id: string | null;
  scope: 'global' | 'plan' | 'merchant' | 'fallback';
  rateBps: number;
  fixedCents: number;
  minFeeCents: number | null;
  maxFeeCents: number | null;
  exempt: boolean;
}

export interface FeeResult {
  feeCents: number;
  rateBps: number;
  ruleId: string | null;
  scope: FeeRule['scope'];
}

/** Used only if the fee_rules table is empty — matches the launch default. */
export const FALLBACK_FEE_RULE: FeeRule = {
  id: null,
  scope: 'fallback',
  rateBps: 100,
  fixedCents: 0,
  minFeeCents: null,
  maxFeeCents: null,
  exempt: false,
};

/**
 * Percentage of an integer amount, rounded half-up to the cent.
 *
 * Integer arithmetic only: amount * bps is exact, and adding 5000 before the
 * division by 10 000 rounds .5 upwards. R0.50 at 1% is 0.5c -> 1c; R0.49 at
 * 1% is 0.49c -> 0c.
 */
export function percentOfCents(amountCents: number, rateBps: number): number {
  if (!Number.isInteger(amountCents) || !Number.isInteger(rateBps)) {
    throw new Error('percentOfCents needs integer cents and integer basis points');
  }
  if (amountCents <= 0 || rateBps <= 0) return 0;
  return Math.floor((amountCents * rateBps + 5000) / 10000);
}

export function calculatePlatformFee(eligibleAmountCents: number, rule: FeeRule): FeeResult {
  const base = { rateBps: rule.exempt ? 0 : rule.rateBps, ruleId: rule.id, scope: rule.scope };
  if (rule.exempt || eligibleAmountCents <= 0) return { ...base, feeCents: 0 };

  let fee = percentOfCents(eligibleAmountCents, rule.rateBps) + rule.fixedCents;
  if (rule.minFeeCents !== null) fee = Math.max(fee, rule.minFeeCents);
  if (rule.maxFeeCents !== null) fee = Math.min(fee, rule.maxFeeCents);
  // Never more than the sale itself.
  fee = Math.min(fee, eligibleAmountCents);
  return { ...base, feeCents: Math.max(0, fee) };
}

/**
 * Fee to give back when part of a sale is refunded: proportional to the
 * refunded share of the sale, never more than the fee still unreversed.
 * A full refund (cumulative refunded == total) returns exactly the remainder,
 * so rounding can never leave a stray cent of fee on a fully refunded sale.
 */
export function feeReversalFor(params: {
  saleTotalCents: number;
  saleFeeCents: number;
  alreadyRefundedCents: number;
  alreadyReversedFeeCents: number;
  refundCents: number;
}): number {
  const { saleTotalCents, saleFeeCents, alreadyRefundedCents, alreadyReversedFeeCents, refundCents } = params;
  const remainingFee = saleFeeCents - alreadyReversedFeeCents;
  if (remainingFee <= 0 || refundCents <= 0 || saleTotalCents <= 0) return 0;
  if (alreadyRefundedCents + refundCents >= saleTotalCents) return remainingFee;
  // Cumulative method: what the fee on everything refunded so far should be,
  // minus what has already been reversed. Avoids drift across many partials.
  const cumulative = Math.floor(
    (saleFeeCents * (alreadyRefundedCents + refundCents) * 2 + saleTotalCents) / (saleTotalCents * 2),
  );
  return Math.max(0, Math.min(remainingFee, cumulative - alreadyReversedFeeCents));
}

function rowToRule(row: Record<string, unknown>): FeeRule {
  return {
    id: String(row.id),
    scope: row.scope as FeeRule['scope'],
    rateBps: Number(row.rate_bps),
    fixedCents: Number(row.fixed_cents ?? 0),
    minFeeCents: row.min_fee_cents === null || row.min_fee_cents === undefined ? null : Number(row.min_fee_cents),
    maxFeeCents: row.max_fee_cents === null || row.max_fee_cents === undefined ? null : Number(row.max_fee_cents),
    exempt: Boolean(row.exempt),
  };
}

/**
 * The rule in force for a merchant at `at`: their own negotiated rule if one
 * is active, else their plan's, else the platform default.
 */
export async function resolveFeeRule(
  businessId: string,
  planKey: string | null,
  at: Date = new Date(),
  sql: Sql = db,
): Promise<FeeRule> {
  const iso = at.toISOString();
  const rows = await sql`
    SELECT *, CASE scope WHEN 'merchant' THEN 1 WHEN 'plan' THEN 2 ELSE 3 END AS priority
    FROM pos_fee_rules
    WHERE effective_from <= ${iso}::timestamptz
      AND (effective_to IS NULL OR effective_to > ${iso}::timestamptz)
      AND (
        (scope = 'merchant' AND business_id = ${businessId})
        OR (scope = 'plan' AND plan_key = ${planKey})
        OR scope = 'global'
      )
    ORDER BY priority ASC, effective_from DESC
    LIMIT 1
  `;
  return rows[0] ? rowToRule(rows[0]) : FALLBACK_FEE_RULE;
}

export interface NewFeeRuleInput {
  scope: 'global' | 'plan' | 'merchant';
  planKey?: string | null;
  businessId?: string | null;
  rateBps: number;
  fixedCents?: number;
  minFeeCents?: number | null;
  maxFeeCents?: number | null;
  exempt?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  reason: string;
  createdBy: string;
}

export function validateFeeRuleInput(input: NewFeeRuleInput): string | null {
  if (!['global', 'plan', 'merchant'].includes(input.scope)) return 'Invalid scope';
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0 || input.rateBps > 10000) return 'Rate must be 0–10000 basis points';
  if (input.scope === 'plan' && !input.planKey) return 'A plan rule needs a plan';
  if (input.scope === 'merchant' && !input.businessId) return 'A merchant rule needs a business';
  for (const [k, v] of Object.entries({ fixedCents: input.fixedCents, minFeeCents: input.minFeeCents, maxFeeCents: input.maxFeeCents })) {
    if (v !== undefined && v !== null && (!Number.isInteger(v) || v < 0)) return `${k} must be a non-negative whole number of cents`;
  }
  if (input.minFeeCents != null && input.maxFeeCents != null && input.minFeeCents > input.maxFeeCents) return 'Minimum fee exceeds the cap';
  if (!input.reason || input.reason.trim().length < 3) return 'A reason is required';
  return null;
}

/**
 * Adds a rule effective from `effectiveFrom` (default now) and closes the
 * previous open rule for the same scope/target at that moment. Past sales
 * keep the rate they were snapshotted with; nothing historic is edited.
 */
export async function createFeeRule(tx: Sql, input: NewFeeRuleInput) {
  const err = validateFeeRuleInput(input);
  if (err) throw new Error(err);
  const from = (input.effectiveFrom ?? new Date()).toISOString();
  const planKey = input.scope === 'plan' ? input.planKey : null;
  const businessId = input.scope === 'merchant' ? input.businessId : null;

  await tx`
    UPDATE pos_fee_rules
    SET effective_to = ${from}::timestamptz
    WHERE scope = ${input.scope}
      AND plan_key IS NOT DISTINCT FROM ${planKey}
      AND business_id IS NOT DISTINCT FROM ${businessId}
      AND effective_from <= ${from}::timestamptz
      AND (effective_to IS NULL OR effective_to > ${from}::timestamptz)
  `;
  const [rule] = await tx`
    INSERT INTO pos_fee_rules (
      scope, plan_key, business_id, rate_bps, fixed_cents, min_fee_cents, max_fee_cents,
      exempt, effective_from, effective_to, reason, created_by
    ) VALUES (
      ${input.scope}, ${planKey}, ${businessId}, ${input.rateBps}, ${input.fixedCents ?? 0},
      ${input.minFeeCents ?? null}, ${input.maxFeeCents ?? null}, ${Boolean(input.exempt)},
      ${from}::timestamptz, ${input.effectiveTo ? input.effectiveTo.toISOString() : null}, ${input.reason.trim()}, ${input.createdBy}
    )
    RETURNING *
  `;
  return rule;
}
