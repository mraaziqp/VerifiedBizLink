import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SUPER_ADMIN_ROLES, FINANCE_ROLES, hasRole } from '@/lib/roles';
import { reversePaymentAndRaiseClawback } from '@/lib/clawbacks';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/** GET — clawbacks awaiting review, and recent decisions. */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, FINANCE_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const status = request.nextUrl.searchParams.get('status');

    const rows = (await db`
      SELECT c.id, c.agent_id, c.payment_reference, c.commission_cents, c.payment_cents,
             c.rate_applied, c.reason, c.already_paid_out, c.status, c.review_note,
             c.reviewed_by_name, c.reviewed_at, c.created_at,
             u.full_name AS agent_name, u.email AS agent_email,
             b.company_name
      FROM commission_clawbacks c
      JOIN users u ON u.id = c.agent_id
      LEFT JOIN businesses b ON b.id = c.business_id
      WHERE (${status}::text IS NULL OR c.status = ${status})
      ORDER BY
        CASE c.status WHEN 'pending' THEN 0 ELSE 1 END,
        c.created_at DESC
      LIMIT 200
    `.catch(() => [])) as unknown as Row[];

    const clawbacks = rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      agentName: r.agent_name,
      agentEmail: r.agent_email,
      companyName: r.company_name ?? null,
      paymentReference: r.payment_reference,
      commissionCents: Number(r.commission_cents) || 0,
      paymentCents: Number(r.payment_cents) || 0,
      ratePercent: r.rate_applied !== null ? Math.round(Number(r.rate_applied) * 100) : null,
      reason: r.reason,
      // Drives the wording: reduce what we owe, or recover money already sent.
      alreadyPaidOut: r.already_paid_out === true,
      status: r.status,
      reviewNote: r.review_note ?? null,
      reviewedBy: r.reviewed_by_name ?? null,
      reviewedAt: r.reviewed_at ?? null,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      clawbacks,
      summary: {
        pending: clawbacks.filter((c) => c.status === 'pending').length,
        pendingCents: clawbacks
          .filter((c) => c.status === 'pending')
          .reduce((s, c) => s + c.commissionCents, 0),
        approvedCents: clawbacks
          .filter((c) => c.status === 'approved' || c.status === 'recovered')
          .reduce((s, c) => s + c.commissionCents, 0),
      },
    });
  } catch (error) {
    console.error('Clawback list error:', error);
    return NextResponse.json({ error: 'Failed to load clawbacks' }, { status: 500 });
  }
}

/**
 * POST — reverse a payment, raising a clawback if it had earned commission.
 *
 * This is the manual path: PayFast refunds are usually issued from their
 * dashboard, so the app is told about them here rather than discovering them.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { paymentReference, reason } = await request.json();
    if (!paymentReference || !String(reason || '').trim()) {
      return NextResponse.json(
        { error: 'A payment reference and a reason are both required' },
        { status: 400 },
      );
    }

    const result = await reversePaymentAndRaiseClawback({
      paymentReference: String(paymentReference).trim(),
      reason: String(reason).trim(),
      actorName: session!.fullName || session!.email,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: result.raised
        ? `Payment reversed. A R${((result.commissionCents ?? 0) / 100).toFixed(2)} clawback against ${result.agentName} is waiting for your approval.`
        : result.reason,
    });
  } catch (error) {
    console.error('Payment reversal error:', error);
    return NextResponse.json({ error: 'Failed to reverse the payment' }, { status: 500 });
  }
}

/**
 * PATCH — decide a clawback.
 *
 * approved  the commission is recoverable and comes off what is owed
 * waived    the Advisor keeps it (a bank error is not their fault)
 * recovered the money has actually been taken back
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { clawbackId, status, note } = await request.json();
    const allowed = ['approved', 'waived', 'recovered'];
    if (!clawbackId || !allowed.includes(status)) {
      return NextResponse.json(
        { error: 'Provide a clawback and one of: approved, waived, recovered' },
        { status: 400 },
      );
    }

    const rows = (await db`
      UPDATE commission_clawbacks
      SET status = ${status},
          review_note = ${String(note || '').slice(0, 500)},
          reviewed_by = ${session!.id},
          reviewed_by_name = ${session!.fullName || session!.email},
          reviewed_at = NOW()
      WHERE id = ${clawbackId}
      RETURNING agent_id, commission_cents
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Clawback not found' }, { status: 404 });
    }

    const cents = Number(rows[0].commission_cents) || 0;
    // The Advisor is told either way — §16 gives them a right to query a
    // calculation, which they cannot exercise if they never learn of it.
    await db`
      INSERT INTO notifications (user_id, title, content, link)
      VALUES (
        ${rows[0].agent_id},
        ${status === 'waived' ? 'Commission adjustment waived' : 'Commission adjustment applied'},
        ${status === 'waived'
          ? `A reversed payment was reviewed and R${(cents / 100).toFixed(2)} of commission has been left with you.`
          : `A payment was reversed, so R${(cents / 100).toFixed(2)} of commission has been adjusted. Contact the team if you believe this is wrong.`},
        '/agent'
      )
    `.catch(() => {});

    return NextResponse.json({
      ok: true,
      message:
        status === 'waived'
          ? 'Waived — the advisor keeps the commission.'
          : `Clawback ${status}. R${(cents / 100).toFixed(2)} has come off what is owed.`,
    });
  } catch (error) {
    console.error('Clawback decision error:', error);
    return NextResponse.json({ error: 'Failed to update the clawback' }, { status: 500 });
  }
}
