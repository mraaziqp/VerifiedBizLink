import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/payfast/status?ref=VBL-... — lets the return page poll for the
// real outcome instead of assuming success. PayFast's return_url is a
// browser redirect that fires whether or not the server-to-server ITN
// (the only thing that actually marks a payment 'completed' and grants
// the tier/ad boost/credits) ever arrived, so a static "Payment
// Successful!" page can lie. This scopes the lookup to the caller's own
// session so one user can't probe another's payment reference.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
  }

  const rows = await db`
    SELECT status, description, amount
    FROM payments
    WHERE reference = ${ref} AND user_id = ${session.id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  return NextResponse.json(
    { status: rows[0].status, description: rows[0].description, amount: rows[0].amount },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
