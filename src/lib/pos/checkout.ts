import crypto from 'crypto';
import db, { withTransaction, type DbRow, type Sql } from '@/lib/db';
import { ensurePosSchema } from './schema';
import { resolveAdapterForMethod } from './payments';
import type { PaymentInitiateResponse, PaymentMethodType } from './payments/types';
import { calculatePlatformFee, resolveFeeRule } from './fees';
import { lineGrossCents, percentToBps, quantityToHundredths, vatInclusiveCents } from './money';
import { postJournal, saleJournal } from './ledger';
import { PosError, isUuid } from './errors';
import type { PosRole } from './auth-helper';

/**
 * The till checkout.
 *
 * The browser says WHAT is being bought (product ids, quantities, a requested
 * discount) and HOW it is paid. Everything that is money — unit prices, line
 * totals, VAT, the platform fee — is computed here from the database. A
 * client-sent price is never read.
 *
 * A sale and everything it touches (items, stock, payment, ledger) commit in
 * one transaction. Stock is decremented with a conditional UPDATE, so two
 * tills selling the last unit cannot both succeed. A sale is identified by a
 * per-business idempotency key, so a double tap, a retry after a dropped
 * connection, or an offline sale synced twice produces exactly one sale.
 */

export interface CheckoutLineInput {
  productId?: string | null;
  quantity: number;
  /** Discount the cashier is asking for on this line, in cents. */
  discountCents?: number;
  /** An item not in the catalogue (open price). Only if the merchant allows it. */
  custom?: { name: string; unitPriceCents: number } | null;
}

export interface CheckoutInput {
  businessId: string;
  actorUserId: string;
  actorRole: PosRole;
  tillId?: string | null;
  lines: CheckoutLineInput[];
  paymentMethod: PaymentMethodType;
  tenderAmountCents?: number;
  externalReference?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  idempotencyKey: string;
  offline?: { createdAt: string; clientTotalCents?: number } | null;
  devicePlatform?: 'android' | 'ios' | 'web';
}

export interface CheckoutResult {
  sale: DbRow;
  items: DbRow[];
  payment: DbRow | null;
  paymentResponse?: Pick<PaymentInitiateResponse, 'status' | 'changeAmountCents' | 'paymentActionUrl' | 'qrPayload' | 'deviceInstructions' | 'authCode' | 'cardBrand' | 'cardLast4'>;
  isDuplicate: boolean;
  stockConflicts: { productId: string; requested: number; available: number }[];
}

const MAX_LINES = 200;
const MAX_QTY = 100000;
const MAX_LINE_PRICE_CENTS = 100_000_00; // R100 000 per unit
const OFFLINE_MAX_AGE_MS = 30 * 24 * 3600_000;

class DuplicateSale extends Error {}

