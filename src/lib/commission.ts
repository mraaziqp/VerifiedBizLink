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
