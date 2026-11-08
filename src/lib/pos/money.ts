/**
 * Integer-cent helpers for the POS. No floating point touches a stored amount.
 */

/** Quantity as integer hundredths (the column is NUMERIC(12,2)). */
export function quantityToHundredths(quantity: number): number {
  return Math.round(quantity * 100);
}

/** unitCents × quantity, rounded half-up to the cent, for fractional (kg/l) quantities. */
export function lineGrossCents(unitCents: number, quantity: number): number {
  const q = quantityToHundredths(quantity);
  return Math.floor((unitCents * q + 50) / 100);
}

/**
 * VAT already included in a VAT-inclusive amount: amount × r / (1 + r),
 * rounded half-up. 15% of R115.00 inclusive -> R15.00.
 */
export function vatInclusiveCents(amountCents: number, rateBps: number): number {
  if (amountCents <= 0 || rateBps <= 0) return 0;
  const denom = 10000 + rateBps;
  return Math.floor((amountCents * rateBps * 2 + denom) / (denom * 2));
}

/** A share of an amount for `part` out of `whole` units, half-up, exact at the ends. */
export function proportionalCents(amountCents: number, part: number, whole: number): number {
  if (whole <= 0 || part <= 0) return 0;
  if (part >= whole) return amountCents;
  const p = quantityToHundredths(part);
  const w = quantityToHundredths(whole);
  return Math.floor((amountCents * p * 2 + w) / (w * 2));
}

export function percentToBps(percent: number | string | null | undefined): number {
  const n = Number(percent);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function randToCents(rand: number | string | null | undefined): number {
  const n = Number(rand);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatZar(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0) / 100;
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
