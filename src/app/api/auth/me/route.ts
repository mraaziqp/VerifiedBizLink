import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieOptions } from '@/lib/auth';
import db from '@/lib/db';

/**
 * A 401 that also deletes the cookie.
 *
 * Middleware only checks the JWT signature; getSession also requires the
 * session row to exist and not be revoked. A cookie from a signed-out or
 * cleaned-up session therefore passes middleware but fails here — and nothing
 * ever removed it, so the browser stayed stuck: every page let through, every
 * page finding no user, the home page rendering a "Guest User" view to someone
 * who is not signed in. Clearing it here means the very next navigation has no
 * cookie and middleware sends them to /login.
 *
 * The domain must match the one the cookie was set with, or the browser treats
 * the deletion as a different cookie and keeps the real one.
 */
function unauthorised(request: NextRequest) {
  const response = NextResponse.json({ user: null }, { status: 401 });
  if (request.cookies.get('vbl_session')?.value) {
    response.cookies.set('vbl_session', '', {
      ...sessionCookieOptions(request.headers.get('host')),
      maxAge: 0,
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorised(request);
    }

    // Query the live user record from database so avatar updates and
    // email verification status changes reflect immediately without needing re-login
    const rows = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verified, is_suspended
      FROM users
      WHERE id = ${session.id}
      LIMIT 1
    `.catch(() => []);

    if (!rows.length || rows[0].is_suspended) {
      return unauthorised(request);
    }

    const u = rows[0];
    const liveUser = {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      avatarUrl: u.avatar_url || '',
      headline: u.headline || '',
      emailVerified: u.email_verified === true,
    };

    return NextResponse.json({ user: liveUser });
  } catch (error) {
    console.error('/api/auth/me error:', error);
    // Fallback to session from cookie if DB is temporarily unreachable
    const session = await getSession();
    return NextResponse.json({ user: session });
  }
}
