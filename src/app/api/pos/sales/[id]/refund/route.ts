import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { refundPosSale } from '@/lib/pos/refunds';
import { posErrorResponse, readJson } from '@/lib/pos/errors';
import { enforceRateLimit, resolveActor } from '@/lib/pos/route-helpers';
import { logPosAudit } from '@/lib/pos/audit';

/**
 * POST /api/pos/sales/:id/refund
 * Body: { idempotencyKey, reason, restockItems?: boolean, items?: [{ saleItemId, quantity }] }
 * Omitting items refunds everything not yet refunded.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePosAccess(req, 'sale.refund');
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  try {
    const actor = await resolveActor(req, auth, 'sale.refund');
    await enforceRateLimit(`pos_refund:${auth.businessId}:${actor.userId}`, 30, 300);
    const { id } = await params;
    const body = await readJson(req);
    const items = Array.isArray(body.items)
      ? (body.items as Record<string, unknown>[]).map((i) => ({ saleItemId: String(i.saleItemId ?? ''), quantity: Number(i.quantity) }))
      : undefined;

    const result = await refundPosSale({
      businessId: auth.businessId,
      saleId: id,
      actorUserId: actor.userId,
      reason: typeof body.reason === 'string' ? body.reason : '',
      items,
      restock: body.restockItems !== false,
      idempotencyKey: String(body.idempotencyKey ?? ''),
    });

    if (!result.isDuplicate) {
      await logPosAudit({
        businessId: auth.businessId, actorUserId: actor.userId, actorRole: actor.role, action: 'sale_refunded',
        targetType: 'sale', targetId: id,
        detail: { refundId: result.refund.id, amountCents: Number(result.refund.amount_cents), feeReversalCents: Number(result.refund.fee_reversal_cents) },
      });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return posErrorResponse(err, 'Could not process the refund.');
  }
}
