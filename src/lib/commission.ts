/**
 * Sales agent commission and gamification rules.
 *
 * Kept in one place so Finance and the agent portal can never disagree about
 * what an agent is owed. Money is handled in cents throughout, because that
 * is how `payments.amount` is stored (see /api/payfast/init, which writes
 * `Math.round(amount * 100)`); converting to rand happens only at display.
 */

/** An agent earns half of the first payment the business they signed up makes. */
export const COMMISSION_RATE = 0.5;

/**
 * Commission on a single first payment, in cents.
 *
 * Rounded down so the platform never over-pays by a fraction of a cent, and
 * so the total of many commissions can never exceed half of total revenue.
 */
export function commissionCents(firstPaymentCents: number): number {
  if (!Number.isFinite(firstPaymentCents) || firstPaymentCents <= 0) return 0;
  return Math.floor(firstPaymentCents * COMMISSION_RATE);
}

export interface Milestone {
  /** Converted (paid) sign-ups required. */
  sales: number;
  name: string;
  /** The real-world reward. Edit these three lines to change the scheme. */
  reward: string;
}

/**
 * The target ladder shown in the portal. These reward strings are the only
 * place the scheme is defined — change them here and the UI follows.
 */
export const MILESTONES: Milestone[] = [
  { sales: 5, name: 'Bronze', reward: 'Free lunch' },
  { sales: 20, name: 'Silver', reward: 'Half-day off' },
  { sales: 25, name: 'Gold', reward: 'Bonus payout' },
];

/** Highest milestone the agent has already reached, or null. */
export function currentMilestone(sales: number): Milestone | null {
  let reached: Milestone | null = null;
  for (const m of MILESTONES) {
    if (sales >= m.sales) reached = m;
  }
  return reached;
}

/** The next milestone still to hit, or null once every target is cleared. */
export function nextMilestone(sales: number): Milestone | null {
  return MILESTONES.find((m) => sales < m.sales) ?? null;
}

/** Progress toward the next milestone as a 0-100 percentage. */
export function progressToNext(sales: number): number {
  const next = nextMilestone(sales);
  if (!next) return 100;
  const previous = currentMilestone(sales)?.sales ?? 0;
  const span = next.sales - previous;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((sales - previous) / span) * 100)));
}

/** Cents -> "R1 234,56"-style string for display. */
export function formatRand(cents: number): string {
  const rand = (Number(cents) || 0) / 100;
  return `R${rand.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
