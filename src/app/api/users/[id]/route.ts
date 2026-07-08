import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/users/[id] — minimal public profile info, used to open a new
// conversation with someone before any messages exist between you yet.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const users = await db`
    SELECT id, full_name, avatar_url, role FROM users WHERE id = ${id} LIMIT 1
  `;

  if (users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const u = users[0];
  return NextResponse.json({
    user: {
      id: u.id,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      role: u.role,
    },
  });
}
