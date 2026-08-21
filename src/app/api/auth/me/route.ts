import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Query the live user record from database so avatar updates and
    // email verification status changes reflect immediately without needing re-login
    const rows = await db`
      SELECT id, email, full_name, role, avatar_url, headline, email_verified, is_suspended
      FROM users
      WHERE id = ${session.id}
      LIMIT 1
    `.catch(() => []);

    if (!rows.length || rows[0].is_suspended) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const u = rows[0];
    const liveUser = {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      avatarUrl: u.avatar_url || '',
      headline: u.headline || '',
      emailVerified: u.email_verified === true,
    };

    return NextResponse.json({ user: liveUser });
  } catch (error) {
    console.error('/api/auth/me error:', error);
    // Fallback to session from cookie if DB is temporarily unreachable
    const session = await getSession();
    return NextResponse.json({ user: session });
  }
}
