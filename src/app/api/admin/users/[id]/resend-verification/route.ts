import { NextResponse } from 'next/server';
import { getSession, isStaff, hashOneTimeToken } from '@/lib/auth';
import { sendVerificationEmail, appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';

// POST /api/admin/users/[id]/resend-verification — lets staff trigger a
// fresh verification email for any user, not just the user themselves.
// The self-serve /api/auth/resend-verification requires the target's own
// session, which breaks down the moment a client's session has expired or
// they're on a different device — this is the support-desk equivalent for
// when a client calls in saying "I never got the email."
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const rows = await db`
    SELECT email, full_name, email_verified FROM users WHERE id = ${id} LIMIT 1
  `;
  if (!rows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (rows[0].email_verified) {
    return NextResponse.json({ error: 'This user is already verified' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db`
    UPDATE users SET email_verification_token = ${hashOneTimeToken(token)}, email_verification_token_expires_at = ${tokenExpiresAt.toISOString()}, updated_at = NOW()
    WHERE id = ${id}
  `;

  try {
    await sendVerificationEmail(rows[0].email, rows[0].full_name, token, appUrlFromRequest(request));
  } catch (err) {
    console.error('Admin-triggered resend failed for', rows[0].email, err);
    return NextResponse.json(
      { error: 'Could not send the email — Postmark may be unreachable. Use "Verify Now" to unblock this user directly instead.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
