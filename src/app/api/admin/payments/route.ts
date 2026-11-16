import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { hasRole, FINANCE_ROLES } from '@/lib/roles';
import db from '@/lib/db';
import { ensurePaymentVoidColumns, voidTestPayment, PaymentVoidError } from '@/lib/payment-void';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await ensurePaymentVoidColumns();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const filter = status && status !== 'all' ? status : null;

    // Removed (voided) test charges are listed under their own filter only.
    const payments = await db`
      SELECT p.id, p.user_id, p.plan_type, p.amount, p.currency, p.status,
             p.reference, p.description, p.ad_id, p.payfast_reference,
             p.created_at, p.completed_at, p.voided_at, p.void_reason, p.voided_by_name,
             u.full_name AS user_name, u.email AS user_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE (${filter}::text = 'removed' AND p.voided_at IS NOT NULL)
         OR (${filter}::text IS DISTINCT FROM 'removed' AND p.voided_at IS NULL
             AND (${filter}::text IS NULL OR p.status = ${filter}))
      ORDER BY p.created_at DESC
      LIMIT 200
    `;

    const [totals] = await db`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS revenue_cents,
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
        ), 0) AS revenue_30d_cents
      FROM payments
      WHERE voided_at IS NULL
    `;

    return NextResponse.json({
      payments,
      stats: {
        completedCount: parseInt(totals.completed_count),
        pendingCount: parseInt(totals.pending_count),
        failedCount: parseInt(totals.failed_count),
        revenueCents: parseInt(totals.revenue_cents),
        revenue30dCents: parseInt(totals.revenue_30d_cents),
      },
    });
  } catch (error) {
    console.error('Admin payments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

/**
 * POST { action: 'void', paymentId, reason } — removes a test charge from the
 * customer's history and from revenue (kept in the database, marked void).
 */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || !hasRole(session.role, FINANCE_ROLES)) {
    return NextResponse.json({ error: 'Only finance administrators can remove charges.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action !== 'void') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  try {
    const payment = await voidTestPayment({
      paymentId: String(body.paymentId ?? ''),
      reason: String(body.reason ?? ''),
      actor: { userId: session.id, name: session.fullName || session.email },
    });
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    if (error instanceof PaymentVoidError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Void payment failed:', error);
    return NextResponse.json({ error: 'Could not remove the charge.' }, { status: 500 });
  }
}
