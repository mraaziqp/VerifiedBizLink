/**
 * VERIFIEDBIZLINK
 * Business Advisor Commission & Incentive Policy (Version 1.0)
 *
 * Implements the official commission policy:
 * 1. Weekly Tiered Acquisition Commission (applied to qualifying new paying businesses per week):
 *    - 1 – 10 businesses/week: 20%
 *    - 11 – 15 businesses/week: 30%
 *    - 16 – 20 businesses/week: 40%
 *    - 21+ businesses/week: 50%
 *
 * 2. Monthly Retention Commission:
 *    - 5% recurring retention commission on each monthly subscription payment received
 *    - Payable for up to 12 consecutive months from the customer's first successful subscription payment
 */

export interface WeeklyTier {
  minSales: number;
  maxSales: number | null;
  rate: number;
  percent: number;
  tierName: string;
  example: string;
}

/** Official Weekly Acquisition Tiers */
export const OFFICIAL_WEEKLY_TIERS: WeeklyTier[] = [
  { minSales: 1, maxSales: 10, rate: 0.20, percent: 20, tierName: 'Tier 1 (1–10/wk)', example: '20% commission' },
  { minSales: 11, maxSales: 15, rate: 0.30, percent: 30, tierName: 'Tier 2 (11–15/wk)', example: '30% commission' },
  { minSales: 16, maxSales: 20, rate: 0.40, percent: 40, tierName: 'Tier 3 (16–20/wk)', example: '40% commission' },
  { minSales: 21, maxSales: null, rate: 0.50, percent: 50, tierName: 'Tier 4 (21+/wk)', example: '50% commission' },
];

/** Monthly recurring retention rate */
export const MONTHLY_RETENTION_RATE = 0.05; // 5%
export const RETENTION_MAX_MONTHS = 12; // 12 months max

/** Default base commission rate fallback */
export const DEFAULT_COMMISSION_RATE = 0.20;

/**
 * Determine weekly tier commission rate based on qualifying new paying businesses secured in the week.
 */
export function getWeeklyTierRate(weeklySalesCount: number): { rate: number; percent: number; tierName: string } {
  if (weeklySalesCount >= 21) return { rate: 0.50, percent: 50, tierName: 'Tier 4 (21+/wk)' };
  if (weeklySalesCount >= 16) return { rate: 0.40, percent: 40, tierName: 'Tier 3 (16–20/wk)' };
  if (weeklySalesCount >= 11) return { rate: 0.30, percent: 30, tierName: 'Tier 2 (11–15/wk)' };
  if (weeklySalesCount >= 1) return { rate: 0.20, percent: 20, tierName: 'Tier 1 (1–10/wk)' };
  return { rate: 0.20, percent: 20, tierName: 'Base Tier (20%)' };
}

/**
 * Commission on a qualifying payment, in cents.
 */
export function commissionCents(
  paymentCents: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (!Number.isFinite(paymentCents) || paymentCents <= 0) return 0;
  const safeRate = Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_COMMISSION_RATE;
  return Math.floor(paymentCents * safeRate);
}

/**
 * Calculate retention commission (5% for up to 12 months)
 */
export function calculateRetentionCommission(monthlyPaymentCents: number, activeMonths: number = 1): number {
  if (!Number.isFinite(monthlyPaymentCents) || monthlyPaymentCents <= 0) return 0;
  const eligibleMonths = Math.min(Math.max(1, activeMonths), RETENTION_MAX_MONTHS);
  return Math.floor(monthlyPaymentCents * MONTHLY_RETENTION_RATE * eligibleMonths);
}

/**
 * Monday-start week key (e.g. "2026-W34") for a payment date.
 *
 * The acquisition tier is a WEEKLY measure, so every calculation has to agree
 * on where a week begins. Monday-start matches how the sales week is run.
 */
export function weekKeyOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  if (Number.isNaN(d.getTime())) return 'invalid';
  d.setHours(0, 0, 0, 0);
  // Shift to the Monday of this week.
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * One payment that may earn commission.
 *
 * `qualifies` carries policy §5: a subscription qualifies only when the
 * business registered successfully, any required verification is complete,
 * the payment was actually received, and it is not reversed, refunded or
 * under investigation. Non-qualifying payments are kept rather than filtered
 * out so the dashboard can show WHY something earned nothing.
 */
export interface QualifyingSale {
  amountCents: number;
  /** When the money was received — decides which commission week it counts in. */
  paidAt: string | Date | null;
  qualifies: boolean;
  /** Human-readable reason when it does not qualify. */
  disqualifiedReason?: string | null;
}

export interface WeekCommission {
  weekKey: string;
  saleCount: number;
  /** Policy §6: the tier applies to the week's TOTAL qualifying value. */
  qualifyingValueCents: number;
  rate: number;
  ratePercent: number;
  tierName: string;
  commissionCents: number;
}

export interface AgentCommissionResult {
  weeks: WeekCommission[];
  acquisitionCommissionCents: number;
  qualifyingSales: number;
  excludedSales: number;
  weeklyCounts: Record<string, number>;
}

