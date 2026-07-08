import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { cookies } from 'next/headers';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Set it in .env.local or your deployment environment.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

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
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
  return token;
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
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

// True for admin, banker, and lawyer roles — use in all admin API routes
export function isStaff(session: SessionUser | null): boolean {
  return !!session && ['admin', 'banker', 'lawyer'].includes(session.role);
}
