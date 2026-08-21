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

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`
    SELECT email, full_name, email_verified FROM users WHERE id = ${session.id} LIMIT 1
  `;
  if (!rows.length || rows[0].email_verified) {
    return NextResponse.json({ error: 'Already verified or not found' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await db`UPDATE users SET email_verification_token = ${hashOneTimeToken(token)}, email_verification_token_expires_at = ${tokenExpiresAt.toISOString()}, updated_at = NOW() WHERE id = ${session.id}`;

  const baseUrl = appUrlFromRequest(request);
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;
  sendVerificationEmail(rows[0].email, rows[0].full_name, token, baseUrl).catch((err) => {
    console.error('Resend-verification email failed for', rows[0].email, err);
  });

  return NextResponse.json({ success: true, verificationUrl: verifyLink });
}
