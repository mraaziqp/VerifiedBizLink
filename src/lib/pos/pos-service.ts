import db, { withTransaction, type DbRow, type Sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { ensurePosSchema } from './schema';
import { PosError, isUuid } from './errors';
import { logPosAudit } from './audit';

/**
 * Merchant-side POS operations other than checkout and refunds
 * (see checkout.ts / refunds.ts) and billing (see pos-billing.ts).
 *
 * Every function takes the caller's businessId, which comes from the
 * authenticated session (requirePosAccess), and every query is scoped by it.
 * Any id from the request that points at another business is treated
 * exactly like an id that does not exist.
 */

const text = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
};
const intCents = (v: unknown, field: string, { min = 0, max = 1_000_000_000 } = {}): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new PosError(400, 'BAD_AMOUNT', `${field} must be a whole number of cents between ${min} and ${max}.`);
  return n;
};
const qty = (v: unknown, field: string, { allowZero = true, allowNegative = false } = {}): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(Math.round(n * 100) - n * 100) > 1e-6 || Math.abs(n) > 10_000_000) {
    throw new PosError(400, 'BAD_QUANTITY', `${field} must be a number with at most two decimals.`);
  }
  if (!allowNegative && n < 0) throw new PosError(400, 'BAD_QUANTITY', `${field} cannot be negative.`);
  if (!allowZero && n === 0) throw new PosError(400, 'BAD_QUANTITY', `${field} cannot be zero.`);
  return n;
};

async function nextNumber(tx: Sql, businessId: string, kind: string): Promise<number> {
  const [row] = await tx`
    INSERT INTO pos_counters (business_id, kind, last_number) VALUES (${businessId}, ${kind}, 1)
    ON CONFLICT (business_id, kind) DO UPDATE SET last_number = pos_counters.last_number + 1
    RETURNING last_number
  `;
  return Number(row.last_number);
}

async function planLimits(businessId: string): Promise<{ maxTills: number; maxStaff: number; planKey: string | null }> {
  const [row] = await db`
    SELECT s.plan_key, p.max_tills, p.max_staff
    FROM pos_merchant_subscriptions s JOIN pos_subscription_plans p ON p.plan_key = s.plan_key
    WHERE s.business_id = ${businessId} LIMIT 1
  `;
  return { maxTills: Number(row?.max_tills ?? 1), maxStaff: Number(row?.max_staff ?? 2), planKey: row?.plan_key ?? null };
}

// ==========================================
// 1. Settings & Tills
// ==========================================

export async function getPosSettings(businessId: string) {
  await ensurePosSchema();
  const [row] = await db`SELECT * FROM pos_settings WHERE business_id = ${businessId} LIMIT 1`;
  if (row) return row;
  await db`INSERT INTO pos_settings (business_id) VALUES (${businessId}) ON CONFLICT (business_id) DO NOTHING`;
  return (await db`SELECT * FROM pos_settings WHERE business_id = ${businessId} LIMIT 1`)[0];
}

export async function updatePosSettings(businessId: string, updates: Record<string, unknown>) {
  await ensurePosSchema();
  await getPosSettings(businessId);

  const bool = (k: string) => (k in updates ? Boolean(updates[k]) : null);
  let taxRate: number | null = null;
  if ('tax_rate_percent' in updates) {
    taxRate = Number(updates.tax_rate_percent);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) throw new PosError(400, 'BAD_TAX_RATE', 'VAT rate must be between 0% and 30%.');
  }
  let maxDiscountBps: number | null = null;
  if ('max_cashier_discount_bps' in updates) {
    maxDiscountBps = Number(updates.max_cashier_discount_bps);
    if (!Number.isInteger(maxDiscountBps) || maxDiscountBps < 0 || maxDiscountBps > 10000) throw new PosError(400, 'BAD_DISCOUNT_LIMIT', 'Cashier discount limit must be 0–100%.');
  }
  let floatRand: number | null = null;
  if ('cash_drawer_float_rand' in updates) {
    floatRand = Number(updates.cash_drawer_float_rand);
    if (!Number.isFinite(floatRand) || floatRand < 0 || floatRand > 1_000_000) throw new PosError(400, 'BAD_FLOAT', 'Invalid cash float.');
  }
  const vatNumber = 'vat_number' in updates ? (text(updates.vat_number, 20) ?? '') : null;
  const vatRegistered = bool('vat_registered');
  if (vatRegistered === true) {
    const current = (await getPosSettings(businessId)) as DbRow;
    const effectiveVat = vatNumber ?? current.vat_number ?? '';
    if (!/^4\d{9}$/.test(String(effectiveVat).replace(/\s/g, ''))) {
      throw new PosError(400, 'VAT_NUMBER_REQUIRED', 'A VAT-registered business needs a valid 10-digit SARS VAT number starting with 4.');
    }
  }

  await db`
    UPDATE pos_settings SET
      tax_rate_percent = COALESCE(${taxRate}, tax_rate_percent),
      vat_number = COALESCE(${vatNumber}, vat_number),
      vat_registered = COALESCE(${vatRegistered}, vat_registered),
      receipt_header = COALESCE(${'receipt_header' in updates ? (text(updates.receipt_header, 200) ?? '') : null}, receipt_header),
      receipt_footer = COALESCE(${'receipt_footer' in updates ? (text(updates.receipt_footer, 200) ?? '') : null}, receipt_footer),
      phone = COALESCE(${'phone' in updates ? (text(updates.phone, 30) ?? '') : null}, phone),
      email = COALESCE(${'email' in updates ? (text(updates.email, 160) ?? '') : null}, email),
      address = COALESCE(${'address' in updates ? (text(updates.address, 300) ?? '') : null}, address),
      auto_print_receipt = COALESCE(${bool('auto_print_receipt')}, auto_print_receipt),
      allow_offline_sales = COALESCE(${bool('allow_offline_sales')}, allow_offline_sales),
      allow_custom_items = COALESCE(${bool('allow_custom_items')}, allow_custom_items),
      max_cashier_discount_bps = COALESCE(${maxDiscountBps}, max_cashier_discount_bps),
      cash_drawer_float_rand = COALESCE(${floatRand}, cash_drawer_float_rand),
      updated_at = NOW()
    WHERE business_id = ${businessId}
  `;
  return getPosSettings(businessId);
}

