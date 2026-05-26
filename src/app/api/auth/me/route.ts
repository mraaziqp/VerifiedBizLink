import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Always fetch email_verified from DB so the banner clears immediately
  // even if the JWT was issued before the user verified their email.
  const rows = await db`SELECT email_verified FROM users WHERE id = ${user.id} LIMIT 1`.catch(() => []);
  const emailVerified: boolean = rows[0]?.email_verified ?? user.emailVerified;

  return NextResponse.json({ user: { ...user, emailVerified } });
}
