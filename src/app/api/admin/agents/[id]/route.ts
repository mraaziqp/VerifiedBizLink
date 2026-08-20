import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ROLES, SUPER_ADMIN_ROLES, hasRole } from '@/lib/roles';
import { allocateReferralCode } from '@/lib/agents';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * PATCH /api/admin/agents/[id] — manage one agent on the fly.
 *
 * Supported actions:
 *   set_rate         negotiated commission rate, or null to use the default
 *   set_notes        free-text notes kept against the agent
 *   suspend/reinstate  stop or resume an agent earning
 *   regenerate_code  issue a fresh referral code
 *
 * Suspending does NOT delete anything: past attribution, commission already
 * earned and payouts all remain, so the record of what someone brought in
 * survives them leaving. Their code simply stops resolving on the signup page.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { action, value } = await request.json();

    const rows = (await db`
      SELECT id, full_name, role FROM users WHERE id = ${id} LIMIT 1
    `) as unknown as Row[];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (rows[0].role !== ROLES.SALES_AGENT) {
      return NextResponse.json(
        { error: 'That user is not a sales agent. Change their role in User Management first.' },
        { status: 400 },
      );
    }
    const name = String(rows[0].full_name || 'Agent');

    switch (action) {
      case 'set_rate': {
        // null / empty clears the override and falls back to the platform rate.
        if (value === null || value === '' || value === undefined) {
          await db`UPDATE users SET commission_rate_override = NULL WHERE id = ${id}`;
          return NextResponse.json({ ok: true, message: `${name} now uses the default rate.` });
        }
        const percent = Number(value);
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          return NextResponse.json({ error: 'Rate must be between 0 and 100 percent' }, { status: 400 });
        }
        await db`UPDATE users SET commission_rate_override = ${percent / 100} WHERE id = ${id}`;
        return NextResponse.json({ ok: true, message: `${name} is now on ${percent}%.` });
      }

      case 'set_notes': {
        await db`UPDATE users SET agent_notes = ${String(value ?? '').slice(0, 2000)} WHERE id = ${id}`;
        return NextResponse.json({ ok: true, message: `Notes saved for ${name}.` });
      }

      case 'suspend':
      case 'reinstate': {
        const suspend = action === 'suspend';
        await db`
          UPDATE users
          SET is_suspended = ${suspend},
              suspended_reason = ${suspend ? String(value ?? '').slice(0, 500) || 'Agent suspended' : null},
              updated_at = NOW()
          WHERE id = ${id}
        `;
        if (suspend) {
          // Revoke live sessions so access stops immediately, not at expiry.
          await db`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ${id} AND revoked_at IS NULL`
            .catch(() => {});
        }
        return NextResponse.json({
          ok: true,
          message: suspend
            ? `${name} suspended. Their code no longer credits new signups; existing records are untouched.`
            : `${name} reinstated.`,
        });
      }

      case 'regenerate_code': {
        const code = await allocateReferralCode();
        await db`UPDATE users SET referral_code = ${code} WHERE id = ${id}`;
        return NextResponse.json({
          ok: true,
          code,
          message: `New code ${code} issued. Their previous link will stop working.`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent management error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/agents/[id] — revoke a pending invite (NOT an agent).
 * Agents themselves are suspended rather than deleted, so their production
 * history survives.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;

    const revoked = (await db`
      UPDATE agent_invites SET revoked_at = NOW()
      WHERE id = ${id} AND accepted_at IS NULL AND revoked_at IS NULL
      RETURNING full_name
    `) as unknown as Row[];

    if (revoked.length === 0) {
      return NextResponse.json(
        { error: 'That invite has already been used or withdrawn.' },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: `Invite for ${revoked[0].full_name} withdrawn. The link no longer works.`,
    });
  } catch (error) {
    console.error('Invite revoke error:', error);
    return NextResponse.json({ error: 'Failed to withdraw invite' }, { status: 500 });
  }
}
