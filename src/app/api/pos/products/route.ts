import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosProducts, createPosProduct, adjustPosStock, getInventorySummary } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';
import { numOrUndefined, resolveActor } from '@/lib/pos/route-helpers';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'catalog.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const sp = req.nextUrl.searchParams;
    const products = await getPosProducts(auth.businessId, sp.get('q') || undefined, sp.get('categoryId') || undefined);
    const summary = sp.get('summary') === '1' ? await getInventorySummary(auth.businessId) : undefined;
    return NextResponse.json({ products, summary, businessName: auth.businessName, businessId: auth.businessId });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/** Creates a product, or with { action: 'adjust_stock', productId, change | setTo, reason, notes } adjusts stock. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch (err) {
    return posErrorResponse(err);
  }
  const capability = body.action === 'adjust_stock' ? 'stock.adjust' : 'catalog.write';
  const guard = await requirePosAccess(req, capability);
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  try {
    const actor = await resolveActor(req, auth, capability);
    if (body.action === 'adjust_stock') {
      const product = await adjustPosStock(
        auth.businessId,
        String(body.productId ?? ''),
        { change: numOrUndefined(body.change), setTo: numOrUndefined(body.setTo), reason: String(body.reason ?? ''), notes: (body.notes as string) ?? null },
        actor.userId,
      );
      return NextResponse.json({ success: true, product });
    }
    const product = await createPosProduct(auth.businessId, body, actor.userId);
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err) {
    return posErrorResponse(err);
  }
}
