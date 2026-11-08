import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import {
  getPosDashboard, getPosFinancialLedger, getPosInventoryLogs, getLedgerTrialBalance, getInventorySummary,
} from '@/lib/pos/pos-service';
import { posErrorResponse } from '@/lib/pos/errors';

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const saToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' })).toISOString().slice(0, 10);

/**
 * ?type=dashboard&from=YYYY-MM-DD&to=YYYY-MM-DD (default: today)
 * ?type=daily&date=YYYY-MM-DD   (one day; same shape as dashboard)
 * ?type=ledger | trial_balance | inventory_logs | inventory
 */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'reports.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') || 'dashboard';
    if (type === 'ledger') return NextResponse.json({ ledger: await getPosFinancialLedger(auth.businessId, Number(sp.get('limit')) || 200) });
    if (type === 'trial_balance') return NextResponse.json({ accounts: await getLedgerTrialBalance(auth.businessId) });
    if (type === 'inventory_logs') return NextResponse.json({ logs: await getPosInventoryLogs(auth.businessId, sp.get('productId') || undefined, 200) });
    if (type === 'inventory') return NextResponse.json(await getInventorySummary(auth.businessId));

    const day = isDate(sp.get('date')) ? sp.get('date')! : saToday();
    const from = type === 'daily' ? day : isDate(sp.get('from')) ? sp.get('from')! : day;
    const to = type === 'daily' ? day : isDate(sp.get('to')) ? sp.get('to')! : day;
    const current = await getPosDashboard(auth.businessId, from, to);

    // Same-length previous period, for comparison.
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    const prevTo = new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10);
    const prevFrom = new Date(Date.parse(from) - days * 86400000).toISOString().slice(0, 10);
    const previous = sp.get('compare') === '0' ? null : await getPosDashboard(auth.businessId, prevFrom, prevTo);
    return NextResponse.json({ ...current, previous });
  } catch (err) {
    return posErrorResponse(err);
  }
}
