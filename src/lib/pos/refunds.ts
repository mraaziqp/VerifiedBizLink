import db, { withTransaction, type DbRow } from '@/lib/db';
import { ensurePosSchema } from './schema';
import { getPaymentAdapter } from './payments';
import { feeReversalFor } from './fees';
import { proportionalCents, quantityToHundredths } from './money';
import { postJournal, refundJournal } from './ledger';
import { PosError, isUuid } from './errors';

export interface RefundInput {
  businessId: string;
  saleId: string;
  actorUserId: string;
  reason: string;
  /** Lines to refund; omitted = everything not yet refunded. */
  items?: { saleItemId: string; quantity: number }[];
  restock: boolean;
  idempotencyKey: string;
}

export interface RefundResult {
  refund: DbRow;
  sale: DbRow;
  isDuplicate: boolean;
  instructions?: string;
}

/**
 * Refunds all or part of a completed sale.
 *
 * The original sale is never edited away: a refund is its own row with its
 * own lines, the sale only gains running totals (refunded_cents,
 * fee_reversed_cents), and the ledger gets a reversing journal. The platform
 * fee is reversed in proportion to what was refunded; on a full refund the
 * whole remaining fee comes back, so no stray cent is left behind.
 *
 * If the fee has already been paid on a statement, the reversal is picked up
 * by the next monthly statement as a credit.
 */
