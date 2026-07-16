import { NextRequest, NextResponse } from 'next/server';
import { createTrackedSession, verifyMfaChallenge, sessionCookieOptions } from '@/lib/auth';
import { verifyTotpToken, hashBackupCode } from '@/lib/twofactor';
import db from '@/lib/db';

// POST /api/auth/login/verify-2fa — completes a login started by
// /api/auth/login when the account has 2FA enabled. Accepts either a live
// TOTP code or a one-time backup code.
export async function POST(request: NextRequest) {
  try {
    const { challengeToken, code } = await request.json();
    if (!challengeToken || !code) {
      return NextResponse.json({ error: 'challengeToken and code are required' }, { status: 400 });
    }

    const userId = await verifyMfaChallenge(challengeToken);
    if (!userId) {
      return NextResponse.json({ error: 'This login attempt has expired. Please sign in again.' }, { status: 401 });
    }

    const users = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verified,
             two_factor_secret, two_factor_backup_codes
      FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (users.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    const user = users[0];

    const cleanCode = String(code).trim();
    let valid = user.two_factor_secret ? await verifyTotpToken(cleanCode, user.two_factor_secret) : false;

    // Fall back to a one-time backup code if the TOTP code didn't match.
    let remainingBackupCodes: string[] | null = null;
    if (!valid && Array.isArray(user.two_factor_backup_codes)) {
      const hashed = hashBackupCode(cleanCode);
      const idx = user.two_factor_backup_codes.indexOf(hashed);
      if (idx !== -1) {
        valid = true;
        remainingBackupCodes = user.two_factor_backup_codes.filter((_: string, i: number) => i !== idx);
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    if (remainingBackupCodes) {
      await db`UPDATE users SET two_factor_backup_codes = ${JSON.stringify(remainingBackupCodes)} WHERE id = ${userId}`;
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url || '',
      headline: user.headline || '',
      emailVerified: user.email_verified === true,
    };

    const token = await createTrackedSession(sessionUser, request);
    const response = NextResponse.json({ user: sessionUser, success: true });
    response.cookies.set('vbl_session', token, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    console.error('2FA login verification error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
