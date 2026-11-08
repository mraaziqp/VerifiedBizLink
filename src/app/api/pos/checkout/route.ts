import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { processPosSale, type CheckoutLineInput } from '@/lib/pos/checkout';
import { ALL_PAYMENT_METHODS, type PaymentMethodType } from '@/lib/pos/payments/types';
import { PosError, posErrorResponse, readJson } from '@/lib/pos/errors';
import { enforceRateLimit, numOrUndefined, resolveActor } from '@/lib/pos/route-helpers';

/**
 * POST /api/pos/checkout
 *
 * Body: {
 *   items: [{ productId, quantity, discountCents? } | { custom: { name, unitPriceCents }, quantity }],
 *   paymentMethod: 'cash' | 'card_external' | 'card_tap' | 'qr_online',
 *   idempotencyKey, tenderAmountCents?, externalReference?, tillId?,
 *   customerName?, customerPhone?, customerEmail?, notes?,
 *   offline?: { createdAt, clientTotalCents? }
 * }
 *
 * Prices are never read from the body. Any unitPriceCents/costPriceCents
 * sent for a catalogue product is ignored.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'sale.create');
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  try {
    const actor = await resolveActor(req, auth, 'sale.create');
    await enforceRateLimit(`pos_checkout:${auth.businessId}:${actor.userId}`, 120, 60);
    const body = await readJson(req);

    const paymentMethod = body.paymentMethod as PaymentMethodType;
    if (!ALL_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new PosError(400, 'BAD_PAYMENT_METHOD', `paymentMethod must be one of: ${ALL_PAYMENT_METHODS.join(', ')}.`);
    }
    if (!Array.isArray(body.items)) throw new PosError(400, 'EMPTY_BASKET', 'Basket is empty.');

    const lines: CheckoutLineInput[] = (body.items as Record<string, unknown>[]).map((it) => {
      const custom = it?.custom as Record<string, unknown> | undefined;
      return {
        productId: custom ? null : (it?.productId as string | undefined) ?? null,
        quantity: Number(it?.quantity),
        discountCents: numOrUndefined(it?.discountCents),
        custom: custom ? { name: String(custom.name ?? ''), unitPriceCents: Number(custom.unitPriceCents) } : null,
      };
    });

    const offline = body.offline && typeof body.offline === 'object'
      ? {
          createdAt: String((body.offline as Record<string, unknown>).createdAt ?? ''),
          clientTotalCents: numOrUndefined((body.offline as Record<string, unknown>).clientTotalCents),
        }
      : null;

    const ua = req.headers.get('user-agent') || '';
    const devicePlatform = body.devicePlatform === 'ios' || body.devicePlatform === 'android'
      ? body.devicePlatform
      : /iPhone|iPad/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'web';

    const result = await processPosSale({
      businessId: auth.businessId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      tillId: (body.tillId as string | undefined) || null,
      lines,
      paymentMethod,
      tenderAmountCents: numOrUndefined(body.tenderAmountCents),
      externalReference: typeof body.externalReference === 'string' ? body.externalReference : undefined,
      customerName: typeof body.customerName === 'string' ? body.customerName : undefined,
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone : undefined,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      idempotencyKey: String(body.idempotencyKey ?? ''),
      offline,
      devicePlatform,
    });

    return NextResponse.json({ success: true, ...result }, { status: result.isDuplicate ? 200 : 201 });
  } catch (err) {
    return posErrorResponse(err, 'Could not complete the sale.');
  }
}
