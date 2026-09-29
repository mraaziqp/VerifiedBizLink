import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

/**
 * GET /api/admin/billing-events — the billing log: every charge, failure,
 * notice and downgrade, newest first. ?severity=problems limits it to
 * warnings and critical events.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const problemsOnly = new URL(request.url).searchParams.get('severity') === 'problems';

  try {
    const events = problemsOnly
      ? await db`
          SELECT e.id, e.event, e.severity, e.amount_cents, e.reference, e.detail, e.created_at,
                 b.company_name, u.email AS user_email
          FROM billing_events e
          LEFT JOIN businesses b ON b.id::text = e.business_id
          LEFT JOIN users u ON u.id::text = e.user_id
          WHERE e.severity IN ('warning', 'critical')
          ORDER BY e.created_at DESC
          LIMIT 200`
      : await db`
          SELECT e.id, e.event, e.severity, e.amount_cents, e.reference, e.detail, e.created_at,
                 b.company_name, u.email AS user_email
          FROM billing_events e
          LEFT JOIN businesses b ON b.id::text = e.business_id
          LEFT JOIN users u ON u.id::text = e.user_id
          ORDER BY e.created_at DESC
          LIMIT 200`;

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Billing log read failed:', error);
    return NextResponse.json(
      { events: [], error: 'The billing log is not set up yet — run scripts/migrate-billing-events.mjs.' },
      { status: 200 },
    );
  }
}
