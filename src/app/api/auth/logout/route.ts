import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST() {
  const session = await getSession();
  if (session?.sid) {
    await db`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ${session.sid}`.catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('vbl_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return response;
}
