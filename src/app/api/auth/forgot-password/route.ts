import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, we've sent a password reset link.",
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Single round trip: set the token only if the email matches, and get
    // back who (if anyone) it belongs to in the same query.
    const users = await db`
      UPDATE users
      SET password_reset_token = ${token}, password_reset_expires = ${expires.toISOString()}
      WHERE LOWER(email) = ${normalizedEmail}
      RETURNING id, email, full_name
    `;

    // Always return the same response whether or not the account exists —
    // otherwise this endpoint becomes a way to enumerate registered emails.
    if (users.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const user = users[0];

    try {
      await sendPasswordResetEmail(user.email, user.full_name || 'there', token);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json({ error: 'Could not send reset email. Please try again shortly.' }, { status: 502 });
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
