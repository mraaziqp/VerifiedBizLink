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

    // Query standard users (they use full_name as identifier)
    const users = await db`
      SELECT full_name FROM users WHERE LOWER(email) = ${normalizedEmail}
    `;

    // Query admin users (they have a specific username column)
    const admins = await db`
      SELECT username FROM admin_users WHERE LOWER(email) = ${normalizedEmail}
    `.catch(() => []); // Avoid failure if table is missing

    const usernames: string[] = [];
    if (users.length > 0) {
      usernames.push(...users.map(u => u.full_name || 'VBL User'));
    }
    if (admins.length > 0) {
      usernames.push(...admins.map(a => a.username));
    }

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
