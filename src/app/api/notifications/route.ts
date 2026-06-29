import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET  /api/notifications        — list unread notifications
// POST /api/notifications/read   — mark all as read (handled by [action] route)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const notifications = await db`
      SELECT id, type, message, read, link, created_at
      FROM notifications
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ notifications: [] });
  }
}

// PATCH — mark a single notification (or all) as read
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, markAll } = await request.json().catch(() => ({}));

  try {
    if (markAll) {
      await db`UPDATE notifications SET read = TRUE WHERE user_id = ${session.id}`;
    } else if (id) {
      await db`UPDATE notifications SET read = TRUE WHERE id = ${id} AND user_id = ${session.id}`;
    }
  } catch (error) {
    console.error('Notification update error:', error);
  }

  return NextResponse.json({ success: true });
}
