import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SUPER_ADMIN_ROLES, FINANCE_ROLES, hasRole } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/** GET /api/admin/agents/payouts?agentId= — payout history for one agent. */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, FINANCE_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const agentId = request.nextUrl.searchParams.get('agentId');

    const rows = (await db`
      SELECT p.id, p.agent_id, p.amount_cents, p.period_start, p.period_end,
             p.reference, p.note, p.paid_at, p.recorded_by_name,
             u.full_name AS agent_name
      FROM commission_payouts p
      JOIN users u ON u.id = p.agent_id
      WHERE (${agentId}::uuid IS NULL OR p.agent_id = ${agentId}::uuid)
      ORDER BY p.paid_at DESC
      LIMIT 200
    `.catch(() => [])) as unknown as Row[];

    return NextResponse.json({
      payouts: rows.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        agentName: r.agent_name,
        amountCents: Number(r.amount_cents) || 0,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        reference: r.reference || '',
        note: r.note || '',
        paidAt: r.paid_at,
        recordedBy: r.recorded_by_name || 'Unknown',
      })),
    });
  } catch (error) {
    console.error('Payout list error:', error);
    return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 });
  }
}

/**
 * POST /api/admin/agents/payouts — record a commission payment.
 *
 * This records money that has ALREADY left the bank; it does not move any.
 * Earned commission stays derived from the payments table, so recording a
 * payout only ever reduces the outstanding figure and can never inflate what
 * an agent appears to have earned.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { agentId, amountRand, reference, note, periodStart, periodEnd } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }
    const amount = Number(amountRand);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter a payout amount greater than zero' }, { status: 400 });
    }

    const agent = (await db`
      SELECT id, full_name, role FROM users WHERE id = ${agentId} LIMIT 1
    `) as unknown as Row[];
    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const amountCents = Math.round(amount * 100);
    await db`
      INSERT INTO commission_payouts (
        agent_id, amount_cents, period_start, period_end,
        reference, note, recorded_by, recorded_by_name
      ) VALUES (
        ${agentId}, ${amountCents},
        ${periodStart || null}, ${periodEnd || null},
        ${String(reference || '').slice(0, 120)}, ${String(note || '').slice(0, 500)},
        ${session!.id}, ${session!.fullName || session!.email}
      )
    `;

    return NextResponse.json({
      ok: true,
      message: `Recorded R${amount.toFixed(2)} paid to ${agent[0].full_name}.`,
    });
  } catch (error) {
    console.error('Payout record error:', error);
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
  }
}
