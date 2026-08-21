import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Every notification type is created without a related_id (see the INSERT
// call sites in connections/, businesses/submit/, payfast/notify/, etc.), so
// the link is derived from `type` alone rather than depending on a column
// that's never actually populated.
const TYPE_LINK: Record<string, string> = {
  connection_accepted: '/network',
  connection_request: '/network',
  payment_success: '/settings?tab=billing',
  vetting_update: '/business/dashboard',
  new_review: '/business/dashboard',
  document_graded: '/business/documents',
};

// GET  /api/notifications        — list unread notifications
// POST /api/notifications/read   — mark all as read (handled by [action] route)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Real schema: title / content / related_id. Alias to the shape the UI
    // expects (message / link).
    const rows = await db`
      SELECT
        id,
        type,
        COALESCE(content, title, '') AS message,
        title,
        read,
        created_at
      FROM notifications
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
      LIMIT 30
    `;
    const notifications = rows.map((row) => ({ ...row, link: TYPE_LINK[row.type] || '/network' }));
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

// DELETE — dismiss a single notification or clear all
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const clearAll = searchParams.get('clearAll') === 'true';

  try {
    if (clearAll) {
      await db`DELETE FROM notifications WHERE user_id = ${session.id}`;
    } else if (id) {
      await db`DELETE FROM notifications WHERE id = ${id} AND user_id = ${session.id}`;
    }
  } catch (error) {
    console.error('Notification delete error:', error);
  }

  return NextResponse.json({ success: true });
}
