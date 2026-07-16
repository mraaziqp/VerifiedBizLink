import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// DELETE /api/auth/sessions/[id] — revoke one of this user's own sessions
// (sign that device out). getSession() re-checks revoked_at on every
// request, so the other device is signed out on its very next request.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const updated = await db`
    UPDATE user_sessions SET revoked_at = NOW()
    WHERE id = ${id} AND user_id = ${session.id} AND revoked_at IS NULL
    RETURNING id
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
