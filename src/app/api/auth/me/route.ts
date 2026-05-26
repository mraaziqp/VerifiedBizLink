import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Always fetch live fields from DB — avatar_url can be a large base64 blob
  // that doesn't fit in the JWT cookie, and email_verified may update post-issuance.
  const rows = await db`SELECT email_verified, avatar_url FROM users WHERE id = ${user.id} LIMIT 1`.catch(() => []);
  const emailVerified: boolean = rows[0]?.email_verified ?? user.emailVerified;
  const avatarUrl: string = rows[0]?.avatar_url ?? user.avatarUrl ?? '';

  return NextResponse.json({ user: { ...user, emailVerified, avatarUrl } });
}
