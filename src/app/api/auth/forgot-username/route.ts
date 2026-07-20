import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendUsernameRecoveryEmail } from '@/lib/email';

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists with this email address, we have sent your username.",
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const users = await db`
      SELECT full_name FROM users WHERE LOWER(email) = ${normalizedEmail}
    `;

    const usernames: string[] = users.map(u => u.full_name || 'VBL User');

    if (usernames.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    try {
      await sendUsernameRecoveryEmail(normalizedEmail, usernames);
    } catch (emailError) {
      console.error('Failed to send username recovery email:', emailError);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Forgot username error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