interface PricedLine {
  productId: string | null;
  name: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents: number;
  grossCents: number;
  discountCents: number;
  netCents: number;
  taxCents: number;
  isCustom: boolean;
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export function validateCheckoutInput(input: CheckoutInput) {
  if (!isUuid(input.businessId)) throw new PosError(400, 'BAD_BUSINESS', 'Invalid business.');
  if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 100) {
    throw new PosError(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotencyKey (8–100 characters) is required for every sale.');
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new PosError(400, 'EMPTY_BASKET', 'Basket is empty.');
  if (input.lines.length > MAX_LINES) throw new PosError(400, 'BASKET_TOO_LARGE', `A sale can have at most ${MAX_LINES} lines.`);
  for (const line of input.lines) {
    const q = Number(line.quantity);
    if (!Number.isFinite(q) || q <= 0 || q > MAX_QTY || Math.abs(quantityToHundredths(q) - q * 100) > 1e-6) {
      throw new PosError(400, 'BAD_QUANTITY', 'Quantities must be positive, with at most two decimal places.');
    }
    if (line.discountCents !== undefined && (!Number.isInteger(line.discountCents) || line.discountCents < 0)) {
      throw new PosError(400, 'BAD_DISCOUNT', 'Discounts must be whole, non-negative cents.');
    }
    if (line.custom) {
      const name = cleanText(line.custom.name, 120);
      const price = line.custom.unitPriceCents;
      if (!name || !Number.isInteger(price) || price <= 0 || price > MAX_LINE_PRICE_CENTS) {
        throw new PosError(400, 'BAD_CUSTOM_ITEM', 'A custom item needs a name and a price between R0.01 and R100 000.');
      }
    } else if (!isUuid(line.productId)) {
      throw new PosError(400, 'BAD_PRODUCT', 'Every line needs a valid product, or must be a custom item.');
    }
  }
  if (input.tillId !== undefined && input.tillId !== null && !isUuid(input.tillId)) {
    throw new PosError(400, 'BAD_TILL', 'Invalid till.');
  }
  if (input.offline) {
    if (input.paymentMethod !== 'cash') {
      throw new PosError(400, 'OFFLINE_NOT_CASH', 'Only cash sales can be recorded offline.');
    }
    const at = new Date(input.offline.createdAt).getTime();
    const now = Date.now();
    if (!Number.isFinite(at) || at > now + 5 * 60_000 || at < now - OFFLINE_MAX_AGE_MS) {
      throw new PosError(400, 'BAD_OFFLINE_TIME', 'The offline sale time is invalid or more than 30 days old.');
    }
  }
}

async function existingSale(sql: Sql, businessId: string, key: string): Promise<CheckoutResult | null> {
  const [sale] = await sql`SELECT * FROM pos_sales WHERE business_id = ${businessId} AND idempotency_key = ${key} LIMIT 1`;
  if (!sale) return null;
  const items = await sql`SELECT * FROM pos_sale_items WHERE sale_id = ${sale.id} ORDER BY id`;
  const [payment] = await sql`SELECT * FROM pos_payments WHERE sale_id = ${sale.id} ORDER BY created_at LIMIT 1`;
  return { sale, items, payment: payment ?? null, isDuplicate: true, stockConflicts: [] };
}

async function nextNumber(tx: Sql, businessId: string, kind: string): Promise<number> {
  const [row] = await tx`
    INSERT INTO pos_counters (business_id, kind, last_number) VALUES (${businessId}, ${kind}, 1)
    ON CONFLICT (business_id, kind) DO UPDATE SET last_number = pos_counters.last_number + 1
    RETURNING last_number
  `;
  return Number(row.last_number);
}

export function formatReceiptNumber(n: number): string {
  return `VBL-${String(n).padStart(6, '0')}`;
}

/**
 * Takes stock for a completed sale. Normal sales refuse to oversell. Offline
 * and already-paid sales (the money is in hand) take what there is, never
 * going below zero, and record the shortfall for the owner to review.
 */
async function takeStock(
  tx: Sql,
  p: { businessId: string; saleId: string; receiptNumber: string; actorUserId: string | null; lines: PricedLine[]; allowShortfall: boolean },
) {
  const perProduct = new Map<string, number>();
  for (const l of p.lines) {
    if (!l.productId) continue;
    perProduct.set(l.productId, (perProduct.get(l.productId) ?? 0) + quantityToHundredths(l.quantity));
  }
  const conflicts: CheckoutResult['stockConflicts'] = [];
  // Fixed order so concurrent sales of the same products lock rows in the same sequence.
  for (const productId of [...perProduct.keys()].sort()) {
    const qty = perProduct.get(productId)! / 100;
    const [taken] = await tx`
      UPDATE pos_products
      SET stock_quantity = stock_quantity - ${qty}, updated_at = NOW()
      WHERE id = ${productId} AND business_id = ${p.businessId} AND stock_quantity >= ${qty}
      RETURNING stock_quantity + ${qty} AS previous_quantity, stock_quantity AS new_quantity
    `;
    let prev: number;
    let next: number;
    let change: number;
    if (taken) {
      prev = Number(taken.previous_quantity);
      next = Number(taken.new_quantity);
      change = -qty;
    } else {
      const [cur] = await tx`
        SELECT stock_quantity FROM pos_products WHERE id = ${productId} AND business_id = ${p.businessId} FOR UPDATE
      `;
      const available = Number(cur?.stock_quantity ?? 0);
      if (!p.allowShortfall) {
        throw new PosError(409, 'INSUFFICIENT_STOCK', 'Not enough stock for one of the items.', { productId, requested: qty, available });
      }
      await tx`UPDATE pos_products SET stock_quantity = 0, updated_at = NOW() WHERE id = ${productId} AND business_id = ${p.businessId}`;
      await tx`
        INSERT INTO pos_stock_conflicts (business_id, sale_id, product_id, requested_qty, available_qty)
        VALUES (${p.businessId}, ${p.saleId}, ${productId}, ${qty}, ${available})
      `;
      conflicts.push({ productId, requested: qty, available });
      prev = available;
      next = 0;
      change = -available;
    }
    await tx`
      INSERT INTO pos_inventory_logs (business_id, product_id, previous_quantity, new_quantity, change_quantity, reason, reference_id, notes, actor_user_id)
      VALUES (${p.businessId}, ${productId}, ${prev}, ${next}, ${change}, 'sale', ${p.saleId},
              ${`Sold on receipt ${p.receiptNumber}${change !== -qty ? ` (short by ${qty + change})` : ''}`}, ${p.actorUserId})
    `;
  }
  return conflicts;
}

export async function processPosSale(input: CheckoutInput): Promise<CheckoutResult> {
  await ensurePosSchema();
  validateCheckoutInput(input);

  const dup = await existingSale(db, input.businessId, input.idempotencyKey);
  if (dup) return dup;

  // Context: merchant settings, plan and fee rule.
  const [settings] = await db`SELECT * FROM pos_settings WHERE business_id = ${input.businessId} LIMIT 1`;
  const vatRegistered = Boolean(settings?.vat_registered);
  const defaultTaxBps = percentToBps(settings?.tax_rate_percent ?? 15);
  const allowCustom = settings ? settings.allow_custom_items !== false : true;
  const maxCashierDiscountBps = Number(settings?.max_cashier_discount_bps ?? 1000);
  const [sub] = await db`SELECT plan_key FROM pos_merchant_subscriptions WHERE business_id = ${input.businessId} LIMIT 1`;

  if (input.tillId) {
    const [till] = await db`SELECT id FROM pos_tills WHERE id = ${input.tillId} AND business_id = ${input.businessId} LIMIT 1`;
    if (!till) throw new PosError(404, 'TILL_NOT_FOUND', 'Till not found.');
  }

  // Price every line from the database.
  const productIds = [...new Set(input.lines.filter((l) => !l.custom).map((l) => String(l.productId)))];
  const products = productIds.length
    ? await db`
        SELECT id, name, selling_price_cents, cost_price_cents, tax_rate_percent, is_active
        FROM pos_products WHERE business_id = ${input.businessId} AND id = ANY(${productIds}::uuid[])
      `
    : [];
  const byId = new Map(products.map((p) => [String(p.id), p]));

  const priced: PricedLine[] = input.lines.map((line) => {
    const quantity = Number(line.quantity);
    if (line.custom) {
      if (!allowCustom) throw new PosError(403, 'CUSTOM_ITEMS_DISABLED', 'Custom items are switched off for this store.');
      const unit = line.custom.unitPriceCents;
      const gross = lineGrossCents(unit, quantity);
      const discount = Math.min(line.discountCents ?? 0, gross);
      const net = gross - discount;
      return {
        productId: null, name: cleanText(line.custom.name, 120)!, quantity, unitPriceCents: unit, costPriceCents: 0,
        grossCents: gross, discountCents: discount, netCents: net,
        taxCents: vatRegistered ? vatInclusiveCents(net, defaultTaxBps) : 0, isCustom: true,
      };
    }
    const p = byId.get(String(line.productId));
    // A product from another business is indistinguishable from a missing one.
    if (!p) throw new PosError(404, 'PRODUCT_NOT_FOUND', 'One of the products is not in this store’s catalogue.');
    if (!p.is_active) throw new PosError(409, 'PRODUCT_INACTIVE', `"${p.name}" is no longer on sale.`);
    const unit = Number(p.selling_price_cents);
    const gross = lineGrossCents(unit, quantity);
    if ((line.discountCents ?? 0) > gross) throw new PosError(400, 'DISCOUNT_TOO_LARGE', 'A discount cannot exceed the line total.');
    const discount = line.discountCents ?? 0;
    const net = gross - discount;
    return {
      productId: String(p.id), name: String(p.name), quantity, unitPriceCents: unit, costPriceCents: Number(p.cost_price_cents),
      grossCents: gross, discountCents: discount, netCents: net,
      taxCents: vatRegistered ? vatInclusiveCents(net, percentToBps(p.tax_rate_percent)) : 0, isCustom: false,
    };
  });

  const subtotalCents = priced.reduce((a, l) => a + l.grossCents, 0);
  const discountCents = priced.reduce((a, l) => a + l.discountCents, 0);
  const totalCents = subtotalCents - discountCents;
  const taxCents = priced.reduce((a, l) => a + l.taxCents, 0);
  if (totalCents <= 0) throw new PosError(400, 'ZERO_TOTAL', 'A sale must be worth more than R0.00.');

  // Discount authority.
  if (discountCents > 0 && input.actorRole === 'cashier') {
    if (discountCents * 10000 > subtotalCents * maxCashierDiscountBps) {
      throw new PosError(403, 'DISCOUNT_NOT_AUTHORISED', `Discounts above ${(maxCashierDiscountBps / 100).toFixed(0)}% need a manager.`);
    }
  }

  // Platform fee, from the dated rule in force now.
  const rule = await resolveFeeRule(input.businessId, sub?.plan_key ?? null, new Date());
  const fee = calculatePlatformFee(totalCents, rule);

  // Payment. Throws if the method is unavailable here — never falls back.
  const adapter = resolveAdapterForMethod(input.paymentMethod, {
    isAndroid: input.devicePlatform === 'android',
    isIos: input.devicePlatform === 'ios',
  });
  const saleId = crypto.randomUUID();
  const pay = await adapter.initiate({
    saleId,
    businessId: input.businessId,
    amountCents: totalCents,
    currency: 'ZAR',
    method: input.paymentMethod,
    tenderAmountCents: input.paymentMethod === 'cash' ? (input.tenderAmountCents ?? totalCents) : undefined,
    externalReference: input.externalReference,
    idempotencyKey: input.idempotencyKey,
    customerDetails: { name: input.customerName, phone: input.customerPhone, email: input.customerEmail },
  });
  if (pay.status === 'declined' || pay.status === 'failed' || !pay.success) {
    throw new PosError(402, 'PAYMENT_DECLINED', pay.errorMessage || 'The payment was not approved.');
  }
  const completed = pay.status === 'approved';
  const paymentStatus = completed ? 'completed' : 'pending';

  const reviewReasons: string[] = [];
  if (input.offline?.clientTotalCents !== undefined && input.offline.clientTotalCents !== totalCents) {
    reviewReasons.push(`offline_price_mismatch: till showed ${input.offline.clientTotalCents}c, catalogue price ${totalCents}c`);
  }

  try {
    return await withTransaction(async (tx) => {
      const receiptNumber = formatReceiptNumber(await nextNumber(tx, input.businessId, 'receipt'));
      const [sale] = await tx`
        INSERT INTO pos_sales (
          id, business_id, till_id, cashier_id, receipt_number, subtotal_cents, tax_cents, discount_cents,
          total_cents, platform_fee_cents, merchant_net_cents, fee_rate_bps, fee_rule_id, fee_status,
          vat_registered, payment_method, payment_status, payment_reference, customer_name, customer_phone,
          customer_email, notes, idempotency_key, is_offline_sync, offline_created_at, review_reason, completed_at
        ) VALUES (
          ${saleId}, ${input.businessId}, ${input.tillId ?? null}, ${input.actorUserId}, ${receiptNumber},
          ${subtotalCents}, ${taxCents}, ${discountCents}, ${totalCents}, ${fee.feeCents}, ${totalCents - fee.feeCents},
          ${fee.rateBps}, ${fee.ruleId}, ${completed && fee.feeCents > 0 ? 'accrued' : 'none'},
          ${vatRegistered}, ${input.paymentMethod}, ${paymentStatus}, ${cleanText(input.externalReference, 64)},
          ${cleanText(input.customerName, 120)}, ${cleanText(input.customerPhone, 30)}, ${cleanText(input.customerEmail, 160)},
          ${cleanText(input.notes, 500)}, ${input.idempotencyKey}, ${Boolean(input.offline)},
          ${input.offline ? new Date(input.offline.createdAt).toISOString() : null},
          ${reviewReasons.length ? reviewReasons.join('; ') : null}, ${completed ? new Date().toISOString() : null}
        )
        ON CONFLICT (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING *
      `;
      if (!sale) throw new DuplicateSale();

      const items: DbRow[] = [];
      for (const l of priced) {
        const [item] = await tx`
          INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price_cents, cost_price_cents, total_cents, discount_cents, is_custom)
          VALUES (${saleId}, ${l.productId}, ${l.name}, ${l.quantity}, ${l.unitPriceCents}, ${l.costPriceCents}, ${l.netCents}, ${l.discountCents}, ${l.isCustom})
          RETURNING *
        `;
        items.push(item);
      }

      let stockConflicts: CheckoutResult['stockConflicts'] = [];
      if (completed) {
        stockConflicts = await takeStock(tx, {
          businessId: input.businessId, saleId, receiptNumber, actorUserId: input.actorUserId, lines: priced,
          allowShortfall: Boolean(input.offline),
        });
        if (stockConflicts.length) {
          const note = `stock_shortfall on ${stockConflicts.length} product(s)`;
          await tx`UPDATE pos_sales SET review_reason = COALESCE(review_reason || '; ', '') || ${note} WHERE id = ${saleId}`;
          sale.review_reason = sale.review_reason ? `${sale.review_reason}; ${note}` : note;
        }
      }

      const [payment] = await tx`
        INSERT INTO pos_payments (
          sale_id, business_id, method, amount_cents, tender_amount_cents, change_amount_cents,
          card_last4, card_brand, provider, provider_tx_id, auth_code, status, raw_meta
        ) VALUES (
          ${saleId}, ${input.businessId}, ${input.paymentMethod}, ${totalCents},
          ${input.paymentMethod === 'cash' ? (input.tenderAmountCents ?? totalCents) : null},
          ${pay.changeAmountCents ?? 0}, ${pay.cardLast4 ?? null}, ${pay.cardBrand ?? null}, ${pay.provider},
          ${pay.providerTxId ?? null}, ${pay.authCode ?? null}, ${completed ? 'approved' : 'pending'},
          ${JSON.stringify(pay.rawResponse ?? {})}
        )
        RETURNING *
      `;

      if (completed) {
        await postJournal(tx, saleJournal({
          businessId: input.businessId, saleId, receiptNumber, method: input.paymentMethod,
          totalCents, feeCents: fee.feeCents, feeRateBps: fee.rateBps,
        }));
      }

      return {
        sale,
        items,
        payment,
        paymentResponse: {
          status: pay.status,
          changeAmountCents: pay.changeAmountCents,
          paymentActionUrl: pay.paymentActionUrl,
          qrPayload: pay.qrPayload,
          deviceInstructions: pay.deviceInstructions,
          authCode: pay.authCode,
          cardBrand: pay.cardBrand,
          cardLast4: pay.cardLast4,
        },
        isDuplicate: false,
        stockConflicts,
      };
    });
  } catch (err) {
    if (err instanceof DuplicateSale) {
      const existing = await existingSale(db, input.businessId, input.idempotencyKey);
      if (existing) return existing;
    }
    // A unique violation on the idempotency index from a race we lost.
    if ((err as { code?: string })?.code === '23505') {
      const existing = await existingSale(db, input.businessId, input.idempotencyKey);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Completes a sale that was waiting on an electronic payment, from a
 * verified provider notification. Idempotent: the status change is
 * conditional, so a re-delivered notification does nothing.
 *
 * Returns 'completed', 'already_completed', or a mismatch reason.
 */
export async function completePendingSale(p: {
  businessId: string;
  saleId: string;
  paidCents: number;
  providerReference: string;
}): Promise<{ outcome: 'completed' | 'already_completed' | 'not_found' | 'amount_mismatch'; sale?: DbRow }> {
  await ensurePosSchema();
  const [sale] = await db`SELECT * FROM pos_sales WHERE id = ${p.saleId} AND business_id = ${p.businessId} LIMIT 1`;
  if (!sale) return { outcome: 'not_found' };
  if (sale.payment_status !== 'pending') return { outcome: 'already_completed', sale };
  if (p.paidCents !== Number(sale.total_cents)) return { outcome: 'amount_mismatch', sale };

  return withTransaction(async (tx) => {
    const [updated] = await tx`
      UPDATE pos_sales
      SET payment_status = 'completed', completed_at = NOW(), updated_at = NOW(),
          fee_status = CASE WHEN platform_fee_cents > 0 THEN 'accrued' ELSE 'none' END,
          payment_reference = ${p.providerReference}
      WHERE id = ${p.saleId} AND business_id = ${p.businessId} AND payment_status = 'pending'
      RETURNING *
    `;
    if (!updated) return { outcome: 'already_completed' as const, sale };

    await tx`
      UPDATE pos_payments SET status = 'approved', provider_tx_id = ${p.providerReference}, auth_code = ${p.providerReference}
      WHERE sale_id = ${p.saleId} AND business_id = ${p.businessId}
    `;
    const items = await tx`SELECT * FROM pos_sale_items WHERE sale_id = ${p.saleId}`;
    const lines: PricedLine[] = items.map((it) => ({
      productId: it.product_id ? String(it.product_id) : null, name: String(it.product_name), quantity: Number(it.quantity),
      unitPriceCents: 0, costPriceCents: 0, grossCents: 0, discountCents: 0, netCents: 0, taxCents: 0, isCustom: Boolean(it.is_custom),
    }));
    // The customer has paid, so a shortfall is recorded rather than refused.
    const conflicts = await takeStock(tx, {
      businessId: p.businessId, saleId: p.saleId, receiptNumber: String(updated.receipt_number),
      actorUserId: updated.cashier_id ? String(updated.cashier_id) : null, lines, allowShortfall: true,
    });
    if (conflicts.length) {
      await tx`UPDATE pos_sales SET review_reason = COALESCE(review_reason || '; ', '') || 'stock_shortfall after online payment' WHERE id = ${p.saleId}`;
    }
    await postJournal(tx, saleJournal({
      businessId: p.businessId, saleId: p.saleId, receiptNumber: String(updated.receipt_number),
      method: String(updated.payment_method), totalCents: Number(updated.total_cents),
      feeCents: Number(updated.platform_fee_cents), feeRateBps: Number(updated.fee_rate_bps ?? 0),
    }));
    return { outcome: 'completed' as const, sale: updated };
  });
}

/** Marks a pending electronic sale failed/cancelled. Never touches a completed sale. */
export async function failPendingSale(businessId: string, saleId: string, status: 'failed' | 'cancelled') {
  await ensurePosSchema();
  await db`
    UPDATE pos_sales SET payment_status = ${status}, updated_at = NOW()
    WHERE id = ${saleId} AND business_id = ${businessId} AND payment_status = 'pending'
  `;
  await db`UPDATE pos_payments SET status = 'declined' WHERE sale_id = ${saleId} AND business_id = ${businessId} AND status = 'pending'`;
}
