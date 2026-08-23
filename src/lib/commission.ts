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

export interface QualifyingSale {
  /** The payment commission is earned on, in cents. */
  amountCents: number;
  /** When it was actually paid — determines which week it counts toward. */
  paidAt: string | Date | null;
}

export interface SaleCommission extends QualifyingSale {
  weekKey: string;
  /** Sales in that same week, which sets the tier. */
  weekSaleCount: number;
  rate: number;
  ratePercent: number;
  tierName: string;
  commissionCents: number;
}

export interface AgentCommissionResult {
  perSale: SaleCommission[];
  totalCommissionCents: number;
  /** Week key -> how many qualifying sales landed in it. */
  weeklyCounts: Record<string, number>;
}

/**
 * Applies the official weekly tiered acquisition policy to an agent's sales.
 *
 * The tier is decided PER WEEK, by how many qualifying sales landed in that
 * week — not by the current week's count. Rating everything at this week's
 * tier would retroactively re-price months of history every time an agent has
 * a good week, so a payout run could differ from the one before it without a
 * single new sale.
 *
 * A negotiated per-agent rate, when set, replaces the tier entirely — that is
 * what "negotiated" means, and it keeps an individual agreement predictable.
 */
export function calculateAgentCommission(
  sales: QualifyingSale[],
  overrideRate?: number | null,
): AgentCommissionResult {
  const qualifying = sales.filter((s) => (Number(s.amountCents) || 0) > 0 && s.paidAt);

  const weeklyCounts: Record<string, number> = {};
  for (const sale of qualifying) {
    const key = weekKeyOf(sale.paidAt as string | Date);
    weeklyCounts[key] = (weeklyCounts[key] || 0) + 1;
  }

  const hasOverride =
    overrideRate !== null && overrideRate !== undefined && Number.isFinite(Number(overrideRate));

  const perSale = qualifying.map((sale) => {
    const weekKey = weekKeyOf(sale.paidAt as string | Date);
    const weekSaleCount = weeklyCounts[weekKey] || 0;
    const tier = getWeeklyTierRate(weekSaleCount);
    const rate = hasOverride ? Number(overrideRate) : tier.rate;
    return {
      ...sale,
      weekKey,
      weekSaleCount,
      rate,
      ratePercent: Math.round(rate * 100),
      tierName: hasOverride ? 'Negotiated rate' : tier.tierName,
      commissionCents: commissionCents(Number(sale.amountCents) || 0, rate),
    };
  });

  return {
    perSale,
    totalCommissionCents: perSale.reduce((sum, s) => sum + s.commissionCents, 0),
    weeklyCounts,
  };
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
