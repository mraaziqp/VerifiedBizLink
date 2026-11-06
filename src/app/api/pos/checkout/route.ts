import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { processPosSale, ProcessSaleInput } from '@/lib/pos/pos-service';

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    items,
    paymentMethod,
    tenderAmountCents,
    tillId,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    idempotencyKey,
    isOfflineSync,
    offlineCreatedAt,
    devicePlatform,
    useSandbox,
  } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Basket is empty.' }, { status: 400 });
  }

  if (!paymentMethod || !['cash', 'card_tap', 'qr_online'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Valid payment method required (cash, card_tap, qr_online).' }, { status: 400 });
  }

  try {
    const saleInput: ProcessSaleInput = {
      businessId: auth.businessId,
      tillId,
      cashierId: auth.session.id,
      items: items.map((it: { productId?: string; name: string; quantity: number; unitPriceCents: number; costPriceCents?: number; discountCents?: number }) => ({
        productId: it.productId,
        name: it.name,
        quantity: Number(it.quantity) || 1,
        unitPriceCents: Number(it.unitPriceCents) || 0,
        costPriceCents: Number(it.costPriceCents) || 0,
        discountCents: Number(it.discountCents) || 0,
      })),
      paymentMethod,
      tenderAmountCents: tenderAmountCents ? Number(tenderAmountCents) : undefined,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      idempotencyKey,
      isOfflineSync,
      offlineCreatedAt,
      devicePlatform: devicePlatform || (req.headers.get('user-agent')?.includes('VerifiedBizLinkApp') ? 'android' : 'web'),
      useSandbox,
    };

    const result = await processPosSale(saleInput);
    return NextResponse.json({
      success: true,
      sale: result.sale,
      items: result.items,
      payment: result.payment,
      paymentResponse: result.paymentResponse,
    });
  } catch (err) {
    console.error('POS Checkout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not process sale.' },
      { status: 500 }
    );
  }
}
