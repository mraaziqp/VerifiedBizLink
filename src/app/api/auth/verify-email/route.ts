import { NextRequest, NextResponse } from 'next/server';
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
      RETURNING id, email
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    return NextResponse.redirect(new URL('/verify-email?success=1', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/verify-email?error=server', request.url));
  }
}
