import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

/**
 * Where the bell sends someone, by notification type.
 *
 * This is the only place a destination is decided — the table has no `link`
 * column. Nine inserts across the app were written as if it did, and because
 * every one of them is wrapped in .catch() they failed in silence: advisors
 * were never told a clawback had been decided, admins never heard about
 * reported issues or reversed payments, and nobody noticed. Any new
 * notification type must be added here, or it lands on /network.
 */
const TYPE_LINK: Record<string, string> = {
  connection_accepted: '/network',
  connection_request: '/network',
  payment_success: '/settings?tab=billing',
  vetting_update: '/business/dashboard',
  new_review: '/business/dashboard',
  document_graded: '/business/documents',

  // Advisor programme
  agent_issue: '/admin/agent-issues',
  agent_issue_update: '/agent',
  clawback_review: '/admin/agents',
  clawback_decision: '/agent',
  referral_applied: '/agent',
  payment_reversed: '/admin/payments',
  subscription_ended: '/settings/billing',

  // Verified Talent
  job_application: '/business/jobs',
  application_update: '/jobs/applications',
};

// GET  /api/notifications — list unread notifications safely
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ notifications: [] });

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
    `.catch(() => []);

    const notifications = rows.map((row) => ({ ...row, link: TYPE_LINK[row.type] || '/network' }));
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ notifications: [] });
  }
}

// PATCH — mark a single notification (or all) as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ success: false });

    const { id, markAll } = await request.json().catch(() => ({}));

    if (markAll) {
      await db`UPDATE notifications SET read = TRUE WHERE user_id = ${session.id}`.catch(() => {});
    } else if (id) {
      await db`UPDATE notifications SET read = TRUE WHERE id = ${id} AND user_id = ${session.id}`.catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ success: false });
  }
}

// DELETE — dismiss a single notification or clear all
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ success: false });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await db`DELETE FROM notifications WHERE user_id = ${session.id}`.catch(() => {});
    } else if (id) {
      await db`DELETE FROM notifications WHERE id = ${id} AND user_id = ${session.id}`.catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json({ success: false });
  }
}
