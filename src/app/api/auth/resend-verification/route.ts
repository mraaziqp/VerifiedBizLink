import { NextResponse } from 'next/server';
import { getSession, hashOneTimeToken } from '@/lib/auth';
import { sendVerificationEmail, appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`resend-verify:${ip}`, 3, 300);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // ---------- Authenticated path (logged-in user resends) ----------
  const session = await getSession();

  // ---------- Unauthenticated path (email in body, for expired-link page) ----------
  if (!session) {
    try {
      const body = await request.json().catch(() => ({}));
      const email = (body.email || '').toLowerCase().trim();
      if (!email) {
        return NextResponse.json({ error: 'Please log in or provide your email address' }, { status: 401 });
      }

      const rows = await db`
        SELECT id, email, full_name, email_verified FROM users WHERE LOWER(email) = ${email} LIMIT 1
      `;
      if (!rows.length) {
        // Don't reveal whether the email exists — always return success
        return NextResponse.json({ success: true, message: 'If that email is registered, a verification link has been sent.' });
      }
      if (rows[0].email_verified) {
        return NextResponse.json({ success: true, message: 'Your email is already verified. You can log in.' });
      }

      const token = crypto.randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db`
        UPDATE users
        SET email_verification_token = ${hashOneTimeToken(token)},
            email_verification_token_expires_at = ${tokenExpiresAt.toISOString()},
            updated_at = NOW()
        WHERE id = ${rows[0].id}
      `;

      const baseUrl = appUrlFromRequest(request);
      sendVerificationEmail(rows[0].email, rows[0].full_name, token, baseUrl).catch((err) => {
        console.error('Resend-verification (unauthenticated) email failed for', rows[0].email, err);
      });

      return NextResponse.json({ success: true, message: 'If that email is registered, a verification link has been sent.' });
    } catch {
      return NextResponse.json({ error: 'Could not process request' }, { status: 500 });
    }
  }

  // ---------- Authenticated path continues ----------
  const rows = await db`
    SELECT email, full_name, email_verified FROM users WHERE id = ${session.id} LIMIT 1
  `;
  if (!rows.length || rows[0].email_verified) {
    return NextResponse.json({ error: 'Already verified or not found' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await db`
    UPDATE users
    SET email_verification_token = ${hashOneTimeToken(token)},
        email_verification_token_expires_at = ${tokenExpiresAt.toISOString()},
        updated_at = NOW()
    WHERE id = ${session.id}
  `;

  const baseUrl = appUrlFromRequest(request);
  sendVerificationEmail(rows[0].email, rows[0].full_name, token, baseUrl).catch((err) => {
    console.error('Resend-verification email failed for', rows[0].email, err);
  });

  // Only expose the instant verification URL in non-production environments
  const isDev = process.env.NODE_ENV !== 'production';
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

  return NextResponse.json({
    success: true,
    ...(isDev ? { verificationUrl: verifyLink } : {}),
  });
}
