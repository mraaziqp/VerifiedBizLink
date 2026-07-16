import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/auth/2fa/status
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`SELECT two_factor_enabled FROM users WHERE id = ${session.id}`;
  return NextResponse.json({ enabled: rows[0]?.two_factor_enabled === true });
}
