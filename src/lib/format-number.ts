/**
 * Number formatting that is identical on the server and in every browser.
 *
 * `toLocaleString('en-ZA')` looks harmless but depends on the ICU data each
 * runtime ships: Node (CLDR 48) prints 1234.5 as "1 234,50" while Chromium
 * prints "1,234.50". A server-rendered amount therefore changed on
 * hydration — React error #418, a full client re-render, and a price that
 * visibly flipped format. This never consults locale data.
 */
export function formatNumber(value: number | string | null | undefined, decimals = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** R1,234.50 — from rands. */
export function formatRandAmount(rands: number | string | null | undefined, decimals = 2): string {
  const s = formatNumber(rands, decimals);
  return s.startsWith('-') ? `-R${s.slice(1)}` : `R${s}`;
}

/** R1,234.50 — from cents. */
export function formatRandCents(cents: number | string | null | undefined, decimals = 2): string {
  return formatRandAmount((Number(cents) || 0) / 100, decimals);
}