export async function getTills(businessId: string) {
  await ensurePosSchema();
  let tills = await db`SELECT * FROM pos_tills WHERE business_id = ${businessId} ORDER BY till_number ASC`;
  if (tills.length === 0) {
    await db`
      INSERT INTO pos_tills (business_id, till_number, name, status)
      VALUES (${businessId}, 1, 'Main Counter Till', 'closed')
      ON CONFLICT (business_id, till_number) DO NOTHING
    `;
    tills = await db`SELECT * FROM pos_tills WHERE business_id = ${businessId} ORDER BY till_number ASC`;
  }
  return tills;
}

export async function createTill(businessId: string, name: string) {
  await ensurePosSchema();
  const { maxTills } = await planLimits(businessId);
  return withTransaction(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`pos_tills:${businessId}`}))`;
    const [{ n }] = await tx`SELECT COUNT(*)::int AS n FROM pos_tills WHERE business_id = ${businessId}`;
    if (Number(n) >= maxTills) throw new PosError(403, 'TILL_LIMIT', `Your plan allows ${maxTills} till${maxTills === 1 ? '' : 's'}. Upgrade to add more.`);
    const [{ next }] = await tx`SELECT COALESCE(MAX(till_number), 0) + 1 AS next FROM pos_tills WHERE business_id = ${businessId}`;
    const [till] = await tx`
      INSERT INTO pos_tills (business_id, till_number, name, status)
      VALUES (${businessId}, ${next}, ${text(name, 60) ?? `Till ${next}`}, 'closed')
      RETURNING *
    `;
    return till;
  });
}

export async function openTill(tillId: string, businessId: string, userId: string, floatCents: number) {
  await ensurePosSchema();
  if (!isUuid(tillId)) throw new PosError(400, 'BAD_TILL', 'Invalid till.');
  const float = intCents(floatCents, 'Opening float', { max: 100_000_000 });
  const [updated] = await db`
    UPDATE pos_tills SET status = 'open', assigned_user_id = ${userId}, current_float_cents = ${float},
      last_opened_at = NOW(), updated_at = NOW()
    WHERE id = ${tillId} AND business_id = ${businessId}
    RETURNING *
  `;
  if (!updated) throw new PosError(404, 'TILL_NOT_FOUND', 'Till not found.');
  return updated;
}

export async function closeTill(tillId: string, businessId: string, closingCashCents: number) {
  await ensurePosSchema();
  if (!isUuid(tillId)) throw new PosError(400, 'BAD_TILL', 'Invalid till.');
  const closing = intCents(closingCashCents, 'Closing cash', { max: 100_000_000 });
  const [till] = await db`SELECT * FROM pos_tills WHERE id = ${tillId} AND business_id = ${businessId}`;
  if (!till) throw new PosError(404, 'TILL_NOT_FOUND', 'Till not found.');
  // Expected cash = float + cash sales − cash refunds since the till opened.
  const [cash] = await db`
    SELECT
      COALESCE((SELECT SUM(total_cents) FROM pos_sales WHERE business_id = ${businessId} AND till_id = ${tillId}
                AND payment_method = 'cash' AND completed_at >= ${till.last_opened_at}), 0) AS sales,
      COALESCE((SELECT SUM(r.amount_cents) FROM pos_refunds r JOIN pos_sales s ON s.id = r.sale_id
                WHERE r.business_id = ${businessId} AND s.till_id = ${tillId} AND r.method = 'cash'
                AND r.created_at >= ${till.last_opened_at}), 0) AS refunds
  `;
  const expected = Number(till.current_float_cents) + Number(cash.sales) - Number(cash.refunds);
  const [updated] = await db`
    UPDATE pos_tills SET status = 'closed', current_float_cents = ${closing}, last_closed_at = NOW(), updated_at = NOW()
    WHERE id = ${tillId} AND business_id = ${businessId}
    RETURNING *
  `;
  return { till: updated, expectedCashCents: expected, countedCashCents: closing, varianceCents: closing - expected };
}

// ==========================================
// 2. Categories, Products & Inventory
// ==========================================

export async function getPosCategories(businessId: string) {
  await ensurePosSchema();
  return db`SELECT * FROM pos_categories WHERE business_id = ${businessId} ORDER BY sort_order ASC, name ASC`;
}

export async function createPosCategory(businessId: string, name: unknown, color: unknown = '#d97706') {
  await ensurePosSchema();
  const n = text(name, 60);
  if (!n) throw new PosError(400, 'NAME_REQUIRED', 'Category name is required.');
  const c = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#d97706';
  const [created] = await db`INSERT INTO pos_categories (business_id, name, color) VALUES (${businessId}, ${n}, ${c}) RETURNING *`;
  return created;
}

async function assertCategory(businessId: string, categoryId: unknown): Promise<string | null> {
  if (categoryId === undefined || categoryId === null || categoryId === '') return null;
  if (!isUuid(categoryId)) throw new PosError(400, 'BAD_CATEGORY', 'Invalid category.');
  const [cat] = await db`SELECT id FROM pos_categories WHERE id = ${categoryId} AND business_id = ${businessId}`;
  if (!cat) throw new PosError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  return categoryId;
}

export async function getPosProducts(businessId: string, query?: string, categoryId?: string) {
  await ensurePosSchema();
  const q = query ? `%${query.trim().toLowerCase().slice(0, 80)}%` : null;
  const cat = categoryId && categoryId !== 'all' && isUuid(categoryId) ? categoryId : null;
  return db`
    SELECT p.*, c.name AS category_name
    FROM pos_products p
    LEFT JOIN pos_categories c ON p.category_id = c.id AND c.business_id = p.business_id
    WHERE p.business_id = ${businessId}
      AND (${cat}::uuid IS NULL OR p.category_id = ${cat}::uuid)
      AND (${q}::text IS NULL OR LOWER(p.name) LIKE ${q} OR LOWER(COALESCE(p.barcode, '')) LIKE ${q} OR LOWER(COALESCE(p.sku, '')) LIKE ${q})
    ORDER BY p.name ASC
  `;
}

export const UNITS = ['item', 'kg', 'g', 'l', 'ml', 'pack', 'service'] as const;

export async function createPosProduct(businessId: string, data: Record<string, unknown>, actorUserId: string) {
  await ensurePosSchema();
  const name = text(data.name, 120);
  if (!name) throw new PosError(400, 'NAME_REQUIRED', 'Product name is required.');
  const selling = intCents(data.sellingPriceCents, 'Selling price', { max: 10_000_000 });
  const cost = intCents(data.costPriceCents ?? 0, 'Cost price', { max: 10_000_000 });
  const stock = qty(data.stockQuantity ?? 0, 'Opening stock');
  const minStock = qty(data.minStockThreshold ?? 5, 'Low-stock level');
  const unit = UNITS.includes(String(data.unit || 'item') as (typeof UNITS)[number]) ? String(data.unit || 'item') : 'item';
  const categoryId = await assertCategory(businessId, data.categoryId);
  const settings = await getPosSettings(businessId);
  const taxRate = data.taxRatePercent !== undefined ? Number(data.taxRatePercent) : Number(settings.tax_rate_percent ?? 15);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) throw new PosError(400, 'BAD_TAX_RATE', 'VAT rate must be between 0% and 30%.');

  return withTransaction(async (tx) => {
    const [product] = await tx`
      INSERT INTO pos_products (
        business_id, category_id, name, sku, barcode, description, image_url,
        cost_price_cents, selling_price_cents, tax_rate_percent, stock_quantity, min_stock_threshold, unit
      ) VALUES (
        ${businessId}, ${categoryId}, ${name}, ${text(data.sku, 60)}, ${text(data.barcode, 60)},
        ${text(data.description, 1000)}, ${text(data.imageUrl, 1000)}, ${cost}, ${selling}, ${taxRate},
        ${stock}, ${minStock}, ${unit}
      )
      RETURNING *
    `;
    if (stock > 0) {
      await tx`
        INSERT INTO pos_inventory_logs (business_id, product_id, previous_quantity, new_quantity, change_quantity, reason, notes, actor_user_id)
        VALUES (${businessId}, ${product.id}, 0, ${stock}, ${stock}, 'initial_count', 'Opening stock when the product was created', ${actorUserId})
      `;
    }
    return product;
  });
}

export async function updatePosProduct(businessId: string, productId: string, data: Record<string, unknown>) {
  await ensurePosSchema();
  if (!isUuid(productId)) throw new PosError(400, 'BAD_PRODUCT', 'Invalid product.');
  if ('stockQuantity' in data) throw new PosError(400, 'USE_STOCK_ADJUSTMENT', 'Change stock with a stock adjustment so it is logged.');
  const has = (k: string) => k in data;
  const categoryId = has('categoryId') ? await assertCategory(businessId, data.categoryId) : null;
  const name = has('name') ? text(data.name, 120) : null;
  if (has('name') && !name) throw new PosError(400, 'NAME_REQUIRED', 'Product name is required.');
  const selling = has('sellingPriceCents') ? intCents(data.sellingPriceCents, 'Selling price', { max: 10_000_000 }) : null;
  const cost = has('costPriceCents') && data.costPriceCents !== null ? intCents(data.costPriceCents, 'Cost price', { max: 10_000_000 }) : null;
  const minStock = has('minStockThreshold') && data.minStockThreshold !== null ? qty(data.minStockThreshold, 'Low-stock level') : null;
  const unit = has('unit') && UNITS.includes(String(data.unit) as (typeof UNITS)[number]) ? String(data.unit) : null;
  let taxRate: number | null = null;
  if (has('taxRatePercent')) {
    taxRate = Number(data.taxRatePercent);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) throw new PosError(400, 'BAD_TAX_RATE', 'VAT rate must be between 0% and 30%.');
  }

  const [updated] = await db`
    UPDATE pos_products SET
      name = COALESCE(${name}, name),
      category_id = CASE WHEN ${has('categoryId')} THEN ${categoryId}::uuid ELSE category_id END,
      sku = CASE WHEN ${has('sku')} THEN ${text(data.sku, 60)} ELSE sku END,
      barcode = CASE WHEN ${has('barcode')} THEN ${text(data.barcode, 60)} ELSE barcode END,
      description = CASE WHEN ${has('description')} THEN ${text(data.description, 1000)} ELSE description END,
      image_url = CASE WHEN ${has('imageUrl')} THEN ${text(data.imageUrl, 1000)} ELSE image_url END,
      cost_price_cents = COALESCE(${cost}, cost_price_cents),
      selling_price_cents = COALESCE(${selling}, selling_price_cents),
      tax_rate_percent = COALESCE(${taxRate}, tax_rate_percent),
      min_stock_threshold = COALESCE(${minStock}, min_stock_threshold),
      unit = COALESCE(${unit}, unit),
      is_active = COALESCE(${has('isActive') ? Boolean(data.isActive) : null}, is_active),
      updated_at = NOW()
    WHERE id = ${productId} AND business_id = ${businessId}
    RETURNING *
  `;
  if (!updated) throw new PosError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  return updated;
}

export const STOCK_REASONS = ['manual_adjustment', 'stock_count', 'waste_damaged', 'lost_stolen', 'customer_return', 'transfer_in', 'transfer_out', 'purchase_receive'] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

/**
 * Changes stock by `change` (or, for a stock count, to `setTo`) in one
 * atomic statement with its audit record. Stock never goes below zero.
 */
export async function adjustPosStock(
  businessId: string,
  productId: string,
  params: { change?: number; setTo?: number; reason: string; notes?: string | null },
  actorUserId: string,
) {
  await ensurePosSchema();
  if (!isUuid(productId)) throw new PosError(400, 'BAD_PRODUCT', 'Invalid product.');
  const reason = STOCK_REASONS.includes(params.reason as StockReason) ? params.reason : null;
  if (!reason) throw new PosError(400, 'BAD_REASON', `Reason must be one of: ${STOCK_REASONS.join(', ')}.`);
  const notes = text(params.notes, 300);
  if (['waste_damaged', 'lost_stolen', 'manual_adjustment'].includes(reason) && !notes && (params.change ?? 0) < 0) {
    throw new PosError(400, 'NOTES_REQUIRED', 'Say why stock is being written off.');
  }

  return withTransaction(async (tx) => {
    const [cur] = await tx`SELECT stock_quantity FROM pos_products WHERE id = ${productId} AND business_id = ${businessId} FOR UPDATE`;
    if (!cur) throw new PosError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    const prev = Number(cur.stock_quantity);
    let change: number;
    if (params.setTo !== undefined && params.setTo !== null) {
      const target = qty(params.setTo, 'Counted quantity');
      change = Math.round((target - prev) * 100) / 100;
    } else {
      change = qty(params.change, 'Change', { allowZero: false, allowNegative: true });
    }
    const next = Math.round((prev + change) * 100) / 100;
    if (next < 0) throw new PosError(409, 'NEGATIVE_STOCK', `Only ${prev} in stock — cannot remove ${-change}.`);
    const [updated] = await tx`
      UPDATE pos_products SET stock_quantity = ${next}, updated_at = NOW()
      WHERE id = ${productId} AND business_id = ${businessId} RETURNING *
    `;
    await tx`
      INSERT INTO pos_inventory_logs (business_id, product_id, previous_quantity, new_quantity, change_quantity, reason, notes, actor_user_id)
      VALUES (${businessId}, ${productId}, ${prev}, ${next}, ${change}, ${reason}, ${notes}, ${actorUserId})
    `;
    return updated;
  });
}

export async function getPosInventoryLogs(businessId: string, productId?: string, limit = 50) {
  await ensurePosSchema();
  const pid = productId && isUuid(productId) ? productId : null;
  return db`
    SELECT l.*, p.name AS product_name, u.full_name AS actor_name
    FROM pos_inventory_logs l
    JOIN pos_products p ON l.product_id = p.id
    LEFT JOIN users u ON l.actor_user_id = u.id
    WHERE l.business_id = ${businessId} AND (${pid}::uuid IS NULL OR l.product_id = ${pid}::uuid)
    ORDER BY l.created_at DESC
    LIMIT ${Math.min(Math.max(1, limit), 500)}
  `;
}

export async function getInventorySummary(businessId: string) {
  await ensurePosSchema();
  const [summary] = await db`
    SELECT
      COUNT(*) FILTER (WHERE is_active) AS active_products,
      COALESCE(SUM(stock_quantity) FILTER (WHERE is_active), 0) AS units_in_stock,
      COALESCE(SUM(ROUND(stock_quantity * cost_price_cents)) FILTER (WHERE is_active), 0) AS cost_value_cents,
      COALESCE(SUM(ROUND(stock_quantity * selling_price_cents)) FILTER (WHERE is_active), 0) AS retail_value_cents,
      COUNT(*) FILTER (WHERE is_active AND stock_quantity > 0 AND stock_quantity <= min_stock_threshold) AS low_stock,
      COUNT(*) FILTER (WHERE is_active AND stock_quantity <= 0) AS out_of_stock
    FROM pos_products WHERE business_id = ${businessId}
  `;
  const [conflicts] = await db`SELECT COUNT(*)::int AS n FROM pos_stock_conflicts WHERE business_id = ${businessId} AND resolved_at IS NULL`;
  const slowMovers = await db`
    SELECT p.id, p.name, p.stock_quantity
    FROM pos_products p
    WHERE p.business_id = ${businessId} AND p.is_active AND p.stock_quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM pos_sale_items si JOIN pos_sales s ON s.id = si.sale_id
        WHERE si.product_id = p.id AND s.business_id = ${businessId} AND s.completed_at > NOW() - INTERVAL '30 days'
      )
    ORDER BY p.stock_quantity DESC LIMIT 10
  `;
  return { ...summary, open_stock_conflicts: conflicts.n, slow_movers: slowMovers };
}

export async function getStockConflicts(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT c.*, p.name AS product_name, s.receipt_number
    FROM pos_stock_conflicts c
    LEFT JOIN pos_products p ON p.id = c.product_id
    JOIN pos_sales s ON s.id = c.sale_id
    WHERE c.business_id = ${businessId} AND c.resolved_at IS NULL
    ORDER BY c.created_at DESC
  `;
}

