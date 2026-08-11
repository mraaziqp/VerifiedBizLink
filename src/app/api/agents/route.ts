import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/agents — the sales agents a signup can be attributed to.
 *
 * Reachable from the public signup form, because an assisted sign-up is done
 * with the agent sitting there. Deliberately returns **id and display name
 * only** — no emails, no roles, no counts — so it cannot be used to harvest
 * staff contact details. Suspended agents are excluded so a departed employee
 * can't keep accruing commission.
 */
export async function GET() {
  try {
    const rows = (await db`
      SELECT id, full_name
      FROM users
      WHERE role = ${ROLES.SALES_AGENT}
        AND is_suspended IS NOT TRUE
      ORDER BY full_name ASC
    `) as unknown as Row[];

    return NextResponse.json({
      agents: rows.map((r) => ({
        id: r.id,
        name: r.full_name || 'Unnamed agent',
      })),
    });
  } catch (error) {
    console.error('Agent list error:', error);
    // Never block a sign-up because the agent list failed to load — the form
    // falls back to letting the user type a name.
    return NextResponse.json({ agents: [] });
  }
}
