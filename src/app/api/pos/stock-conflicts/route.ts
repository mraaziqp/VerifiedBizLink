import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getStockConflicts, resolveStockConflict } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';

/** Offline / online-paid sales that sold more than the system thought was in stock. */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'catalog.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ conflicts: await getStockConflicts(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'stock.adjust');
  if (!guard.ok) return guard.response;
  try {
    const body = await readJson(req);
    return NextResponse.json({ success: true, conflict: await resolveStockConflict(guard.auth.businessId, String(body.conflictId ?? ''), guard.auth.session.id) });
  } catch (err) {
    return posErrorResponse(err);
  }
}
