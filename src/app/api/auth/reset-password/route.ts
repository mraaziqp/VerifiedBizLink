import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createTrackedSession, sessionCookieOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const users = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verified
      FROM users
      WHERE password_reset_token = ${token} AND password_reset_expires > NOW()
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
    }

    const user = users[0];
    const passwordHash = await hash(password, 12);

    await db`
      UPDATE users
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url || '',
      headline: user.headline || '',
      emailVerified: user.email_verified === true,
    };

    const jwt = await createTrackedSession(sessionUser, request);
    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('vbl_session', jwt, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
