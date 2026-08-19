import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import db from '@/lib/db';
import { isStaffRole } from '@/lib/roles';

/**
 * Signing key for session tokens, resolved on first use.
 *
 * This used to throw at import time. Next.js imports every route module while
 * collecting page data during `next build`, so that turned a missing runtime
 * secret into a hard build failure ("Failed to collect page data for
 * /api/admin/ads-toggle") on any platform where the build environment lacks
 * secrets. Deferring the check keeps the guarantee that matters — no token is
 * ever signed or verified with a missing key — while letting the app build
 * from a clean checkout.
 */
let cachedJwtSecret: Uint8Array | null = null;

function jwtSecret(): Uint8Array {
  if (!cachedJwtSecret) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is not set. Set it in .env.local or your deployment environment.',
      );
    }
    cachedJwtSecret = new TextEncoder().encode(secret);
  }
  return cachedJwtSecret;
}

// One-time tokens (password reset, email verification) are high-entropy
// random values, like API keys — a fast one-way hash is the standard,
// appropriate protection here (unlike passwords, which need a slow,
// salted hash to resist brute force over low-entropy human input). The
// raw token only ever exists in the email link; the DB stores this hash.
export function hashOneTimeToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

const COOKIE_NAME = 'vbl_session';

/**
 * Cookie options for the session cookie. Pass the request host so the cookie
 * is scoped to the apex domain (e.g. `.verifiedbizlink.co.za`) — this keeps
 * the session valid across both `www.` and the apex, so the www↔non-www
 * redirect doesn't drop authentication (which broke uploads/POSTs).
 * For localhost / *.vercel.app previews the domain is left unset (host-only).
 */
export function sessionCookieOptions(host?: string | null) {
  let domain: string | undefined;
  const h = (host || '').split(':')[0].toLowerCase();
  if (h.endsWith('verifiedbizlink.co.za')) {
    domain = '.verifiedbizlink.co.za';
  }
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string;
  headline: string;
  emailVerified: boolean;
  sid?: string;
}

/**
 * Largest avatar value allowed into a session token.
 *
 * The token is returned as a Set-Cookie header, and gateways reject oversized
 * response headers — CloudFront in front of the deployment answers 502. One
 * account had a 22KB base64 data URL in avatar_url (the fallback used when a
 * Supabase upload fails), which made every login for that user fail while
 * everyone else, holding a ~128-byte https URL, signed in fine.
 *
 * A hosted URL is well under this; a data: URL never is. Dropping it costs
 * only the avatar in the session payload — the real value stays in the
 * database and any page that needs it can read it from there.
 */
const MAX_SESSION_AVATAR_CHARS = 512;

function sessionSafeAvatar(avatarUrl: string | undefined): string {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('data:')) return '';
  return avatarUrl.length > MAX_SESSION_AVATAR_CHARS ? '' : avatarUrl;
}

export async function createSession(user: SessionUser, sid?: string): Promise<string> {
  const token = await new SignJWT({ ...user, avatarUrl: sessionSafeAvatar(user.avatarUrl), sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret());
  return token;
}

// Registers a row in user_sessions (for the real Settings > Security "active
// sessions" list and remote sign-out) and embeds its id in the JWT as `sid`.
// Tokens issued before this existed have no `sid` — getSession() below treats
// that as "not tracked" rather than "invalid", so already-logged-in users
// aren't signed out by this change.
export async function createTrackedSession(user: SessionUser, request: Request | NextRequest): Promise<string> {
  const userAgent = request.headers.get('user-agent') || '';
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '';
  const [row] = await db`
    INSERT INTO user_sessions (user_id, user_agent, ip_address)
    VALUES (${user.id}, ${userAgent}, ${ip})
    RETURNING id
  `;
  return createSession(user, row.id);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user) return null;

  if (user.sid) {
    const [row] = await db`SELECT revoked_at FROM user_sessions WHERE id = ${user.sid}`;
    if (!row || row.revoked_at) return null; // session was remotely signed out or the row was cleaned up
    db`
      UPDATE user_sessions SET last_seen_at = NOW()
      WHERE id = ${user.sid} AND last_seen_at < NOW() - INTERVAL '60 seconds'
    `.catch(() => {}); // best-effort; never block a request on this
  }

  return user;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// True for every role allowed into the admin area — use in all admin API
// routes. The list lives in lib/roles so this and middleware.ts can never
// disagree about who counts as staff. Note `sales_agent` is NOT staff.
export function isStaff(session: SessionUser | null): boolean {
  return !!session && isStaffRole(session.role);
}

// Short-lived token for the gap between "password verified" and "TOTP code
// verified" during a 2FA login — deliberately NOT a full session (no `sid`,
// 5-minute expiry, distinct `purpose` claim) so it can't be replayed as a
// real session cookie even if intercepted.
export async function createMfaChallenge(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: 'mfa-challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(jwtSecret());
}

export async function verifyMfaChallenge(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (payload.purpose !== 'mfa-challenge' || typeof payload.userId !== 'string') return null;
    return payload.userId;
  } catch {
    return null;
  }
}
