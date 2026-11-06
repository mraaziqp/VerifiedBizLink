import db from '@/lib/db';
import { ensurePosSchema } from './schema';
import { resolveAdapterForMethod } from './payments';
import type { PaymentMethodType } from './payments/types';
import bcrypt from 'bcryptjs';

// ==========================================
// 1. Settings & Tills
// ==========================================

export async function getPosSettings(businessId: string) {
  await ensurePosSchema();
  const [row] = await db`
    SELECT * FROM pos_settings WHERE business_id = ${businessId} LIMIT 1
  `;
  if (row) return row;

  // Auto-initialize default settings for merchant
  const [created] = await db`
    INSERT INTO pos_settings (business_id)
    VALUES (${businessId})
    ON CONFLICT (business_id) DO NOTHING
    RETURNING *
  `;
  return created || (await db`SELECT * FROM pos_settings WHERE business_id = ${businessId} LIMIT 1`)[0];
}

export async function updatePosSettings(businessId: string, updates: Record<string, unknown>) {
  await ensurePosSchema();
  const allowed = [
    'currency',
    'tax_rate_percent',
    'vat_number',
    'receipt_header',
    'receipt_footer',
    'phone',
    'email',
    'address',
    'auto_print_receipt',
    'allow_offline_sales',
    'cash_drawer_float_rand',
  ];

  await getPosSettings(businessId);
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in updates) data[k] = updates[k];
  }

  await db`
    UPDATE pos_settings
    SET
      currency = COALESCE(${data.currency ?? null}, currency),
      tax_rate_percent = COALESCE(${data.tax_rate_percent ?? null}, tax_rate_percent),
      vat_number = COALESCE(${data.vat_number ?? null}, vat_number),
      receipt_header = COALESCE(${data.receipt_header ?? null}, receipt_header),
      receipt_footer = COALESCE(${data.receipt_footer ?? null}, receipt_footer),
      phone = COALESCE(${data.phone ?? null}, phone),
      email = COALESCE(${data.email ?? null}, email),
      address = COALESCE(${data.address ?? null}, address),
      auto_print_receipt = COALESCE(${data.auto_print_receipt ?? null}, auto_print_receipt),
      allow_offline_sales = COALESCE(${data.allow_offline_sales ?? null}, allow_offline_sales),
      cash_drawer_float_rand = COALESCE(${data.cash_drawer_float_rand ?? null}, cash_drawer_float_rand),
      updated_at = NOW()
    WHERE business_id = ${businessId}
  `;

  return getPosSettings(businessId);
}

export async function getTills(businessId: string) {
  await ensurePosSchema();
  let tills = await db`
    SELECT * FROM pos_tills WHERE business_id = ${businessId} ORDER BY till_number ASC
  `;
  if (tills.length === 0) {
    // Default Till #1
    await db`
      INSERT INTO pos_tills (business_id, till_number, name)
      VALUES (${businessId}, 1, 'Main Counter Till')
      ON CONFLICT DO NOTHING
    `;
    tills = await db`SELECT * FROM pos_tills WHERE business_id = ${businessId} ORDER BY till_number ASC`;
  }
  return tills;
}

export async function openTill(tillId: string, businessId: string, userId: string, floatCents: number) {
  await ensurePosSchema();
  const [updated] = await db`
    UPDATE pos_tills
    SET
      status = 'open',
      assigned_user_id = ${userId},
      current_float_cents = ${floatCents},
      last_opened_at = NOW(),
      updated_at = NOW()
    WHERE id = ${tillId} AND business_id = ${businessId}
    RETURNING *
  `;
  return updated;
}

export async function closeTill(tillId: string, businessId: string, closingCashCents: number) {
  await ensurePosSchema();
  const [updated] = await db`
    UPDATE pos_tills
    SET
      status = 'closed',
      current_float_cents = ${closingCashCents},
      last_closed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${tillId} AND business_id = ${businessId}
    RETURNING *
  `;
  return updated;
}

// ==========================================
// 2. Categories & Products & Inventory
// ==========================================

