import { NextRequest, NextResponse } from 'next/server';
import { createTrackedSession, createMfaChallenge, sessionCookieOptions } from '@/lib/auth';
import { compare } from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Neon's users.password_hash is the ONLY source of truth for
    // credentials — signup, forgot/reset-password, and Settings' change-
    // password form all read/write only this column. A prior version of
    // this route also tried Supabase Auth first, which (for any account
    // that happened to have a matching Supabase Auth record) could let
    // someone log in with a password that Settings would then reject as
    // "incorrect", since Settings only ever checks this column. Removed
    // to keep exactly one password per account.
    const users = await db`
      SELECT id, email, password_hash, full_name, role, avatar_url, headline, email_verified, two_factor_enabled, is_suspended, suspended_reason
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const dbUser = users[0];
    if (!dbUser.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordValid = await compare(password, dbUser.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Suspended accounts are blocked at login, not deleted — moderation
    // needs a reversible action distinct from permanently erasing the
    // account (only DELETE /api/admin/users/[id] does that).
    if (dbUser.is_suspended) {
      return NextResponse.json(
        {
          error: dbUser.suspended_reason
            ? `Your account has been suspended: ${dbUser.suspended_reason}. Contact info@verifiedbizlink.co.za to appeal.`
            : 'Your account has been suspended. Contact info@verifiedbizlink.co.za to appeal.',
        },
        { status: 403 },
      );
    }

    const userId = dbUser.id;
    const twoFactorEnabled = dbUser.two_factor_enabled === true;

    const sessionUser = {
      id: userId,
      email: dbUser.email,
      fullName: dbUser.full_name || '',
      role: dbUser.role || 'customer',
      avatarUrl: dbUser.avatar_url || '',
      headline: dbUser.headline || '',
      emailVerified: dbUser.email_verified === true,
    };

    // Password verified, but 2FA is enabled — hold off on creating a real
    // session until the caller also proves possession of the authenticator
    // via POST /api/auth/login/verify-2fa.
    if (twoFactorEnabled) {
      const challengeToken = await createMfaChallenge(userId);
      return NextResponse.json({ requiresTwoFactor: true, challengeToken });
    }

    const token = await createTrackedSession(sessionUser, request);
    const response = NextResponse.json({ user: sessionUser, success: true });
    response.cookies.set('vbl_session', token, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Login error:', errorMsg);
    return NextResponse.json({ error: 'Internal server error', detail: errorMsg }, { status: 500 });
  }
}
