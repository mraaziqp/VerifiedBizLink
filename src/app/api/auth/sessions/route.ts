import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/auth/sessions — list this user's active (non-revoked) sessions
// for the real Settings > Security "Active Sessions" list.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`
    SELECT id, user_agent, ip_address, created_at, last_seen_at
    FROM user_sessions
    WHERE user_id = ${session.id} AND revoked_at IS NULL
    ORDER BY last_seen_at DESC
  `;

  const sessions = rows.map((row) => ({ ...row, isCurrent: row.id === session.sid }));
  return NextResponse.json({ sessions });
}
