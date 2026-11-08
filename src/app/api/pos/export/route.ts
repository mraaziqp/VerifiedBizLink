import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { csvResponse } from '@/lib/pos/csv';
import { posErrorResponse } from '@/lib/pos/errors';
import { logPosAudit } from '@/lib/pos/audit';

/**
 * GET /api/pos/export?type=products|sales|sale_items|refunds|purchases|inventory_logs|ledger|fee_statements|expenses
 *
 * The merchant's data is theirs: every export works whatever the state of
 * their subscription.
 */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'export');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  const b = auth.businessId;
  try {
    const type = req.nextUrl.searchParams.get('type') || 'sales';
    let rows;
    switch (type) {
      case 'products':
        rows = await db`
          SELECT p.name, p.sku, p.barcode, c.name AS category, p.unit, p.cost_price_cents, p.selling_price_cents,
                 p.tax_rate_percent, p.stock_quantity, p.min_stock_threshold, p.is_active, p.created_at, p.updated_at
          FROM pos_products p LEFT JOIN pos_categories c ON c.id = p.category_id WHERE p.business_id = ${b} ORDER BY p.name`;
        break;
      case 'sales':
        rows = await db`
          SELECT receipt_number, created_at, completed_at, payment_method, payment_status, subtotal_cents, discount_cents,
                 tax_cents, total_cents, refunded_cents, platform_fee_cents, fee_reversed_cents, fee_rate_bps, fee_status,
                 payment_reference, is_offline_sync, offline_created_at, review_reason
          FROM pos_sales WHERE business_id = ${b} ORDER BY created_at`;
        break;
      case 'sale_items':
        rows = await db`
          SELECT s.receipt_number, s.created_at, i.product_name, i.quantity, i.refunded_quantity, i.unit_price_cents,
                 i.discount_cents, i.total_cents, i.cost_price_cents, i.is_custom
          FROM pos_sale_items i JOIN pos_sales s ON s.id = i.sale_id WHERE s.business_id = ${b} ORDER BY s.created_at`;
        break;
      case 'refunds':
        rows = await db`
          SELECT s.receipt_number, r.created_at, r.amount_cents, r.fee_reversal_cents, r.method, r.restocked, r.reason
          FROM pos_refunds r JOIN pos_sales s ON s.id = r.sale_id WHERE r.business_id = ${b} ORDER BY r.created_at`;
        break;
      case 'purchases':
        rows = await db`
          SELECT po.po_number, po.status, sp.name AS supplier, p.name AS product, i.quantity_ordered, i.quantity_received,
                 i.unit_cost_cents, i.total_cost_cents, po.ordered_at, po.received_at
          FROM pos_purchase_order_items i JOIN pos_purchase_orders po ON po.id = i.purchase_order_id
          JOIN pos_suppliers sp ON sp.id = po.supplier_id JOIN pos_products p ON p.id = i.product_id
          WHERE po.business_id = ${b} ORDER BY po.created_at`;
        break;
      case 'inventory_logs':
        rows = await db`
          SELECT l.created_at, p.name AS product, l.previous_quantity, l.change_quantity, l.new_quantity, l.reason, l.notes, u.email AS actor
          FROM pos_inventory_logs l JOIN pos_products p ON p.id = l.product_id LEFT JOIN users u ON u.id = l.actor_user_id
          WHERE l.business_id = ${b} ORDER BY l.created_at`;
        break;
      case 'ledger':
        rows = await db`
          SELECT l.created_at, j.journal_key, l.account_name, l.entry_type, l.debit_cents, l.credit_cents, l.fee_status, l.description
          FROM pos_financial_ledger l LEFT JOIN pos_ledger_journals j ON j.id = l.journal_id
          WHERE l.business_id = ${b} ORDER BY l.created_at, l.id`;
        break;
      case 'fee_statements':
        rows = await db`
          SELECT statement_number, period_start, period_end, sales_count, eligible_sales_cents, fees_accrued_cents,
                 fee_reversals_cents, carried_forward_cents, net_due_cents, status, due_at, paid_at, payment_reference
          FROM pos_fee_statements WHERE business_id = ${b} ORDER BY period_start`;
        break;
      case 'expenses':
        rows = await db`
          SELECT expense_date, category, description, amount_cents, created_at FROM pos_expenses WHERE business_id = ${b} ORDER BY expense_date`;
        break;
      default:
        return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
    }
    await logPosAudit({ businessId: b, actorUserId: auth.session.id, actorRole: auth.posRole, action: 'export', targetType: 'export', targetId: type, detail: { rows: rows.length } });
    return csvResponse(`verifiedbizlink-pos-${type}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  } catch (err) {
    return posErrorResponse(err);
  }
}