export async function getPosCategories(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT * FROM pos_categories
    WHERE business_id = ${businessId}
    ORDER BY sort_order ASC, name ASC
  `;
}

export async function createPosCategory(businessId: string, name: string, color = '#d97706') {
  await ensurePosSchema();
  const [created] = await db`
    INSERT INTO pos_categories (business_id, name, color)
    VALUES (${businessId}, ${name}, ${color})
    RETURNING *
  `;
  return created;
}

export async function getPosProducts(businessId: string, query?: string, categoryId?: string) {
  await ensurePosSchema();
  if (categoryId && categoryId !== 'all') {
    if (query) {
      const q = `%${query.trim().toLowerCase()}%`;
      return db`
        SELECT p.*, c.name as category_name
        FROM pos_products p
        LEFT JOIN pos_categories c ON p.category_id = c.id
        WHERE p.business_id = ${businessId}
          AND p.category_id = ${categoryId}
          AND (LOWER(p.name) LIKE ${q} OR LOWER(COALESCE(p.barcode, '')) LIKE ${q} OR LOWER(COALESCE(p.sku, '')) LIKE ${q})
        ORDER BY p.name ASC
      `;
    }
    return db`
      SELECT p.*, c.name as category_name
      FROM pos_products p
      LEFT JOIN pos_categories c ON p.category_id = c.id
      WHERE p.business_id = ${businessId} AND p.category_id = ${categoryId}
      ORDER BY p.name ASC
    `;
  }

  if (query) {
    const q = `%${query.trim().toLowerCase()}%`;
    return db`
      SELECT p.*, c.name as category_name
      FROM pos_products p
      LEFT JOIN pos_categories c ON p.category_id = c.id
      WHERE p.business_id = ${businessId}
        AND (LOWER(p.name) LIKE ${q} OR LOWER(COALESCE(p.barcode, '')) LIKE ${q} OR LOWER(COALESCE(p.sku, '')) LIKE ${q})
      ORDER BY p.name ASC
    `;
  }

  return db`
    SELECT p.*, c.name as category_name
    FROM pos_products p
    LEFT JOIN pos_categories c ON p.category_id = c.id
    WHERE p.business_id = ${businessId}
    ORDER BY p.name ASC
  `;
}

export async function getPosProductByBarcode(businessId: string, barcode: string) {
  await ensurePosSchema();
  const [prod] = await db`
    SELECT * FROM pos_products
    WHERE business_id = ${businessId} AND barcode = ${barcode}
    LIMIT 1
  `;
  return prod || null;
}

export async function createPosProduct(
  businessId: string,
  data: {
    name: string;
    categoryId?: string | null;
    sku?: string | null;
    barcode?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    costPriceCents: number;
    sellingPriceCents: number;
    taxRatePercent?: number;
    stockQuantity: number;
    minStockThreshold?: number;
    unit?: string;
  },
  actorUserId?: string
) {
  await ensurePosSchema();
  const [product] = await db`
    INSERT INTO pos_products (
      business_id, category_id, name, sku, barcode, description, image_url,
      cost_price_cents, selling_price_cents, tax_rate_percent, stock_quantity,
      min_stock_threshold, unit
    )
    VALUES (
      ${businessId}, ${data.categoryId || null}, ${data.name}, ${data.sku || null},
      ${data.barcode || null}, ${data.description || null}, ${data.imageUrl || null},
      ${data.costPriceCents}, ${data.sellingPriceCents}, ${data.taxRatePercent ?? 15.0},
      ${data.stockQuantity}, ${data.minStockThreshold ?? 5}, ${data.unit || 'item'}
    )
    RETURNING *
  `;

  // Log initial inventory
  if (data.stockQuantity > 0) {
    await db`
      INSERT INTO pos_inventory_logs (
        business_id, product_id, previous_quantity, new_quantity,
        change_quantity, reason, notes, actor_user_id
      )
      VALUES (
        ${businessId}, ${product.id}, 0, ${data.stockQuantity},
        ${data.stockQuantity}, 'initial_count', 'Initial product catalog creation', ${actorUserId || null}
      )
    `;
  }

  return product;
}

export async function updatePosProduct(
  businessId: string,
  productId: string,
  data: Partial<{
    name: string;
    categoryId: string | null;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    imageUrl: string | null;
    costPriceCents: number;
    sellingPriceCents: number;
    taxRatePercent: number;
    minStockThreshold: number;
    unit: string;
    isActive: boolean;
  }>
) {
  await ensurePosSchema();
  const [updated] = await db`
    UPDATE pos_products
    SET
      name = COALESCE(${data.name ?? null}, name),
      category_id = CASE WHEN ${'categoryId' in data} THEN ${data.categoryId ?? null} ELSE category_id END,
      sku = CASE WHEN ${'sku' in data} THEN ${data.sku ?? null} ELSE sku END,
      barcode = CASE WHEN ${'barcode' in data} THEN ${data.barcode ?? null} ELSE barcode END,
      description = CASE WHEN ${'description' in data} THEN ${data.description ?? null} ELSE description END,
      image_url = CASE WHEN ${'imageUrl' in data} THEN ${data.imageUrl ?? null} ELSE image_url END,
      cost_price_cents = COALESCE(${data.costPriceCents ?? null}, cost_price_cents),
      selling_price_cents = COALESCE(${data.sellingPriceCents ?? null}, selling_price_cents),
      tax_rate_percent = COALESCE(${data.taxRatePercent ?? null}, tax_rate_percent),
      min_stock_threshold = COALESCE(${data.minStockThreshold ?? null}, min_stock_threshold),
      unit = COALESCE(${data.unit ?? null}, unit),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${productId} AND business_id = ${businessId}
    RETURNING *
  `;
  return updated;
}

export async function adjustPosStock(
  businessId: string,
  productId: string,
  change: number,
  reason: 'purchase_receive' | 'manual_adjustment' | 'waste_damaged' | 'return_refund' | 'sale',
  notes?: string,
  actorUserId?: string,
  referenceId?: string
) {
  await ensurePosSchema();
  const [prod] = await db`
    SELECT stock_quantity FROM pos_products
    WHERE id = ${productId} AND business_id = ${businessId}
    LIMIT 1
  `;
  if (!prod) throw new Error('Product not found');

  const prev = Number(prod.stock_quantity);
  const next = prev + change;

  const [updated] = await db`
    UPDATE pos_products
    SET stock_quantity = ${next}, updated_at = NOW()
    WHERE id = ${productId} AND business_id = ${businessId}
    RETURNING *
  `;

  await db`
    INSERT INTO pos_inventory_logs (
      business_id, product_id, previous_quantity, new_quantity,
      change_quantity, reason, reference_id, notes, actor_user_id
    )
    VALUES (
      ${businessId}, ${productId}, ${prev}, ${next},
      ${change}, ${reason}, ${referenceId || null}, ${notes || null}, ${actorUserId || null}
    )
  `;

  return updated;
}

export async function getPosInventoryLogs(businessId: string, productId?: string, limit = 50) {
  await ensurePosSchema();
  if (productId) {
    return db`
      SELECT l.*, p.name as product_name, u.full_name as actor_name
      FROM pos_inventory_logs l
      JOIN pos_products p ON l.product_id = p.id
      LEFT JOIN users u ON l.actor_user_id = u.id
      WHERE l.business_id = ${businessId} AND l.product_id = ${productId}
      ORDER BY l.created_at DESC
      LIMIT ${limit}
    `;
  }
  return db`
    SELECT l.*, p.name as product_name, u.full_name as actor_name
    FROM pos_inventory_logs l
    JOIN pos_products p ON l.product_id = p.id
    LEFT JOIN users u ON l.actor_user_id = u.id
    WHERE l.business_id = ${businessId}
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;
}

