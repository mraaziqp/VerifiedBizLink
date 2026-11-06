import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosPurchaseOrders, createPosPurchaseOrder, receivePosPurchaseOrder } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await getPosPurchaseOrders(auth.businessId);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (auth.posRole === 'cashier') {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, poId, supplierId, items, notes } = body;

  if (action === 'receive') {
    if (!poId) return NextResponse.json({ error: 'Missing purchase order ID' }, { status: 400 });
    const received = await receivePosPurchaseOrder(auth.businessId, poId, auth.session.id);
    return NextResponse.json({ success: true, order: received });
  }

  // Create Purchase Order
  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Supplier and items are required.' }, { status: 400 });
  }

  const order = await createPosPurchaseOrder(auth.businessId, supplierId, items, notes);
  return NextResponse.json({ success: true, order });
}
