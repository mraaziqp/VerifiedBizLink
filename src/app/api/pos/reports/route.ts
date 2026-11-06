import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosDailySummary, getPosFinancialLedger, getPosInventoryLogs } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type') || 'daily';
  const dateStr = req.nextUrl.searchParams.get('date') || undefined;

  if (type === 'ledger') {
    const ledger = await getPosFinancialLedger(auth.businessId, 100);
    return NextResponse.json({ ledger });
  }

  if (type === 'inventory_logs') {
    const logs = await getPosInventoryLogs(auth.businessId, undefined, 100);
    return NextResponse.json({ logs });
  }

  const daily = await getPosDailySummary(auth.businessId, dateStr);
  return NextResponse.json(daily);
}