// ==========================================
// 3. Suppliers & Purchasing
// ==========================================

export async function getPosSuppliers(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT * FROM pos_suppliers
    WHERE business_id = ${businessId} AND is_active = true
    ORDER BY name ASC
  `;
}

export async function createPosSupplier(
  businessId: string,
  data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    notes?: string;
  }
) {
  await ensurePosSchema();
  const [created] = await db`
    INSERT INTO pos_suppliers (
      business_id, name, contact_person, email, phone, address, tax_number, notes
    )
    VALUES (
      ${businessId}, ${data.name}, ${data.contactPerson || null}, ${data.email || null},
      ${data.phone || null}, ${data.address || null}, ${data.taxNumber || null}, ${data.notes || null}
    )
    RETURNING *
  `;
  return created;
}

export async function getPosPurchaseOrders(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT po.*, s.name as supplier_name,
      (SELECT COUNT(*) FROM pos_purchase_order_items WHERE purchase_order_id = po.id) as item_count
    FROM pos_purchase_orders po
    JOIN pos_suppliers s ON po.supplier_id = s.id
    WHERE po.business_id = ${businessId}
    ORDER BY po.created_at DESC
  `;
}

export async function createPosPurchaseOrder(
  businessId: string,
  supplierId: string,
  items: { productId: string; quantity: number; unitCostCents: number }[],
  notes?: string
) {
  await ensurePosSchema();
  const poNumber = `PO-${Date.now().toString().slice(-6)}`;
  const totalCost = items.reduce((acc, it) => acc + it.quantity * it.unitCostCents, 0);

  const [po] = await db`
    INSERT INTO pos_purchase_orders (
      business_id, supplier_id, po_number, status, total_cost_cents, notes, ordered_at
    )
    VALUES (
      ${businessId}, ${supplierId}, ${poNumber}, 'ordered', ${totalCost}, ${notes || null}, NOW()
    )
    RETURNING *
  `;

  for (const it of items) {
    const itemTotal = it.quantity * it.unitCostCents;
    await db`
      INSERT INTO pos_purchase_order_items (
        purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost_cents, total_cost_cents
      )
      VALUES (
        ${po.id}, ${it.productId}, ${it.quantity}, 0, ${it.unitCostCents}, ${itemTotal}
      )
    `;
  }

  return po;
}

