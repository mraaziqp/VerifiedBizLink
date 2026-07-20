import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session?.sid) {
    await db`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ${session.sid}`.catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  // A cookie set with a `domain` attribute (verifiedbizlink.co.za in
  // production, so the session survives the www<->apex redirect) can only
  // be cleared by a Set-Cookie that repeats that same domain — a host-only
  // deletion cookie is treated by the browser as a DIFFERENT cookie, so the
  // real one never actually gets removed. Logout previously always sent a
  // host-only clear, meaning "sign out" on production may not have signed
  // anyone out at all.
  response.cookies.set('vbl_session', '', { ...sessionCookieOptions(request.headers.get('host')), maxAge: 0 });
  return response;
}
