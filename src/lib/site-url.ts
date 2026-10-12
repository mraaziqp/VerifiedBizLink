/**
 * The address the site is actually served from.
 *
 * The bare domain only forwards its home page; a deep link on it never reaches
 * the app. Anything that leaves the site — a share link, a link preview, an
 * email — must therefore carry the www host, whatever the caller was given.
 *
 * Dependency-free on purpose: middleware, server routes and client components
 * all read these, and they must agree.
 */

export const BARE_HOST = 'verifiedbizlink.co.za';
export const CANONICAL_ORIGIN = 'https://www.verifiedbizlink.co.za';

/** An origin with the bare domain swapped for www. Other hosts (localhost, previews) pass through. */
export function canonicalOrigin(origin: string | null | undefined): string {
  try {
    const url = new URL(origin || CANONICAL_ORIGIN);
    if (url.hostname === BARE_HOST) url.hostname = new URL(CANONICAL_ORIGIN).hostname;
    return url.origin;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

/**
 * A same-site path it is safe to send someone to after signing in, or null.
 *
 * `?from=` arrives in a link anyone can craft. Accepting it as written lets
 * "/login?from=https://evil.example" — or the scheme-relative "//evil.example"
 * — turn our own sign-in page into the first step of a phishing redirect.
 */
export function safeReturnPath(from: string | null | undefined): string | null {
  if (!from || !from.startsWith('/')) return null;
  // "//host" and "/\host" are both read by browsers as another site.
  if (from.startsWith('//') || from.startsWith('/\\')) return null;
  // Browsers drop tabs and newlines from a URL before reading it, so
  // "/<tab>/host" is "//host" by the time it is followed.
  for (let i = 0; i < from.length; i += 1) {
    if (from.charCodeAt(i) < 32) return null;
  }
  return from;
}
