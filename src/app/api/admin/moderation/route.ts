import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/moderation — the security view: every non-staff member
 * with their warning/strike tally and current account state, plus the
 * recent moderation history.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = (await db`
      SELECT
        u.id, u.full_name, u.email, u.role, u.created_at,
        u.email_verified, u.is_suspended, u.suspended_reason,
        b.company_name,
        COALESCE(m.strikes, 0)  AS strikes,
        COALESCE(m.warnings, 0) AS warnings,
        m.last_action_at
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE action = 'strike')::int  AS strikes,
          COUNT(*) FILTER (WHERE action = 'warning')::int AS warnings,
          MAX(created_at) AS last_action_at
        FROM moderation_actions
        GROUP BY user_id
      ) m ON m.user_id = u.id
      WHERE u.role NOT IN ('admin', 'banker', 'lawyer')
      ORDER BY COALESCE(m.strikes, 0) DESC, u.created_at DESC
      LIMIT 200
    `) as unknown as Row[];

    const history = (await db`
      SELECT
        ma.id, ma.action, ma.reason, ma.issued_by_name, ma.created_at,
        u.full_name AS target_name, u.email AS target_email
      FROM moderation_actions ma
      JOIN users u ON u.id = ma.user_id
      ORDER BY ma.created_at DESC
      LIMIT 100
    `) as unknown as Row[];

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        companyName: u.company_name ?? null,
        createdAt: u.created_at,
        emailVerified: u.email_verified === true,
        isSuspended: u.is_suspended === true,
        suspendedReason: u.suspended_reason || '',
        strikes: Number(u.strikes) || 0,
        warnings: Number(u.warnings) || 0,
        lastActionAt: u.last_action_at ?? null,
      })),
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        reason: h.reason || '',
        issuedByName: h.issued_by_name || 'Unknown',
        createdAt: h.created_at,
        targetName: h.target_name,
        targetEmail: h.target_email,
      })),
    });
  } catch (error) {
    console.error('Moderation list error:', error);
    return NextResponse.json({ error: 'Failed to load moderation data' }, { status: 500 });
  }
}
