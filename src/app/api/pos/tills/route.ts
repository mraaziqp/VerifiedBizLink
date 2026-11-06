import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getTills, openTill, closeTill } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tills = await getTills(auth.businessId);
  return NextResponse.json({ tills });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, tillId, floatCents, closingCashCents } = body;

  if (action === 'open') {
    if (!tillId) return NextResponse.json({ error: 'Missing tillId' }, { status: 400 });
    const till = await openTill(tillId, auth.businessId, auth.session.id, floatCents || 50000);
    return NextResponse.json({ success: true, till });
  }

  if (action === 'close') {
    if (!tillId) return NextResponse.json({ error: 'Missing tillId' }, { status: 400 });
    const till = await closeTill(tillId, auth.businessId, closingCashCents || 0);
    return NextResponse.json({ success: true, till });
  }

  return NextResponse.json({ error: 'Invalid till action' }, { status: 400 });
}
