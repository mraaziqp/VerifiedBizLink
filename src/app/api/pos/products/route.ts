import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosProducts, createPosProduct, adjustPosStock } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const query = req.nextUrl.searchParams.get('q') || undefined;
  const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined;

  const products = await getPosProducts(auth.businessId, query, categoryId);
  return NextResponse.json({ products, businessName: auth.businessName });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Cashiers without manager role cannot create or adjust stock
  if (auth.posRole === 'cashier') {
    return NextResponse.json({ error: 'Only owners, managers, and stock controllers can modify inventory.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // Handle stock adjustment request
  if (body.action === 'adjust_stock') {
    const { productId, change, reason, notes } = body;
    if (!productId || typeof change !== 'number') {
      return NextResponse.json({ error: 'Missing product ID or change amount' }, { status: 400 });
    }
    const updated = await adjustPosStock(
      auth.businessId,
      productId,
      change,
      reason || 'manual_adjustment',
      notes,
      auth.session.id
    );
    return NextResponse.json({ success: true, product: updated });
  }

  // Handle product creation
  if (!body.name || typeof body.sellingPriceCents !== 'number') {
    return NextResponse.json({ error: 'Product name and selling price are required.' }, { status: 400 });
  }

  const product = await createPosProduct(
    auth.businessId,
    {
      name: body.name,
      categoryId: body.categoryId || null,
      sku: body.sku || null,
      barcode: body.barcode || null,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      costPriceCents: body.costPriceCents || 0,
      sellingPriceCents: body.sellingPriceCents,
      taxRatePercent: body.taxRatePercent ?? 15,
      stockQuantity: body.stockQuantity || 0,
      minStockThreshold: body.minStockThreshold ?? 5,
      unit: body.unit || 'item',
    },
    auth.session.id
  );

  return NextResponse.json({ success: true, product });
}