export async function resolveStockConflict(businessId: string, conflictId: string, actorUserId: string) {
  await ensurePosSchema();
  if (!isUuid(conflictId)) throw new PosError(400, 'BAD_ID', 'Invalid conflict.');
  const [row] = await db`
    UPDATE pos_stock_conflicts SET resolved_at = NOW(), resolved_by = ${actorUserId}
    WHERE id = ${conflictId} AND business_id = ${businessId} AND resolved_at IS NULL RETURNING *
  `;
  if (!row) throw new PosError(404, 'NOT_FOUND', 'Conflict not found or already resolved.');
  return row;
}

// ==========================================
// 3. Suppliers, Purchasing & Expenses
// ==========================================

export async function getPosSuppliers(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT s.*,
      (SELECT COUNT(*) FROM pos_purchase_orders po WHERE po.supplier_id = s.id AND po.business_id = s.business_id) AS order_count,
      (SELECT COALESCE(SUM(total_cost_cents), 0) FROM pos_purchase_orders po WHERE po.supplier_id = s.id AND po.business_id = s.business_id AND po.status <> 'cancelled') AS total_purchased_cents
    FROM pos_suppliers s
    WHERE s.business_id = ${businessId} AND s.is_active = true
    ORDER BY s.name ASC
  `;
}

export async function createPosSupplier(businessId: string, data: Record<string, unknown>) {
  await ensurePosSchema();
  const name = text(data.name, 120);
  if (!name) throw new PosError(400, 'NAME_REQUIRED', 'Supplier name is required.');
  const email = text(data.email, 160);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new PosError(400, 'BAD_EMAIL', 'Invalid supplier email.');
  const [created] = await db`
    INSERT INTO pos_suppliers (business_id, name, contact_person, email, phone, address, tax_number, notes)
    VALUES (${businessId}, ${name}, ${text(data.contactPerson, 120)}, ${email}, ${text(data.phone, 30)},
            ${text(data.address, 300)}, ${text(data.taxNumber, 30)}, ${text(data.notes, 1000)})
    RETURNING *
  `;
  return created;
}

export async function getPosPurchaseOrders(businessId: string) {
  await ensurePosSchema();
  const orders = await db`
    SELECT po.*, s.name AS supplier_name,
      (SELECT COUNT(*) FROM pos_purchase_order_items WHERE purchase_order_id = po.id) AS item_count
    FROM pos_purchase_orders po
    JOIN pos_suppliers s ON po.supplier_id = s.id
    WHERE po.business_id = ${businessId}
    ORDER BY po.created_at DESC
    LIMIT 200
  `;
  const ids = orders.map((o) => String(o.id));
  const items = ids.length
    ? await db`
        SELECT i.*, p.name AS product_name, p.unit
        FROM pos_purchase_order_items i JOIN pos_products p ON p.id = i.product_id
        WHERE i.purchase_order_id = ANY(${ids}::uuid[])
      `
    : [];
  return orders.map((o) => ({ ...o, items: items.filter((i) => String(i.purchase_order_id) === String(o.id)) }));
}

export async function createPosPurchaseOrder(
  businessId: string,
  supplierId: unknown,
  items: unknown,
  notes?: unknown,
) {
  await ensurePosSchema();
  if (!isUuid(supplierId)) throw new PosError(400, 'BAD_SUPPLIER', 'Choose a supplier.');
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) throw new PosError(400, 'NO_ITEMS', 'Add at least one product.');
  const lines = items.map((raw) => {
    const it = raw as Record<string, unknown>;
    if (!isUuid(it.productId)) throw new PosError(400, 'BAD_PRODUCT', 'Invalid product on the order.');
    return { productId: String(it.productId), quantity: qty(it.quantity, 'Quantity', { allowZero: false }), unitCostCents: intCents(it.unitCostCents, 'Unit cost', { max: 10_000_000 }) };
  });

  const [supplier] = await db`SELECT id FROM pos_suppliers WHERE id = ${supplierId} AND business_id = ${businessId}`;
  if (!supplier) throw new PosError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const owned = await db`SELECT id FROM pos_products WHERE business_id = ${businessId} AND id = ANY(${productIds}::uuid[])`;
  if (owned.length !== productIds.length) throw new PosError(404, 'PRODUCT_NOT_FOUND', 'A product on the order is not in your catalogue.');

  const lineTotal = (l: { quantity: number; unitCostCents: number }) => Math.floor((l.unitCostCents * Math.round(l.quantity * 100) + 50) / 100);
  const total = lines.reduce((a, l) => a + lineTotal(l), 0);

  return withTransaction(async (tx) => {
    const poNumber = `PO-${String(await nextNumber(tx, businessId, 'purchase_order')).padStart(5, '0')}`;
    const [po] = await tx`
      INSERT INTO pos_purchase_orders (business_id, supplier_id, po_number, status, total_cost_cents, notes, ordered_at)
      VALUES (${businessId}, ${supplierId}, ${poNumber}, 'ordered', ${total}, ${text(notes, 1000)}, NOW())
      RETURNING *
    `;
    for (const l of lines) {
      await tx`
        INSERT INTO pos_purchase_order_items (purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost_cents, total_cost_cents)
        VALUES (${po.id}, ${l.productId}, ${l.quantity}, 0, ${l.unitCostCents}, ${lineTotal(l)})
      `;
    }
    return po;
  });
}

/**
 * Receives stock against a purchase order — all outstanding lines, or just
 * the quantities given (a partial delivery). Stock and the weighted-average
 * cost price update in the same transaction as the PO.
 */
export async function receivePosPurchaseOrder(
  businessId: string,
  poId: unknown,
  actorUserId: string,
  received?: { itemId: string; quantity: number }[],
) {
  await ensurePosSchema();
  if (!isUuid(poId)) throw new PosError(400, 'BAD_PO', 'Invalid purchase order.');

  return withTransaction(async (tx) => {
    const [po] = await tx`SELECT * FROM pos_purchase_orders WHERE id = ${poId} AND business_id = ${businessId} FOR UPDATE`;
    if (!po) throw new PosError(404, 'PO_NOT_FOUND', 'Purchase order not found.');
    if (!['ordered', 'partially_received'].includes(po.status)) throw new PosError(409, 'PO_CLOSED', `This order is ${po.status}.`);
    const items = await tx`SELECT * FROM pos_purchase_order_items WHERE purchase_order_id = ${poId} ORDER BY id FOR UPDATE`;

    const plan = received && received.length
      ? received.map((r) => {
          const it = items.find((i) => String(i.id) === String(r.itemId));
          if (!it) throw new PosError(404, 'PO_ITEM_NOT_FOUND', 'A received line is not on this order.');
          const outstanding = Number(it.quantity_ordered) - Number(it.quantity_received);
          const q = qty(r.quantity, 'Received quantity', { allowZero: false });
          if (q > outstanding + 1e-9) throw new PosError(400, 'OVER_RECEIVE', `Only ${outstanding} outstanding on that line.`);
          return { it, q };
        })
      : items.map((it) => ({ it, q: Number(it.quantity_ordered) - Number(it.quantity_received) })).filter((x) => x.q > 0);
    if (plan.length === 0) throw new PosError(409, 'NOTHING_OUTSTANDING', 'Nothing left to receive on this order.');

    for (const { it, q } of plan) {
      const [prod] = await tx`SELECT stock_quantity, cost_price_cents FROM pos_products WHERE id = ${it.product_id} AND business_id = ${businessId} FOR UPDATE`;
      if (!prod) throw new PosError(404, 'PRODUCT_NOT_FOUND', 'A product on the order no longer exists.');
      const prevQty = Number(prod.stock_quantity);
      const nextQty = Math.round((prevQty + q) * 100) / 100;
      const unitCost = Number(it.unit_cost_cents);
      const avgCost = prevQty > 0
        ? Math.round((prevQty * Number(prod.cost_price_cents) + q * unitCost) / nextQty)
        : unitCost;
      await tx`
        UPDATE pos_products SET stock_quantity = ${nextQty}, cost_price_cents = ${avgCost}, updated_at = NOW()
        WHERE id = ${it.product_id} AND business_id = ${businessId}
      `;
      await tx`UPDATE pos_purchase_order_items SET quantity_received = quantity_received + ${q} WHERE id = ${it.id}`;
      await tx`
        INSERT INTO pos_inventory_logs (business_id, product_id, previous_quantity, new_quantity, change_quantity, reason, reference_id, notes, actor_user_id)
        VALUES (${businessId}, ${it.product_id}, ${prevQty}, ${nextQty}, ${q}, 'purchase_receive', ${String(poId)},
                ${`Received on ${po.po_number}`}, ${actorUserId})
      `;
    }

    const [{ outstanding }] = await tx`
      SELECT COALESCE(SUM(quantity_ordered - quantity_received), 0) AS outstanding
      FROM pos_purchase_order_items WHERE purchase_order_id = ${poId}
    `;
    const status = Number(outstanding) > 0 ? 'partially_received' : 'received';
    const [updated] = await tx`
      UPDATE pos_purchase_orders
      SET status = ${status}, received_at = CASE WHEN ${status} = 'received' THEN NOW() ELSE received_at END, updated_at = NOW()
      WHERE id = ${poId} RETURNING *
    `;
    return updated;
  });
}

export async function cancelPosPurchaseOrder(businessId: string, poId: unknown) {
  await ensurePosSchema();
  if (!isUuid(poId)) throw new PosError(400, 'BAD_PO', 'Invalid purchase order.');
  const [updated] = await db`
    UPDATE pos_purchase_orders SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${poId} AND business_id = ${businessId} AND status = 'ordered'
      AND NOT EXISTS (SELECT 1 FROM pos_purchase_order_items WHERE purchase_order_id = ${poId} AND quantity_received > 0)
    RETURNING *
  `;
  if (!updated) throw new PosError(409, 'CANNOT_CANCEL', 'Only an order with nothing received yet can be cancelled.');
  return updated;
}

export const EXPENSE_CATEGORIES = ['stock_purchase', 'transport', 'rent', 'electricity', 'packaging', 'equipment', 'wages', 'other'] as const;

export async function getPosExpenses(businessId: string, from?: string, to?: string) {
  await ensurePosSchema();
  return db`
    SELECT e.*, s.name AS supplier_name FROM pos_expenses e
    LEFT JOIN pos_suppliers s ON s.id = e.supplier_id AND s.business_id = e.business_id
    WHERE e.business_id = ${businessId}
      AND (${from ?? null}::date IS NULL OR e.expense_date >= ${from ?? null}::date)
      AND (${to ?? null}::date IS NULL OR e.expense_date <= ${to ?? null}::date)
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT 500
  `;
}

export async function createPosExpense(businessId: string, data: Record<string, unknown>, actorUserId: string) {
  await ensurePosSchema();
  const category = EXPENSE_CATEGORIES.includes(String(data.category) as (typeof EXPENSE_CATEGORIES)[number]) ? String(data.category) : null;
  if (!category) throw new PosError(400, 'BAD_CATEGORY', `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}.`);
  const amount = intCents(data.amountCents, 'Amount', { min: 1, max: 1_000_000_000 });
  const date = typeof data.expenseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.expenseDate) ? data.expenseDate : new Date().toISOString().slice(0, 10);
  let supplierId: string | null = null;
  if (data.supplierId) {
    if (!isUuid(data.supplierId)) throw new PosError(400, 'BAD_SUPPLIER', 'Invalid supplier.');
    const [s] = await db`SELECT id FROM pos_suppliers WHERE id = ${data.supplierId} AND business_id = ${businessId}`;
    if (!s) throw new PosError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
    supplierId = String(data.supplierId);
  }
  const [row] = await db`
    INSERT INTO pos_expenses (business_id, category, description, amount_cents, expense_date, supplier_id, created_by)
    VALUES (${businessId}, ${category}, ${text(data.description, 300)}, ${amount}, ${date}::date, ${supplierId}, ${actorUserId})
    RETURNING *
  `;
  return row;
}

// ==========================================
// 4. Sales (read) & Reports
// ==========================================

export async function getPosSales(businessId: string, limit = 50, offset = 0, from?: string, to?: string) {
  await ensurePosSchema();
  return db`
    SELECT s.*, t.name AS till_name, u.full_name AS cashier_name
    FROM pos_sales s
    LEFT JOIN pos_tills t ON s.till_id = t.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.business_id = ${businessId}
      AND (${from ?? null}::date IS NULL OR s.created_at >= ${from ?? null}::date)
      AND (${to ?? null}::date IS NULL OR s.created_at < ${to ?? null}::date + 1)
    ORDER BY s.created_at DESC
    LIMIT ${Math.min(Math.max(1, limit), 500)} OFFSET ${Math.max(0, offset)}
  `;
}

export async function getPosSaleById(businessId: string, saleId: string) {
  await ensurePosSchema();
  if (!isUuid(saleId)) return null;
  const [sale] = await db`
    SELECT s.*, t.name AS till_name, u.full_name AS cashier_name
    FROM pos_sales s
    LEFT JOIN pos_tills t ON s.till_id = t.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ${saleId} AND s.business_id = ${businessId}
    LIMIT 1
  `;
  if (!sale) return null;
  const items = await db`SELECT * FROM pos_sale_items WHERE sale_id = ${saleId} ORDER BY id`;
  const [payment] = await db`SELECT * FROM pos_payments WHERE sale_id = ${saleId} ORDER BY created_at LIMIT 1`;
  const refunds = await db`SELECT * FROM pos_refunds WHERE sale_id = ${saleId} AND business_id = ${businessId} ORDER BY created_at`;
  const [settings] = await db`SELECT * FROM pos_settings WHERE business_id = ${businessId}`;
  const [biz] = await db`SELECT company_name FROM businesses WHERE id = ${businessId}`;
  return { sale, items, payment, refunds, receipt: { businessName: biz?.company_name ?? '', settings: settings ?? null } };
}

const SA_TZ = 'Africa/Johannesburg';

/** Sales, refunds, profit and fees for a date range (inclusive, SA time). */
export async function getPosDashboard(businessId: string, from: string, to: string) {
  await ensurePosSchema();
  const [totals] = await db`
    SELECT
      COUNT(*) AS transactions,
      COALESCE(SUM(total_cents), 0) AS gross_sales_cents,
      COALESCE(SUM(refunded_cents), 0) AS refunds_cents,
      COALESCE(SUM(platform_fee_cents - fee_reversed_cents), 0) AS platform_fees_cents,
      COALESCE(SUM(tax_cents), 0) AS vat_cents,
      COALESCE(AVG(total_cents), 0) AS average_sale_cents
    FROM pos_sales
    WHERE business_id = ${businessId} AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
  `;
  const [cogs] = await db`
    SELECT COALESCE(SUM(ROUND((si.quantity - si.refunded_quantity) * si.cost_price_cents)), 0) AS cogs_cents
    FROM pos_sale_items si JOIN pos_sales s ON s.id = si.sale_id
    WHERE s.business_id = ${businessId} AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
  `;
  const [exp] = await db`
    SELECT COALESCE(SUM(amount_cents), 0) AS expenses_cents FROM pos_expenses
    WHERE business_id = ${businessId} AND expense_date BETWEEN ${from}::date AND ${to}::date
  `;
  const byMethod = await db`
    SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_cents - refunded_cents), 0) AS net_cents
    FROM pos_sales
    WHERE business_id = ${businessId} AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY payment_method ORDER BY net_cents DESC
  `;
  const daily = await db`
    SELECT (completed_at AT TIME ZONE ${SA_TZ})::date AS day,
      COUNT(*) AS transactions,
      COALESCE(SUM(total_cents - refunded_cents), 0) AS net_sales_cents
    FROM pos_sales
    WHERE business_id = ${businessId} AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY 1 ORDER BY 1
  `;
  const topProducts = await db`
    SELECT si.product_name,
      SUM(si.quantity - si.refunded_quantity) AS quantity,
      SUM(si.total_cents) AS sales_cents,
      SUM(si.total_cents - ROUND(si.quantity * si.cost_price_cents)) AS gross_profit_cents
    FROM pos_sale_items si JOIN pos_sales s ON s.id = si.sale_id
    WHERE s.business_id = ${businessId} AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY si.product_name ORDER BY sales_cents DESC LIMIT 10
  `;
  const byCashier = await db`
    SELECT COALESCE(u.full_name, 'Unknown') AS cashier, COUNT(*) AS transactions, COALESCE(SUM(s.total_cents - s.refunded_cents), 0) AS net_sales_cents
    FROM pos_sales s LEFT JOIN users u ON u.id = s.cashier_id
    WHERE s.business_id = ${businessId} AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE ${SA_TZ})::date BETWEEN ${from}::date AND ${to}::date
    GROUP BY 1 ORDER BY 3 DESC
  `;

  const gross = Number(totals.gross_sales_cents);
  const refunds = Number(totals.refunds_cents);
  const netSales = gross - refunds;
  const vat = Number(totals.vat_cents);
  const cogsCents = Number(cogs.cogs_cents);
  const fees = Number(totals.platform_fees_cents);
  const expenses = Number(exp.expenses_cents);
  // Revenue is not profit: each figure is labelled for what it is.
  const grossProfit = netSales - vat - cogsCents;
  return {
    from,
    to,
    transactions: Number(totals.transactions),
    grossSalesCents: gross,
    refundsCents: refunds,
    netSalesCents: netSales,
    vatCents: vat,
    costOfGoodsCents: cogsCents,
    grossProfitCents: grossProfit,
    platformFeesCents: fees,
    expensesCents: expenses,
    netProfitCents: grossProfit - fees - expenses,
    averageSaleCents: Math.round(Number(totals.average_sale_cents)),
    byMethod,
    daily,
    topProducts,
    byCashier,
  };
}

export async function getPosFinancialLedger(businessId: string, limit = 100) {
  await ensurePosSchema();
  return db`
    SELECT * FROM pos_financial_ledger WHERE business_id = ${businessId}
    ORDER BY created_at DESC, id LIMIT ${Math.min(Math.max(1, limit), 1000)}
  `;
}

export async function getLedgerTrialBalance(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT account_name, SUM(debit_cents) AS debit_cents, SUM(credit_cents) AS credit_cents,
      SUM(debit_cents) - SUM(credit_cents) AS balance_cents
    FROM pos_financial_ledger WHERE business_id = ${businessId} AND journal_id IS NOT NULL
    GROUP BY account_name ORDER BY account_name
  `;
}

