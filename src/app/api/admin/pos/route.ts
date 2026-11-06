import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import { getAdminPosMetrics } from '@/lib/pos/pos-service';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await getAdminPosMetrics();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, businessId, status, customFeePercent } = body;

  if (action === 'update_merchant_pos') {
    if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    await db`
      UPDATE pos_merchant_subscriptions
      SET
        status = COALESCE(${status ?? null}, status),
        transaction_fee_percent = CASE WHEN ${customFeePercent !== undefined} THEN ${customFeePercent} ELSE transaction_fee_percent END,
        updated_at = NOW()
      WHERE business_id = ${businessId}
    `;

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid admin action' }, { status: 400 });
}
