import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosSales, getPosSaleById } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const saleId = req.nextUrl.searchParams.get('id');
  if (saleId) {
    const sale = await getPosSaleById(auth.businessId, saleId);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    return NextResponse.json(sale);
  }

  const limit = Number(req.nextUrl.searchParams.get('limit')) || 50;
  const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
  const sales = await getPosSales(auth.businessId, limit, offset);

  return NextResponse.json({ sales });
}
