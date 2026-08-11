/**
 * Subscription and invoicing rules.
 *
 * One module so Finance, the cron, the PayFast webhook and the customer-facing
 * settings screen can never disagree about when someone is billed, what they
 * owe, or when their features come off.
 *
 * Money is in cents throughout, matching payments.amount and invoices.
 * amount_cents. Conversion to rand happens only at display.
 */

/** Hours a failed payment has before premium features are withdrawn. */
export const GRACE_PERIOD_HOURS = 72;

/**
 * Downgrade target. Deliberately a downgrade and never a delete — a lapsed
 * business stays listed with restricted functionality, and is only removed if
 * they explicitly ask.
 */
export const DOWNGRADE_TIER = 'free';

export interface BillingInterval {
  months: number;
  label: string;
  discountPercent: number;
}

/**
 * Fallback ladder, used when the tier_durations table is unreachable. The
 * table is the source of truth so terms can change without a deploy.
 */
export const DEFAULT_INTERVALS: BillingInterval[] = [
  { months: 1, label: 'Monthly', discountPercent: 0 },
  { months: 3, label: '3 months', discountPercent: 5 },
  { months: 6, label: '6 months', discountPercent: 10 },
  { months: 12, label: '12 months', discountPercent: 15 },
];

/**
 * Total charge for a term, in cents.
 *
 * Rounded to the nearest cent, then floored to whole cents, so the displayed
 * price and the amount actually charged can never differ by a rounding step.
 */
export function intervalPriceCents(
  monthlyPriceCents: number,
  months: number,
  discountPercent: number,
): number {
  if (!Number.isFinite(monthlyPriceCents) || monthlyPriceCents <= 0) return 0;
  const gross = monthlyPriceCents * Math.max(1, months);
  const discount = Math.round((gross * Math.max(0, discountPercent)) / 100);
  return Math.max(0, gross - discount);
}

/** Adds whole months without the day-of-month drift naive date maths causes. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Rolling 31 Jan forward a month lands on 3 March in JS; clamp to month end.
  if (d.getDate() < targetDay) d.setDate(0);
  return d;
}

export function nextBillingDate(from: Date, intervalMonths: number): Date {
  return addMonths(from, Math.max(1, intervalMonths));
}

/** When the grace window closes for a payment that failed at `failedAt`. */
export function graceExpiresAt(failedAt: Date): Date {
  return new Date(failedAt.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
}

export function isGraceExpired(failedAt: Date | string | null, now = new Date()): boolean {
  if (!failedAt) return false;
  const at = failedAt instanceof Date ? failedAt : new Date(failedAt);
  if (Number.isNaN(at.getTime())) return false;
  return now >= graceExpiresAt(at);
}

/** Whole hours left in the grace window; 0 once it has closed. */
export function graceHoursRemaining(failedAt: Date | string | null, now = new Date()): number {
  if (!failedAt) return 0;
  const at = failedAt instanceof Date ? failedAt : new Date(failedAt);
  if (Number.isNaN(at.getTime())) return 0;
  const ms = graceExpiresAt(at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}

/**
 * Sequential-ish, human-quotable invoice number: VBL-INV-YYYYMM-XXXXXX.
 * The random tail avoids a race between two concurrent renewals without
 * needing a database sequence.
 */
export function invoiceNumber(now: Date, random: string): string {
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `VBL-INV-${stamp}-${random.slice(0, 6).toUpperCase()}`;
}

export function formatRand(cents: number): string {
  return `R${((Number(cents) || 0) / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The wording Wesley asked for, shown wherever a subscription is confirmed or
 * managed. Kept here so the invoice email, the settings screen and the
 * checkout confirmation are literally the same sentence.
 */
export function subscriptionTerms(amountCents: number, nextBillingAt: Date | string | null): string {
  return (
    `Your subscription continues for ${formatRand(amountCents)} starting ` +
    `${formatDate(nextBillingAt)} until cancelled. To avoid being charged, you must ` +
    `cancel at least one day before each billing date.`
  );
}
