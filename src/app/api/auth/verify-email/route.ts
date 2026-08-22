import { NextRequest, NextResponse } from 'next/server';
import { createTrackedSession, sessionCookieOptions, hashOneTimeToken } from '@/lib/auth';
import db from '@/lib/db';
import { sendWelcomeEmail, appUrlFromRequest } from '@/lib/email';

export async function GET(request: NextRequest) {
  const baseUrl = appUrlFromRequest(request);
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(`${baseUrl}/verify-email?error=missing`);
  }

  try {
    const userRows = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verification_token_expires_at
      FROM users
      WHERE email_verification_token = ${hashOneTimeToken(token)}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return NextResponse.redirect(`${baseUrl}/verify-email?error=invalid`);
    }

    const u = userRows[0];
    const now = new Date();
    
    if (u.email_verification_token_expires_at && new Date(u.email_verification_token_expires_at) < now) {
      return NextResponse.redirect(`${baseUrl}/verify-email?error=expired`);
    }

    const rows = await db`
      UPDATE users
      SET email_verified = TRUE,
          email_verified_at = NOW(),
          email_verification_token = NULL,
          email_verification_token_expires_at = NULL,
          updated_at = NOW()
      WHERE id = ${u.id}
      RETURNING id, email, full_name, role, avatar_url, headline
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(`${baseUrl}/verify-email?error=invalid`);
    }

    const verifiedUser = rows[0];

    // Best-effort: sendWelcomeEmail swallows its own errors so a transient
    // SMTP failure can't turn a successful verification into an error page.
    await sendWelcomeEmail(
      verifiedUser.email,
      (verifiedUser.full_name || '').split(' ')[0],
      verifiedUser.role,
      baseUrl
    );

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
    const response = NextResponse.redirect(`${baseUrl}/verify-email?success=1`);
    response.cookies.set('vbl_session', newJwt, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${baseUrl}/verify-email?error=server`);
  }
}