/**
 * Weekly tiered acquisition commission, per the official policy.
 *
 * Policy §6: "the Advisor's qualifying new paying businesses are counted...
 * The applicable percentage is applied to the TOTAL value of qualifying new
 * subscription payments received during that week."
 *
 * So the rate is applied once to the week's total, not to each payment
 * separately. Rounding each payment down individually would shave a cent per
 * sale off the Advisor — on the policy's own Example 2 (14 sales, R18,000)
 * the total must be exactly R5,400, and only sum-then-apply guarantees that.
 *
 * The tier is decided PER WEEK by that week's volume. Pricing everything at
 * the current week's tier would retroactively re-value months of history
 * every time an Advisor had a good week.
 *
 * A negotiated per-agent rate replaces the tier entirely.
 */
export function calculateAgentCommission(
  sales: QualifyingSale[],
  overrideRate?: number | null,
): AgentCommissionResult {
  const qualifying = sales.filter((s) => s.qualifies && (Number(s.amountCents) || 0) > 0 && s.paidAt);

  const buckets = new Map<string, { count: number; valueCents: number }>();
  for (const sale of qualifying) {
    const key = weekKeyOf(sale.paidAt as string | Date);
    const b = buckets.get(key) ?? { count: 0, valueCents: 0 };
    b.count += 1;
    b.valueCents += Number(sale.amountCents) || 0;
    buckets.set(key, b);
  }

  const hasOverride =
    overrideRate !== null && overrideRate !== undefined && Number.isFinite(Number(overrideRate));

  const weeks: WeekCommission[] = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([weekKey, b]) => {
      const tier = getWeeklyTierRate(b.count);
      const rate = hasOverride ? Number(overrideRate) : tier.rate;
      return {
        weekKey,
        saleCount: b.count,
        qualifyingValueCents: b.valueCents,
        rate,
        ratePercent: Math.round(rate * 100),
        tierName: hasOverride ? 'Negotiated rate' : tier.tierName,
        // Applied to the week's total — policy §6.
        commissionCents: commissionCents(b.valueCents, rate),
      };
    });

  const weeklyCounts: Record<string, number> = {};
  for (const [k, b] of buckets) weeklyCounts[k] = b.count;

  return {
    weeks,
    acquisitionCommissionCents: weeks.reduce((sum, w) => sum + w.commissionCents, 0),
    qualifyingSales: qualifying.length,
    excludedSales: sales.length - qualifying.length,
    weeklyCounts,
  };
}

export interface RetentionPayment {
  amountCents: number;
  paidAt: string | Date;
  /** The customer's first successful subscription payment — starts the clock. */
  firstPaymentAt: string | Date;
}

/**
 * Monthly retention commission, per policy §8 and §9.
 *
 * 5% of each monthly subscription payment ACTUALLY received, for at most 12
 * consecutive months from the customer's first successful payment. It is
 * therefore computed from real payments rather than projected from the first
 * one: §9 ends it the moment payments cease, so a projection would keep
 * paying an Advisor for a customer who has already stopped.
 *
 * The first payment itself is excluded — that one earns acquisition
 * commission under §4, and paying both on the same payment would double-count.
 */
export function calculateRetentionFromPayments(payments: RetentionPayment[]): {
  totalCents: number;
  eligiblePayments: number;
} {
  let totalCents = 0;
  let eligiblePayments = 0;

  for (const p of payments) {
    const paid = new Date(p.paidAt);
    const first = new Date(p.firstPaymentAt);
    if (Number.isNaN(paid.getTime()) || Number.isNaN(first.getTime())) continue;
    if (paid <= first) continue; // the acquisition payment, not a retention one

    const cutoff = new Date(first.getTime());
    cutoff.setMonth(cutoff.getMonth() + RETENTION_MAX_MONTHS);
    if (paid > cutoff) continue; // past the 12-month window

    const amount = Number(p.amountCents) || 0;
    if (amount <= 0) continue;

    totalCents += Math.floor(amount * MONTHLY_RETENTION_RATE);
    eligiblePayments += 1;
  }

  return { totalCents, eligiblePayments };
}

export interface Milestone {
  sales: number;
  name: string;
  reward: string;
  rateBoost?: string;
}

/** Gamified performance milestones aligned with official policy */
export const DEFAULT_MILESTONES: Milestone[] = [
  { sales: 10, name: 'Bronze Advisor (10 Sales)', reward: 'Tier 1 Mastery · 20% Base Rate', rateBoost: '20%' },
  { sales: 15, name: 'Silver Advisor (15 Sales)', reward: 'Tier 2 Achieved · 30% Weekly Rate', rateBoost: '30%' },
  { sales: 20, name: 'Gold Advisor (20 Sales)', reward: 'Tier 3 Achieved · 40% Weekly Rate', rateBoost: '40%' },
  { sales: 25, name: 'Platinum Executive (21+ Sales)', reward: 'Top Tier 4 · 50% Top Weekly Commission Rate', rateBoost: '50%' },
];

/** Highest milestone reached */
export function currentMilestone(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): Milestone | null {
  let reached: Milestone | null = null;
  for (const m of ladder) {
    if (sales >= m.sales) reached = m;
  }
  return reached;
}

/** Next milestone */
export function nextMilestone(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): Milestone | null {
  return ladder.find((m) => sales < m.sales) ?? null;
}

/** Progress percentage (0-100) */
export function progressToNext(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): number {
  const next = nextMilestone(sales, ladder);
  if (!next) return 100;
  const previous = currentMilestone(sales, ladder)?.sales ?? 0;
  const span = next.sales - previous;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((sales - previous) / span) * 100)));
}

/** Cents -> "R1 234,56" string formatting */
export function formatRand(cents: number): string {
  const rand = (Number(cents) || 0) / 100;
  return `R${rand.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