export async function receivePosPurchaseOrder(
  businessId: string,
  poId: string,
  actorUserId?: string
) {
  await ensurePosSchema();
  const [po] = await db`
    SELECT * FROM pos_purchase_orders
    WHERE id = ${poId} AND business_id = ${businessId}
    LIMIT 1
  `;
  if (!po) throw new Error('Purchase order not found');

  const items = await db`
    SELECT * FROM pos_purchase_order_items WHERE purchase_order_id = ${poId}
  `;

  // Increase stock for each item and write to inventory logs
  for (const it of items) {
    const qty = Number(it.quantity_ordered) - Number(it.quantity_received);
    if (qty > 0) {
      await adjustPosStock(
        businessId,
        it.product_id,
        qty,
        'purchase_receive',
        `Stock received from PO #${po.po_number}`,
        actorUserId,
        poId
      );
      await db`
        UPDATE pos_purchase_order_items
        SET quantity_received = quantity_ordered
        WHERE id = ${it.id}
      `;
    }
  }

  const [updated] = await db`
    UPDATE pos_purchase_orders
    SET status = 'received', received_at = NOW(), updated_at = NOW()
    WHERE id = ${poId}
    RETURNING *
  `;

  return updated;
}

// ==========================================
// 4. Sales & Processing & Ledger
// ==========================================

export interface ProcessSaleItemInput {
  productId?: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents?: number;
  discountCents?: number;
}

export interface ProcessSaleInput {
  businessId: string;
  tillId?: string;
  cashierId?: string;
  items: ProcessSaleItemInput[];
  paymentMethod: PaymentMethodType;
  tenderAmountCents?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  idempotencyKey?: string;
  isOfflineSync?: boolean;
  offlineCreatedAt?: string;
  devicePlatform?: 'android' | 'ios' | 'web';
  useSandbox?: boolean;
}

