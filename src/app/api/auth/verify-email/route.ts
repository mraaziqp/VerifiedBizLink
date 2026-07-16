import { NextRequest, NextResponse } from 'next/server';
import { createTrackedSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', request.url));
  }

  try {
    const userRows = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verification_token_expires_at
      FROM users
      WHERE email_verification_token = ${token}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    const u = userRows[0];
    const now = new Date();
    
    if (u.email_verification_token_expires_at && new Date(u.email_verification_token_expires_at) < now) {
      return NextResponse.redirect(new URL('/verify-email?error=expired', request.url));
    }

    const rows = await db`
      UPDATE users
      SET email_verified = TRUE, email_verification_token = NULL, email_verification_token_expires_at = NULL, updated_at = NOW()
      WHERE id = ${u.id}
      RETURNING id, email, full_name, role, avatar_url, headline
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    const verifiedUser = rows[0];
    const sessionUser = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      fullName: verifiedUser.full_name,
      role: verifiedUser.role,
      avatarUrl: '',
      headline: verifiedUser.headline || '',
      emailVerified: true,
    };

    const newJwt = await createTrackedSession(sessionUser, request);
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