export async function refundPosSale(input: RefundInput): Promise<RefundResult> {
  await ensurePosSchema();
  if (!isUuid(input.saleId)) throw new PosError(400, 'BAD_SALE', 'Invalid sale.');
  if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 100) {
    throw new PosError(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotencyKey is required for every refund.');
  }
  const reason = (input.reason || '').trim().slice(0, 300) || 'Customer refund';

  const [prior] = await db`
    SELECT * FROM pos_refunds WHERE business_id = ${input.businessId} AND idempotency_key = ${input.idempotencyKey} LIMIT 1
  `;
  if (prior) {
    const [sale] = await db`SELECT * FROM pos_sales WHERE id = ${prior.sale_id} AND business_id = ${input.businessId}`;
    return { refund: prior, sale, isDuplicate: true };
  }

  const [saleRow] = await db`SELECT * FROM pos_sales WHERE id = ${input.saleId} AND business_id = ${input.businessId} LIMIT 1`;
  if (!saleRow) throw new PosError(404, 'SALE_NOT_FOUND', 'Sale not found.');
  if (!['completed', 'partially_refunded'].includes(saleRow.payment_status)) {
    throw new PosError(409, 'NOT_REFUNDABLE', saleRow.payment_status === 'refunded' ? 'This sale has already been fully refunded.' : 'Only completed sales can be refunded.');
  }

  const [payment] = await db`SELECT * FROM pos_payments WHERE sale_id = ${input.saleId} AND business_id = ${input.businessId} ORDER BY created_at LIMIT 1`;
  const provider = payment?.provider ?? (saleRow.payment_method === 'cash' ? 'cash' : 'external_terminal');
  // Refuses (throws) for providers where VerifiedBizLink cannot or may not
  // return the money itself. Called before the transaction: no record of a
  // refund is written unless the refund path exists.
  const adapter = getPaymentAdapter(provider);

  let instructions: string | undefined;
  try {
    return await withTransaction(async (tx) => {
      const [sale] = await tx`SELECT * FROM pos_sales WHERE id = ${input.saleId} AND business_id = ${input.businessId} FOR UPDATE`;
      // Re-check the key under the lock: a concurrent retry of this same
      // request may have committed while we waited, and must get its result,
      // not "already refunded".
      const [raced] = await tx`SELECT * FROM pos_refunds WHERE business_id = ${input.businessId} AND idempotency_key = ${input.idempotencyKey}`;
      if (raced) return { refund: raced, sale, isDuplicate: true };
      if (!['completed', 'partially_refunded'].includes(sale.payment_status)) {
        throw new PosError(409, 'NOT_REFUNDABLE', 'This sale has already been fully refunded.');
      }
      const items = await tx`SELECT * FROM pos_sale_items WHERE sale_id = ${input.saleId} ORDER BY id FOR UPDATE`;
      const byId = new Map(items.map((it) => [String(it.id), it]));

      const requested = input.items && input.items.length
        ? input.items
        : items.map((it) => ({ saleItemId: String(it.id), quantity: Number(it.quantity) - Number(it.refunded_quantity) })).filter((r) => r.quantity > 0);
      if (requested.length === 0) throw new PosError(409, 'NOTHING_TO_REFUND', 'Nothing left to refund on this sale.');

      const lines: { item: DbRow; quantity: number; amount: number }[] = [];
      for (const r of requested) {
        const item = byId.get(String(r.saleItemId));
        if (!item) throw new PosError(404, 'SALE_ITEM_NOT_FOUND', 'A refunded line is not on this sale.');
        const q = Number(r.quantity);
        const remaining = Number(item.quantity) - Number(item.refunded_quantity);
        if (!Number.isFinite(q) || q <= 0 || quantityToHundredths(q) > quantityToHundredths(remaining)) {
          throw new PosError(400, 'BAD_REFUND_QUANTITY', `Cannot refund ${q} of "${item.product_name}" — ${remaining} left to refund.`);
        }
        const already = Number(item.refunded_quantity);
        const total = Number(item.total_cents);
        const qty = Number(item.quantity);
        const amount = proportionalCents(total, already + q, qty) - proportionalCents(total, already, qty);
        lines.push({ item, quantity: q, amount });
      }

      const amountCents = lines.reduce((a, l) => a + l.amount, 0);
      const alreadyRefunded = Number(sale.refunded_cents);
      const saleTotal = Number(sale.total_cents);
      if (amountCents <= 0) throw new PosError(400, 'ZERO_REFUND', 'The refund comes to R0.00.');
      if (alreadyRefunded + amountCents > saleTotal) throw new PosError(409, 'OVER_REFUND', 'Refund exceeds what was paid.');

      const feeIsBillable = ['accrued', 'billed', 'collected'].includes(String(sale.fee_status));
      const feeReversal = !feeIsBillable ? 0 : feeReversalFor({
        saleTotalCents: saleTotal,
        saleFeeCents: Number(sale.platform_fee_cents),
        alreadyRefundedCents: alreadyRefunded,
        alreadyReversedFeeCents: Number(sale.fee_reversed_cents),
        refundCents: amountCents,
      });

      const providerResult = await adapter.refund({
        saleId: input.saleId, businessId: input.businessId, paymentId: String(payment?.id ?? ''),
        amountCents, reason, actorUserId: input.actorUserId,
      });
      if (!providerResult.success) throw new PosError(402, 'REFUND_FAILED', providerResult.errorMessage || 'The refund was not processed.');
      instructions = providerResult.instructions;

      const [refund] = await tx`
        INSERT INTO pos_refunds (business_id, sale_id, amount_cents, fee_reversal_cents, reason, restocked, method, actor_user_id, idempotency_key)
        VALUES (${input.businessId}, ${input.saleId}, ${amountCents}, ${feeReversal}, ${reason}, ${input.restock}, ${sale.payment_method}, ${input.actorUserId}, ${input.idempotencyKey})
        RETURNING *
      `;

      for (const l of lines) {
        await tx`
          INSERT INTO pos_refund_items (refund_id, sale_item_id, quantity, amount_cents)
          VALUES (${refund.id}, ${l.item.id}, ${l.quantity}, ${l.amount})
        `;
        await tx`UPDATE pos_sale_items SET refunded_quantity = refunded_quantity + ${l.quantity} WHERE id = ${l.item.id}`;

        if (input.restock && l.item.product_id) {
          const [stock] = await tx`
            UPDATE pos_products SET stock_quantity = stock_quantity + ${l.quantity}, updated_at = NOW()
            WHERE id = ${l.item.product_id} AND business_id = ${input.businessId}
            RETURNING stock_quantity - ${l.quantity} AS previous_quantity, stock_quantity AS new_quantity
          `;
          if (stock) {
            await tx`
              INSERT INTO pos_inventory_logs (business_id, product_id, previous_quantity, new_quantity, change_quantity, reason, reference_id, notes, actor_user_id)
              VALUES (${input.businessId}, ${l.item.product_id}, ${stock.previous_quantity}, ${stock.new_quantity}, ${l.quantity},
                      'return_refund', ${refund.id}, ${`Returned on refund of receipt ${sale.receipt_number}`}, ${input.actorUserId})
            `;
          }
        }
      }

      const fullyRefunded = alreadyRefunded + amountCents === saleTotal;
      const [updatedSale] = await tx`
        UPDATE pos_sales
        SET refunded_cents = refunded_cents + ${amountCents},
            fee_reversed_cents = fee_reversed_cents + ${feeReversal},
            payment_status = ${fullyRefunded ? 'refunded' : 'partially_refunded'},
            updated_at = NOW()
        WHERE id = ${input.saleId}
        RETURNING *
      `;
      await tx`
        UPDATE pos_payments SET status = ${fullyRefunded ? 'refunded' : 'partially_refunded'}
        WHERE sale_id = ${input.saleId} AND business_id = ${input.businessId}
      `;

      await postJournal(tx, refundJournal({
        businessId: input.businessId, refundId: String(refund.id), saleId: input.saleId,
        receiptNumber: String(sale.receipt_number), method: String(sale.payment_method),
        amountCents, feeReversalCents: feeReversal,
      }));

      return { refund, sale: updatedSale, isDuplicate: false, instructions };
    });
  } catch (err) {
    if ((err as { code?: string })?.code === '23505') {
      const [again] = await db`SELECT * FROM pos_refunds WHERE business_id = ${input.businessId} AND idempotency_key = ${input.idempotencyKey} LIMIT 1`;
      if (again) {
        const [sale] = await db`SELECT * FROM pos_sales WHERE id = ${again.sale_id}`;
        return { refund: again, sale, isDuplicate: true };
      }
    }
    throw err;
  }
}
