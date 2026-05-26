import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', request.url));
  }

  try {
    const rows = await db`
      UPDATE users
      SET email_verified = TRUE, email_verification_token = NULL, updated_at = NOW()
      WHERE email_verification_token = ${token}
      RETURNING id, email, full_name, role, avatar_url, headline
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    const u = rows[0];
    const sessionUser = {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      avatarUrl: u.avatar_url || '',
      headline: u.headline || '',
      emailVerified: true,
    };

    const newJwt = await createSession(sessionUser);
    const response = NextResponse.redirect(new URL('/verify-email?success=1', request.url));
    response.cookies.set('vbl_session', newJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/verify-email?error=server', request.url));
  }
}
