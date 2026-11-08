import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosSales, getPosSaleById } from '@/lib/pos/pos-service';
import { posErrorResponse } from '@/lib/pos/errors';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'sale.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const sp = req.nextUrl.searchParams;
    const saleId = sp.get('id');
    if (saleId) {
      const sale = await getPosSaleById(auth.businessId, saleId);
      if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      return NextResponse.json(sale);
    }
    const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(sp.get(k) || '') ? sp.get(k)! : undefined);
    const sales = await getPosSales(auth.businessId, Number(sp.get('limit')) || 50, Number(sp.get('offset')) || 0, date('from'), date('to'));
    return NextResponse.json({ sales });
  } catch (err) {
    return posErrorResponse(err);
  }
}