// ==========================================
// 5. Staff & Roles
// ==========================================

export async function getPosStaff(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT sr.id, sr.business_id, sr.user_id, sr.role, sr.display_name, sr.is_active, sr.locked_until, sr.created_at,
      (sr.pin_hash IS NOT NULL) AS has_pin, u.email, u.full_name, u.avatar_url
    FROM pos_staff_roles sr JOIN users u ON sr.user_id = u.id
    WHERE sr.business_id = ${businessId}
    ORDER BY sr.created_at ASC
  `;
}

export const STAFF_ROLES = ['owner', 'manager', 'cashier', 'stock_controller'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Adds or updates a staff member by the email of their VerifiedBizLink
 * account. Managers may add cashiers and stock controllers only.
 */
export async function assignPosStaffRole(
  businessId: string,
  actor: { userId: string; role: string },
  data: { email?: unknown; role?: unknown; pin?: unknown; displayName?: unknown; isActive?: unknown },
) {
  await ensurePosSchema();
  const role = STAFF_ROLES.includes(String(data.role) as StaffRole) ? (String(data.role) as StaffRole) : null;
  if (!role) throw new PosError(400, 'BAD_ROLE', 'Choose a role.');
  if (actor.role === 'manager' && (role === 'owner' || role === 'manager')) {
    throw new PosError(403, 'ROLE_NOT_ALLOWED', 'Managers can add cashiers and stock controllers only.');
  }
  const email = text(data.email, 160)?.toLowerCase();
  if (!email) throw new PosError(400, 'EMAIL_REQUIRED', 'Enter the email address of their VerifiedBizLink account.');
  const [user] = await db`SELECT id FROM users WHERE LOWER(email) = ${email} LIMIT 1`;
  if (!user) throw new PosError(404, 'USER_NOT_FOUND', 'No VerifiedBizLink account uses that email. Ask them to sign up first.');
  if (String(user.id) === actor.userId) throw new PosError(400, 'SELF', 'You cannot change your own POS role.');

  let pinHash: string | null = null;
  if (data.pin !== undefined && data.pin !== null && data.pin !== '') {
    if (!/^\d{4,6}$/.test(String(data.pin))) throw new PosError(400, 'BAD_PIN', 'PIN must be 4 to 6 digits.');
    pinHash = await bcrypt.hash(String(data.pin), 10);
  }

  const [existing] = await db`SELECT role FROM pos_staff_roles WHERE business_id = ${businessId} AND user_id = ${user.id}`;
  if (existing && actor.role === 'manager' && (existing.role === 'owner' || existing.role === 'manager')) {
    throw new PosError(403, 'ROLE_NOT_ALLOWED', 'Managers cannot change owners or other managers.');
  }
  if (!existing) {
    const { maxStaff } = await planLimits(businessId);
    const [{ n }] = await db`SELECT COUNT(*)::int AS n FROM pos_staff_roles WHERE business_id = ${businessId} AND is_active`;
    if (Number(n) >= maxStaff) throw new PosError(403, 'STAFF_LIMIT', `Your plan allows ${maxStaff} staff accounts. Upgrade to add more.`);
  }

  const [staff] = await db`
    INSERT INTO pos_staff_roles (business_id, user_id, role, pin_hash, display_name, is_active)
    VALUES (${businessId}, ${user.id}, ${role}, ${pinHash}, ${text(data.displayName, 60)}, ${data.isActive === false ? false : true})
    ON CONFLICT (business_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      pin_hash = COALESCE(EXCLUDED.pin_hash, pos_staff_roles.pin_hash),
      display_name = COALESCE(EXCLUDED.display_name, pos_staff_roles.display_name),
      is_active = COALESCE(${data.isActive === undefined ? null : data.isActive !== false}, pos_staff_roles.is_active),
      failed_pin_attempts = CASE WHEN EXCLUDED.pin_hash IS NOT NULL THEN 0 ELSE pos_staff_roles.failed_pin_attempts END,
      locked_until = CASE WHEN EXCLUDED.pin_hash IS NOT NULL THEN NULL ELSE pos_staff_roles.locked_until END,
      updated_at = NOW()
    RETURNING id, business_id, user_id, role, display_name, is_active
  `;
  await logPosAudit({
    businessId, actorUserId: actor.userId, actorRole: actor.role, action: existing ? 'staff_updated' : 'staff_added',
    targetType: 'user', targetId: String(user.id), detail: { role, pinChanged: Boolean(pinHash), isActive: staff.is_active },
  });
  return staff;
}

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

/**
 * Checks a till PIN. Five wrong PINs lock PIN sign-in for this business for
 * 15 minutes (password sign-in still works). Returns the matching staff
 * member, or null.
 */
export async function verifyPosStaffPin(businessId: string, pin: string) {
  await ensurePosSchema();
  if (!/^\d{4,6}$/.test(pin)) return null;

  const [locked] = await db`
    SELECT locked_until FROM pos_staff_roles WHERE business_id = ${businessId} AND locked_until > NOW() LIMIT 1
  `;
  if (locked) {
    throw new PosError(429, 'PIN_LOCKED', `Too many wrong PINs. PIN sign-in is locked until ${new Date(locked.locked_until).toLocaleTimeString('en-ZA')}. Sign in with a password instead.`);
  }

  const staffMembers = await db`
    SELECT sr.*, u.full_name, u.email
    FROM pos_staff_roles sr JOIN users u ON sr.user_id = u.id
    WHERE sr.business_id = ${businessId} AND sr.is_active = true AND sr.pin_hash IS NOT NULL
  `;
  for (const staff of staffMembers) {
    if (await bcrypt.compare(pin, String(staff.pin_hash))) {
      await db`UPDATE pos_staff_roles SET failed_pin_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE business_id = ${businessId}`;
      return {
        id: String(staff.id),
        userId: String(staff.user_id),
        fullName: String(staff.full_name ?? ''),
        role: String(staff.role) as StaffRole,
        displayName: String(staff.display_name || staff.full_name || ''),
      };
    }
  }

  await db`
    UPDATE pos_staff_roles
    SET failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = CASE WHEN failed_pin_attempts + 1 >= ${PIN_MAX_ATTEMPTS} THEN NOW() + (${PIN_LOCK_MINUTES} || ' minutes')::interval ELSE locked_until END,
        updated_at = NOW()
    WHERE business_id = ${businessId} AND is_active = true
  `;
  return null;
}
