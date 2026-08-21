import { NextRequest, NextResponse } from 'next/server';
import { ROLES } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/referral?code=ABC123 — resolve a referral code to the agent's name.
 *
 * Called by the public signup page so it can show "Referred by Jane" and lock
 * the attribution. Deliberately returns nothing but a display name: no email,
 * no id, no counts. Someone guessing codes learns only that a code exists and
 * whose name is on it — the same thing they would learn from the printed card
 * the agent handed them.
 *
 * Suspended agents resolve as invalid so a departed marketer stops accruing
 * commission the moment their account is suspended.
 */
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get('code') || '').trim().toUpperCase();
  if (!code || code.length > 16) {
    return NextResponse.json({ valid: false });
  }

  try {
    const rows = (await db`
      SELECT id, full_name
      FROM users
      WHERE LOWER(referral_code) = ${code.toLowerCase()}
        AND role = ${ROLES.SALES_AGENT}
        AND is_suspended IS NOT TRUE
      LIMIT 1
    `) as unknown as Row[];

    if (rows.length === 0) return NextResponse.json({ valid: false });

    return NextResponse.json({
      valid: true,
      agentId: rows[0].id,
      agentName: rows[0].full_name || 'your agent',
      code,
    });
  } catch (error) {
    console.error('Referral resolve error:', error);
    // Never block a signup because attribution lookup failed.
    return NextResponse.json({ valid: false });
  }
}