export async function processPosSale(input: ProcessSaleInput) {
  await ensurePosSchema();

  // 1. Idempotency Check to prevent duplicate billing
  if (input.idempotencyKey) {
    const [existing] = await db`
      SELECT * FROM pos_sales WHERE idempotency_key = ${input.idempotencyKey} LIMIT 1
    `;
    if (existing) {
      const items = await db`SELECT * FROM pos_sale_items WHERE sale_id = ${existing.id}`;
      const [payment] = await db`SELECT * FROM pos_payments WHERE sale_id = ${existing.id} LIMIT 1`;
      return { sale: existing, items, payment, isDuplicate: true };
    }
  }

  // 2. Calculate Totals
  let subtotalCents = 0;
  let totalDiscountCents = 0;
  for (const it of input.items) {
    const lineTotal = it.quantity * it.unitPriceCents;
    subtotalCents += lineTotal;
    if (it.discountCents) totalDiscountCents += it.discountCents;
  }
  const totalCents = Math.max(0, subtotalCents - totalDiscountCents);

  // 15% VAT component calculated from gross total (standard inclusive SA pricing)
  const taxCents = Math.round(totalCents - totalCents / 1.15);

  // 1% VerifiedBizLink Platform Fee
  const platformFeeCents = Math.round(totalCents * 0.01);
  const merchantNetCents = totalCents - platformFeeCents;

  // 3. Generate Receipt Number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const receiptNumber = `VBL-${dateStr}-${randCode}`;

  // 4. Create Sale Record
  const [sale] = await db`
    INSERT INTO pos_sales (
      business_id, till_id, cashier_id, receipt_number, subtotal_cents, tax_cents,
      discount_cents, total_cents, platform_fee_cents, merchant_net_cents,
      payment_method, payment_status, customer_name, customer_phone, customer_email,
      notes, idempotency_key, is_offline_sync, offline_created_at
    )
    VALUES (
      ${input.businessId}, ${input.tillId || null}, ${input.cashierId || null},
      ${receiptNumber}, ${subtotalCents}, ${taxCents}, ${totalDiscountCents},
      ${totalCents}, ${platformFeeCents}, ${merchantNetCents}, ${input.paymentMethod},
      'completed', ${input.customerName || null}, ${input.customerPhone || null},
      ${input.customerEmail || null}, ${input.notes || null}, ${input.idempotencyKey || null},
      ${Boolean(input.isOfflineSync)}, ${input.offlineCreatedAt ? new Date(input.offlineCreatedAt) : null}
    )
    RETURNING *
  `;

  // 5. Insert Sale Items & Deduct Stock
  const createdItems = [];
  for (const it of input.items) {
    const lineTotal = it.quantity * it.unitPriceCents - (it.discountCents || 0);
    const [line] = await db`
      INSERT INTO pos_sale_items (
        sale_id, product_id, product_name, quantity, unit_price_cents,
        cost_price_cents, total_cents, discount_cents
      )
      VALUES (
        ${sale.id}, ${it.productId || null}, ${it.name}, ${it.quantity},
        ${it.unitPriceCents}, ${it.costPriceCents || 0}, ${lineTotal}, ${it.discountCents || 0}
      )
      RETURNING *
    `;
    createdItems.push(line);

    // If item links to product catalog, adjust stock
    if (it.productId) {
      await adjustPosStock(
        input.businessId,
        it.productId,
        -it.quantity,
        'sale',
        `Sold on Receipt #${receiptNumber}`,
        input.cashierId,
        sale.id
      ).catch(() => {
        // Stock deduction warning if product is ad-hoc or unmanaged
      });
    }
  }

  // 6. Execute Payment via Adapter
  const adapter = resolveAdapterForMethod(input.paymentMethod, {
    isAndroid: input.devicePlatform === 'android',
    isIos: input.devicePlatform === 'ios',
    useSandbox: input.useSandbox,
  });

  const payResult = await adapter.initiate({
    saleId: sale.id,
    businessId: input.businessId,
    amountCents: totalCents,
    currency: 'ZAR',
    method: input.paymentMethod,
    tenderAmountCents: input.tenderAmountCents,
    idempotencyKey: input.idempotencyKey || `pay_${sale.id}`,
    customerDetails: {
      name: input.customerName,
      phone: input.customerPhone,
      email: input.customerEmail,
    },
  });

  // 7. Record Payment Entry
  const [payment] = await db`
    INSERT INTO pos_payments (
      sale_id, business_id, method, amount_cents, tender_amount_cents,
      change_amount_cents, card_last4, card_brand, provider, provider_tx_id,
      auth_code, status, raw_meta
    )
    VALUES (
      ${sale.id}, ${input.businessId}, ${input.paymentMethod}, ${totalCents},
      ${input.tenderAmountCents || totalCents}, ${payResult.changeAmountCents || 0},
      ${payResult.cardLast4 || null}, ${payResult.cardBrand || null},
      ${payResult.provider}, ${payResult.providerTxId || null},
      ${payResult.authCode || null}, ${payResult.status === 'approved' ? 'approved' : 'declined'},
      ${JSON.stringify(payResult.rawResponse || {})}
    )
    RETURNING *
  `;

  // 8. Auditable Double-Entry Ledger Posting
  // Credit: Merchant Gross Proceeds
  await db`
    INSERT INTO pos_financial_ledger (
      business_id, entry_type, debit_cents, credit_cents, balance_cents,
      reference_type, reference_id, description
    )
    VALUES (
      ${input.businessId}, 'sale_proceeds', 0, ${totalCents}, ${merchantNetCents},
      'sale', ${sale.id}, ${`Sale Receipt #${receiptNumber} proceeds`}
    )
  `;

  // Debit: 1% VerifiedBizLink Platform Fee
  if (platformFeeCents > 0) {
    await db`
      INSERT INTO pos_financial_ledger (
        business_id, entry_type, debit_cents, credit_cents, balance_cents,
        reference_type, reference_id, description
      )
      VALUES (
        ${input.businessId}, 'platform_fee', ${platformFeeCents}, 0, 0,
        'sale', ${sale.id}, ${`VerifiedBizLink 1% platform fee for Receipt #${receiptNumber}`}
      )
    `;
  }

  return {
    sale,
    items: createdItems,
    payment,
    paymentResponse: payResult,
  };
}

export async function refundPosSale(
  businessId: string,
  saleId: string,
  restockItems = true,
  reason = 'Customer requested refund',
  actorUserId?: string
) {
  await ensurePosSchema();

  const [sale] = await db`
    SELECT * FROM pos_sales WHERE id = ${saleId} AND business_id = ${businessId} LIMIT 1
  `;
  if (!sale) throw new Error('Sale not found');
  if (sale.payment_status === 'refunded') throw new Error('Sale is already refunded');

  const [payment] = await db`
    SELECT * FROM pos_payments WHERE sale_id = ${saleId} LIMIT 1
  `;

  if (payment) {
    const adapter = resolveAdapterForMethod(payment.method as PaymentMethodType);
    await adapter.refund({
      saleId,
      businessId,
      paymentId: payment.id,
      amountCents: Number(payment.amount_cents),
      reason,
      actorUserId,
    });

    await db`
      UPDATE pos_payments SET status = 'refunded' WHERE id = ${payment.id}
    `;
  }

  // Restock items if requested
  if (restockItems) {
    const items = await db`SELECT * FROM pos_sale_items WHERE sale_id = ${saleId}`;
    for (const it of items) {
      if (it.product_id) {
        await adjustPosStock(
          businessId,
          it.product_id,
          Number(it.quantity),
          'return_refund',
          `Restocked from refund of Receipt #${sale.receipt_number}`,
          actorUserId,
          saleId
        ).catch(() => {});
      }
    }
  }

  // Update sale status
  const [updatedSale] = await db`
    UPDATE pos_sales
    SET payment_status = 'refunded', notes = COALESCE(notes || ' | ', '') || ${`Refunded: ${reason}`}, updated_at = NOW()
    WHERE id = ${saleId}
    RETURNING *
  `;

  // Ledger deduction
  await db`
    INSERT INTO pos_financial_ledger (
      business_id, entry_type, debit_cents, credit_cents, balance_cents,
      reference_type, reference_id, description
    )
    VALUES (
      ${businessId}, 'refund_deduction', ${sale.total_cents}, 0, 0,
      'refund', ${saleId}, ${`Refund deduction for Receipt #${sale.receipt_number}: ${reason}`}
    )
  `;

  return updatedSale;
}

export async function getPosSales(businessId: string, limit = 50, offset = 0) {
  await ensurePosSchema();
  const sales = await db`
    SELECT s.*, t.name as till_name, u.full_name as cashier_name
    FROM pos_sales s
    LEFT JOIN pos_tills t ON s.till_id = t.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.business_id = ${businessId}
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return sales;
}

