import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];
const ACTIONS = ['warning', 'strike', 'ban', 'unban', 'unverify', 'verify'] as const;
type Action = (typeof ACTIONS)[number];

/**
 * POST /api/admin/users/[id]/moderate — warnings, strikes, bans, and
 * verification overrides, all recorded to one append-only trail so a
 * user's history survives later status changes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!isStaff(session) || !session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { action, reason } = (await request.json()) as { action?: Action; reason?: string };

    if (!action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if ((action === 'ban' || action === 'strike' || action === 'warning') && !reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required for this action' }, { status: 400 });
    }

    const target = await db`SELECT id, role FROM users WHERE id = ${id} LIMIT 1`;
    if (target.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Same rail as delete: staff moderate members, not each other.
    if (STAFF_ROLES.includes(String(target[0].role))) {
      return NextResponse.json({ error: 'Staff accounts cannot be moderated from here.' }, { status: 403 });
    }

    const cleanReason = (reason || '').trim();

    if (action === 'ban') {
      await db`
        UPDATE users
        SET is_suspended = TRUE, suspended_reason = ${cleanReason}, suspended_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
      `;
      // End every live session immediately, don't just block the next login.
      await db`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ${id} AND revoked_at IS NULL`.catch(() => {});
    } else if (action === 'unban') {
      await db`
        UPDATE users
        SET is_suspended = FALSE, suspended_reason = '', suspended_at = NULL, updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (action === 'unverify') {
      await db`UPDATE users SET email_verified = FALSE, updated_at = NOW() WHERE id = ${id}`;
      await db`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ${id} AND revoked_at IS NULL`.catch(() => {});
    } else if (action === 'verify') {
      await db`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = ${id}`;
    }
    // 'warning' and 'strike' are record-only — they change no account state,
    // they build the history an eventual ban is justified by.

    await db`
      INSERT INTO moderation_actions (user_id, action, reason, issued_by, issued_by_name)
      VALUES (${id}, ${action}, ${cleanReason}, ${session.id}, ${session.fullName || session.email})
    `;

    const [counts] = (await db`
      SELECT
        COUNT(*) FILTER (WHERE action = 'strike')::int  AS strikes,
        COUNT(*) FILTER (WHERE action = 'warning')::int AS warnings
      FROM moderation_actions WHERE user_id = ${id}
    `) as unknown as { strikes: number; warnings: number }[];

    return NextResponse.json({ success: true, strikes: counts?.strikes ?? 0, warnings: counts?.warnings ?? 0 });
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json({ error: 'Failed to apply moderation action' }, { status: 500 });
  }
}
