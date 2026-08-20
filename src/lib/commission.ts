/**
 * Sales agent commission and gamification rules.
 *
 * Kept in one place so Finance and the agent portal can never disagree about
 * what an agent is owed. Money is handled in cents throughout, because that
 * is how `payments.amount` is stored (see /api/payfast/init, which writes
 * `Math.round(amount * 100)`); converting to rand happens only at display.
 */

/**
 * Fallback rate, used only when settings cannot be read.
 *
 * The live rate is editable in Admin > Sales Agents and stored in
 * platform_settings; an individual agent can also carry a negotiated
 * override. Nothing should read this constant to decide a payout — take the
 * rate from settings and pass it in, so a rate change reaches every screen at
 * once instead of some of them.
 */
export const DEFAULT_COMMISSION_RATE = 0.5;

/**
 * Commission on a qualifying payment, in cents.
 *
 * The rate is an explicit argument rather than a module constant so a caller
 * cannot silently assume 50% after the business has agreed something else.
 * Rounded down, so many small commissions can never sum to more than the
 * agreed share of revenue.
 */
export function commissionCents(
  paymentCents: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (!Number.isFinite(paymentCents) || paymentCents <= 0) return 0;
  const safeRate = Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_COMMISSION_RATE;
  return Math.floor(paymentCents * safeRate);
}

export interface Milestone {
  /** Converted (paid) sign-ups required. */
  sales: number;
  name: string;
  /** The real-world reward. Edit these three lines to change the scheme. */
  reward: string;
}

/**
 * Fallback ladder, used only if settings cannot be read. The live ladder is
 * editable in Admin > Sales Agents; these functions all take the ladder as an
 * argument so a screen can never render targets that differ from the ones
 * being paid against.
 */
export const DEFAULT_MILESTONES: Milestone[] = [
  { sales: 5, name: 'Bronze', reward: 'Free lunch' },
  { sales: 20, name: 'Silver', reward: 'Half-day off' },
  { sales: 25, name: 'Gold', reward: 'Bonus payout' },
];

/** Highest milestone the agent has already reached, or null. */
export function currentMilestone(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): Milestone | null {
  let reached: Milestone | null = null;
  for (const m of ladder) {
    if (sales >= m.sales) reached = m;
  }
  return reached;
}

/** The next milestone still to hit, or null once every target is cleared. */
export function nextMilestone(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): Milestone | null {
  return ladder.find((m) => sales < m.sales) ?? null;
}

/** Progress toward the next milestone as a 0-100 percentage. */
export function progressToNext(sales: number, ladder: Milestone[] = DEFAULT_MILESTONES): number {
  const next = nextMilestone(sales, ladder);
  if (!next) return 100;
  const previous = currentMilestone(sales, ladder)?.sales ?? 0;
  const span = next.sales - previous;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((sales - previous) / span) * 100)));
}

/** Cents -> "R1 234,56"-style string for display. */
export function formatRand(cents: number): string {
  const rand = (Number(cents) || 0) / 100;
  return `R${rand.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