export async function getPosSaleById(businessId: string, saleId: string) {
  await ensurePosSchema();
  const [sale] = await db`
    SELECT s.*, t.name as till_name, u.full_name as cashier_name
    FROM pos_sales s
    LEFT JOIN pos_tills t ON s.till_id = t.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ${saleId} AND s.business_id = ${businessId}
    LIMIT 1
  `;
  if (!sale) return null;

  const items = await db`
    SELECT * FROM pos_sale_items WHERE sale_id = ${saleId}
  `;
  const [payment] = await db`
    SELECT * FROM pos_payments WHERE sale_id = ${saleId} LIMIT 1
  `;

  return { sale, items, payment };
}

export async function getPosDailySummary(businessId: string, dateStr?: string) {
  await ensurePosSchema();
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);

  const [summary] = await db`
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(total_cents), 0) as gross_revenue_cents,
      COALESCE(SUM(platform_fee_cents), 0) as platform_fees_cents,
      COALESCE(SUM(merchant_net_cents), 0) as net_revenue_cents,
      COALESCE(AVG(total_cents), 0) as average_ticket_cents,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_transactions,
      COUNT(CASE WHEN payment_method = 'card_tap' THEN 1 END) as card_tap_transactions,
      COUNT(CASE WHEN payment_method = 'qr_online' THEN 1 END) as qr_transactions,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_cents ELSE 0 END), 0) as cash_total_cents,
      COALESCE(SUM(CASE WHEN payment_method = 'card_tap' THEN total_cents ELSE 0 END), 0) as card_tap_total_cents,
      COALESCE(SUM(CASE WHEN payment_method = 'qr_online' THEN total_cents ELSE 0 END), 0) as qr_total_cents
    FROM pos_sales
    WHERE business_id = ${businessId}
      AND payment_status = 'completed'
      AND DATE(created_at AT TIME ZONE 'Africa/Johannesburg') = ${targetDate}::date
  `;

  // Top products
  const topProducts = await db`
    SELECT 
      si.product_name,
      SUM(si.quantity) as total_quantity,
      SUM(si.total_cents) as total_sales_cents
    FROM pos_sale_items si
    JOIN pos_sales s ON si.sale_id = s.id
    WHERE s.business_id = ${businessId}
      AND s.payment_status = 'completed'
      AND DATE(s.created_at AT TIME ZONE 'Africa/Johannesburg') = ${targetDate}::date
    GROUP BY si.product_name
    ORDER BY total_sales_cents DESC
    LIMIT 5
  `;

  return {
    date: targetDate,
    summary,
    topProducts,
  };
}

