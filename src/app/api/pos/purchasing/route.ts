import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosPurchaseOrders, createPosPurchaseOrder, receivePosPurchaseOrder, cancelPosPurchaseOrder } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';
import { resolveActor } from '@/lib/pos/route-helpers';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'purchasing.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ orders: await getPosPurchaseOrders(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/**
 * { supplierId, items: [{ productId, quantity, unitCostCents }], notes } creates an order.
 * { action: 'receive', poId, items?: [{ itemId, quantity }] } receives all or part of it.
 * { action: 'cancel', poId } cancels an order with nothing received.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'purchasing.write');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const actor = await resolveActor(req, auth, 'purchasing.write');
    const body = await readJson(req);
    if (body.action === 'receive') {
      const items = Array.isArray(body.items)
        ? (body.items as Record<string, unknown>[]).map((i) => ({ itemId: String(i.itemId ?? ''), quantity: Number(i.quantity) }))
        : undefined;
      return NextResponse.json({ success: true, order: await receivePosPurchaseOrder(auth.businessId, body.poId, actor.userId, items) });
    }
    if (body.action === 'cancel') {
      return NextResponse.json({ success: true, order: await cancelPosPurchaseOrder(auth.businessId, body.poId) });
    }
    const order = await createPosPurchaseOrder(auth.businessId, body.supplierId, body.items, body.notes);
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err) {
    return posErrorResponse(err);
  }
}
