import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/payments/create-intent — despite the name (a leftover from an
// abandoned Stripe integration — the fake POST handler that used to live
// here was removed), this is the real endpoint Settings > Billing's
// Transaction History table reads from. It previously only selected
// id/plan_type/amount/status/created_at, so the UI's `reference`/
// `description` columns always fell back to a truncated UUID and a generic
// "VBL Upgrade" label instead of the real PayFast reference and
// description every payment actually has.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payments = await db`
      SELECT id, plan_type, amount, status, reference, description, created_at, completed_at
      FROM payments
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json(
      { success: true, payments },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