export async function getPosFinancialLedger(businessId: string, limit = 50) {
  await ensurePosSchema();
  return db`
    SELECT * FROM pos_financial_ledger
    WHERE business_id = ${businessId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

// ==========================================
// 5. Staff & Roles
// ==========================================

export async function getPosStaff(businessId: string) {
  await ensurePosSchema();
  return db`
    SELECT sr.*, u.email, u.full_name, u.avatar_url
    FROM pos_staff_roles sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.business_id = ${businessId}
    ORDER BY sr.created_at ASC
  `;
}

export async function assignPosStaffRole(
  businessId: string,
  userId: string,
  role: 'owner' | 'manager' | 'cashier' | 'stock_controller',
  pin?: string,
  displayName?: string
) {
  await ensurePosSchema();
  const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

  const [staff] = await db`
    INSERT INTO pos_staff_roles (business_id, user_id, role, pin_hash, display_name)
    VALUES (${businessId}, ${userId}, ${role}, ${pinHash}, ${displayName || null})
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      pin_hash = COALESCE(EXCLUDED.pin_hash, pos_staff_roles.pin_hash),
      display_name = COALESCE(EXCLUDED.display_name, pos_staff_roles.display_name),
      updated_at = NOW()
    RETURNING *
  `;
  return staff;
}

export async function verifyPosStaffPin(businessId: string, pin: string) {
  await ensurePosSchema();
  const staffMembers = await db`
    SELECT sr.*, u.full_name, u.email
    FROM pos_staff_roles sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.business_id = ${businessId} AND sr.is_active = true AND sr.pin_hash IS NOT NULL
  `;

  for (const staff of staffMembers) {
    const isMatch = await bcrypt.compare(pin, staff.pin_hash);
    if (isMatch) {
      return {
        id: staff.id,
        userId: staff.user_id,
        fullName: staff.full_name,
        role: staff.role,
        displayName: staff.display_name || staff.full_name,
      };
    }
  }

  return null;
}

// ==========================================
// 6. Subscriptions & Admin Oversight
// ==========================================

export async function getPosSubscriptionPlans() {
  await ensurePosSchema();
  return db`
    SELECT * FROM pos_subscription_plans
    WHERE is_active = true
    ORDER BY sort_order ASC
  `;
}

export async function getMerchantPosSubscription(businessId: string) {
  await ensurePosSchema();
  const [sub] = await db`
    SELECT ms.*, p.name as plan_name, p.monthly_price_rand, p.setup_fee_rand,
      p.transaction_fee_percent as default_fee_percent, p.max_tills, p.max_staff, p.features
    FROM pos_merchant_subscriptions ms
    JOIN pos_subscription_plans p ON ms.plan_key = p.plan_key
    WHERE ms.business_id = ${businessId}
    LIMIT 1
  `;

  if (sub) return sub;

  // Auto-initiate 14-day free trial on Starter
  const [created] = await db`
    INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, setup_fee_paid)
    VALUES (${businessId}, 'starter', 'trial', false)
    ON CONFLICT DO NOTHING
    RETURNING *
  `;

  if (created) {
    return getMerchantPosSubscription(businessId);
  }

  return null;
}

export async function subscribeToPos(businessId: string, planKey: string, setupFeePaid = false) {
  await ensurePosSchema();
  const [updated] = await db`
    INSERT INTO pos_merchant_subscriptions (
      business_id, plan_key, status, setup_fee_paid, started_at, renews_at
    )
    VALUES (
      ${businessId}, ${planKey}, 'active', ${setupFeePaid}, NOW(), NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (business_id)
    DO UPDATE SET
      plan_key = EXCLUDED.plan_key,
      status = 'active',
      setup_fee_paid = EXCLUDED.setup_fee_paid OR pos_merchant_subscriptions.setup_fee_paid,
      renews_at = NOW() + INTERVAL '30 days',
      updated_at = NOW()
    RETURNING *
  `;
  return updated;
}

export async function getAdminPosMetrics() {
  await ensurePosSchema();

  const [metrics] = await db`
    SELECT
      COUNT(DISTINCT s.business_id) as total_active_merchants,
      COUNT(s.id) as total_sales_count,
      COALESCE(SUM(s.total_cents), 0) as gross_volume_cents,
      COALESCE(SUM(s.platform_fee_cents), 0) as platform_fees_accrued_cents,
      (SELECT COUNT(*) FROM pos_tills WHERE status = 'open') as open_tills_count,
      (SELECT COUNT(*) FROM pos_merchant_subscriptions WHERE status = 'active') as paid_subscriptions_count
    FROM pos_sales s
    WHERE s.payment_status = 'completed'
  `;

  const recentTransactions = await db`
    SELECT s.*, b.company_name
    FROM pos_sales s
    JOIN businesses b ON s.business_id = b.id
    ORDER BY s.created_at DESC
    LIMIT 10
  `;

  const topMerchants = await db`
    SELECT 
      b.id as business_id,
      b.company_name,
      COUNT(s.id) as sales_count,
      COALESCE(SUM(s.total_cents), 0) as total_volume_cents,
      COALESCE(SUM(s.platform_fee_cents), 0) as platform_fees_cents
    FROM businesses b
    JOIN pos_sales s ON b.id = s.business_id
    WHERE s.payment_status = 'completed'
    GROUP BY b.id, b.company_name
    ORDER BY total_volume_cents DESC
    LIMIT 10
  `;

  return {
    metrics,
    recentTransactions,
    topMerchants,
  };
}
