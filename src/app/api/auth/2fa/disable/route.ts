import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// POST /api/auth/2fa/disable — requires the current password so a hijacked,
// already-open browser tab can't silently turn off 2FA on its own.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'password is required' }, { status: 400 });

  const rows = await db`SELECT password_hash FROM users WHERE id = ${session.id}`;
  if (!rows.length || !(await compare(password, rows[0].password_hash))) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  await db`
    UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = NULL
    WHERE id = ${session.id}
  `;

  return NextResponse.json({ success: true });
}
