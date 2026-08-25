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
             p.status, p.bank_reference, p.statement_amount_cents,
             p.statement_date, p.reconciled_at, p.reconciled_by_name,
             p.reconciliation_note, p.payout_method, p.notified_agent_at,
             u.full_name AS agent_name, u.bank_name, u.account_number, u.account_type, u.branch_code, u.account_holder_name
      FROM commission_payouts p
      JOIN users u ON u.id = p.agent_id
      WHERE (${agentId}::uuid IS NULL OR p.agent_id = ${agentId}::uuid)
      ORDER BY p.paid_at DESC
      LIMIT 200
    `.catch(() => [])) as unknown as Row[];

    const payouts = rows.map((r) => {
      const amountCents = Number(r.amount_cents) || 0;
      const statementCents =
        r.statement_amount_cents === null || r.statement_amount_cents === undefined
          ? null
          : Number(r.statement_amount_cents);
      return {
        id: r.id,
        agentId: r.agent_id,
        agentName: r.agent_name,
        amountCents,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        reference: r.reference || '',
        note: r.note || '',
        paidAt: r.paid_at,
        recordedBy: r.recorded_by_name || 'Unknown',
        status: (r.status as string) || 'recorded',
        bankReference: r.bank_reference || '',
        statementAmountCents: statementCents,
        statementDate: r.statement_date,
        reconciledAt: r.reconciled_at,
        reconciledBy: r.reconciled_by_name || null,
        reconciliationNote: r.reconciliation_note || '',
        payoutMethod: (r.payout_method as string) || 'EFT',
        notifiedAgentAt: r.notified_agent_at || null,
        bankName: (r.bank_name as string) || '',
        accountNumber: (r.account_number as string) || '',
        accountType: (r.account_type as string) || '',
        branchCode: (r.branch_code as string) || '',
        accountHolderName: (r.account_holder_name as string) || '',
        // Surfaced rather than hidden: a matched line whose amount differs is
        // exactly the case worth someone's attention.
        varianceCents: statementCents === null ? null : statementCents - amountCents,
      };
    });

    return NextResponse.json({
      payouts,
      summary: {
        total: payouts.length,
        recorded: payouts.filter((p) => p.status === 'recorded').length,
        reconciled: payouts.filter((p) => p.status === 'reconciled').length,
        disputed: payouts.filter((p) => p.status === 'disputed').length,
        unreconciledCents: payouts
          .filter((p) => p.status !== 'reconciled')
          .reduce((s, p) => s + p.amountCents, 0),
      },
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
/**
 * PATCH /api/admin/agents/payouts — reconcile a payout against the bank.
 *
 * The statement amount is stored ALONGSIDE the recorded amount rather than
 * replacing it. If they disagree, both numbers survive and the difference is
 * reported — overwriting one with the other would erase the very discrepancy
 * reconciliation exists to catch.
 *
 * A mismatch is marked 'disputed' automatically. Someone can still force it
 * to 'reconciled' with a note explaining why (a bank fee, a part payment),
 * which is a decision worth recording rather than a checkbox.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, FINANCE_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payoutId, bankReference, statementAmountRand, statementDate, note, force } =
      await request.json();

    if (!payoutId) {
      return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
    }

    const existing = (await db`
      SELECT id, amount_cents FROM commission_payouts WHERE id = ${payoutId} LIMIT 1
    `) as unknown as Row[];
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const recordedCents = Number(existing[0].amount_cents) || 0;
    const hasStatementAmount =
      statementAmountRand !== undefined && statementAmountRand !== null && statementAmountRand !== '';
    const statementCents = hasStatementAmount
      ? Math.round(Number(statementAmountRand) * 100)
      : null;

    if (hasStatementAmount && !Number.isFinite(statementCents as number)) {
      return NextResponse.json({ error: 'Statement amount must be a number' }, { status: 400 });
    }

    const matches = statementCents === null || statementCents === recordedCents;
    const status = matches || force === true ? 'reconciled' : 'disputed';

    await db`
      UPDATE commission_payouts
      SET status = ${status},
          bank_reference = ${String(bankReference || '').slice(0, 120)},
          statement_amount_cents = ${statementCents},
          statement_date = ${statementDate || null},
          reconciliation_note = ${String(note || '').slice(0, 500)},
          reconciled_at = NOW(),
          reconciled_by_name = ${session!.fullName || session!.email}
      WHERE id = ${payoutId}
    `;

    const variance = statementCents === null ? 0 : statementCents - recordedCents;
    return NextResponse.json({
      ok: true,
      status,
      varianceCents: variance,
      message:
        status === 'reconciled'
          ? variance === 0
            ? 'Matched against the bank.'
            : `Marked reconciled with a R${(Math.abs(variance) / 100).toFixed(2)} difference noted.`
          : `Amounts differ by R${(Math.abs(variance) / 100).toFixed(2)} — flagged as disputed for review.`,
    });
  } catch (error) {
    console.error('Payout reconciliation error:', error);
    return NextResponse.json({ error: 'Failed to reconcile payout' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { agentId, amountRand, reference, note, periodStart, periodEnd, payoutMethod = 'EFT' } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }
    const amount = Number(amountRand);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter a payout amount greater than zero' }, { status: 400 });
    }

    const agent = (await db`
      SELECT id, full_name, email, role FROM users WHERE id = ${agentId} LIMIT 1
    `) as unknown as Row[];
    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const amountCents = Math.round(amount * 100);
    await db`
      INSERT INTO commission_payouts (
        agent_id, amount_cents, period_start, period_end,
        reference, note, recorded_by, recorded_by_name,
        payout_method, notified_agent_at
      ) VALUES (
        ${agentId}, ${amountCents},
        ${periodStart || null}, ${periodEnd || null},
        ${String(reference || '').slice(0, 120)}, ${String(note || '').slice(0, 500)},
        ${session!.id}, ${session!.fullName || session!.email},
        ${String(payoutMethod || 'EFT')}, NOW()
      )
    `;

    // Notify the sales agent in their in-app notifications
    const formattedAmount = `R${amount.toFixed(2)}`;
    const notificationMsg = reference
      ? `A commission payout of ${formattedAmount} has been processed via ${payoutMethod} (Ref: ${reference}).`
      : `A commission payout of ${formattedAmount} has been processed via ${payoutMethod}.`;

    await db`
      INSERT INTO notifications (user_id, type, title, content)
      VALUES (${agentId}, 'payout_processed', 'Commission Payout Processed', ${notificationMsg})
    `.catch(() => {});

    await db`
      INSERT INTO agent_activity_log (agent_id, event_type, description, metadata)
      VALUES (
        ${agentId}, 'payout_recorded',
        ${`Payout of ${formattedAmount} recorded by ${session!.fullName || 'Admin'}`},
        ${JSON.stringify({ amountCents, reference, payoutMethod, recordedBy: session!.id })}::jsonb
      )
    `.catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `Recorded ${formattedAmount} paid to ${agent[0].full_name} via ${payoutMethod}. Notification sent to agent.`,
    });
  } catch (error) {
    console.error('Payout record error:', error);
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
  }
}
