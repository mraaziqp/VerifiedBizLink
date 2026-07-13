import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const payments = status && status !== 'all'
      ? await db`
          SELECT p.id, p.user_id, p.plan_type, p.amount, p.currency, p.status,
                 p.reference, p.description, p.ad_id, p.payfast_reference,
                 p.created_at, p.completed_at,
                 u.full_name AS user_name, u.email AS user_email
          FROM payments p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC
          LIMIT 200
        `
      : await db`
          SELECT p.id, p.user_id, p.plan_type, p.amount, p.currency, p.status,
                 p.reference, p.description, p.ad_id, p.payfast_reference,
                 p.created_at, p.completed_at,
                 u.full_name AS user_name, u.email AS user_email
          FROM payments p
          LEFT JOIN users u ON p.user_id = u.id
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
