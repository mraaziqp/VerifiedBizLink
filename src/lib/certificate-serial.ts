/**
 * Certificate serial parsing, shared by the browser and the server.
 *
 * Kept free of any database or Node import: the public /verify form runs this
 * in the browser, and it used to import it from db/queries, which dragged the
 * whole Drizzle/Neon client into the page bundle.
 */

/** Canonical form: VBL-2026-K7QM-4XPD */
export const SERIAL_PATTERN = /^VBL-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Allows dashes, spaces or nothing between the blocks, so a serial read off
// paper and typed as "vbl 2026 k7qm 4xpd" still matches.
const EMBEDDED = /VBL[\s-]*(\d{4})[\s-]*([A-Z0-9]{4})[\s-]*([A-Z0-9]{4})(?![A-Z0-9])/i;

/**
 * Pulls a serial out of whatever someone pasted — the bare serial in any case,
 * with or without dashes, or the full verify URL from a QR code.
 */
export function extractSerial(input: string): string | null {
  const text = String(input ?? '').trim();
  if (!text) return null;

  let candidate = text;
  try {
    // A pasted QR link: take the last path segment, decoded.
    const url = new URL(text);
    const last = url.pathname.split('/').filter(Boolean).pop();
    if (last) candidate = decodeURIComponent(last);
  } catch {
    // Not a URL — use the text as typed.
  }

  const m = candidate.match(EMBEDDED);
  if (m) return `VBL-${m[1]}-${m[2].toUpperCase()}-${m[3].toUpperCase()}`;

  const bare = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const b = bare.match(/^VBL(\d{4})([A-Z0-9]{4})([A-Z0-9]{4})$/);
  return b ? `VBL-${b[1]}-${b[2]}-${b[3]}` : null;
}

/** Live input mask for the lookup field: VBL-YYYY-XXXX-XXXX as you type. */
export function formatSerialInput(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
  const parts = [raw.slice(0, 3), raw.slice(3, 7), raw.slice(7, 11), raw.slice(11, 15)];
  return parts.filter(Boolean).join('-');
}
