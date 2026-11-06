import db from '@/lib/db';

let schemaReady: Promise<void> | null = null;

/**
 * Self-healing, zero-downtime, idempotent schema initialization for VerifiedBizLink POS.
 * Automatically runs on first access; safe across multiple serverless instances.
 */
export function ensurePosSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      // Check if core pos tables exist
      const [check] = await db`
        SELECT (to_regclass('pos_sales') IS NOT NULL) AS is_ready
      `;

      if (check?.is_ready === true) {
        return;
      }

      await db`
        DO $$
        BEGIN
          -- 1. POS Subscription Plans
          CREATE TABLE IF NOT EXISTS pos_subscription_plans (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_key                TEXT NOT NULL UNIQUE,
            name                    TEXT NOT NULL,
            monthly_price_rand      NUMERIC(10, 2) NOT NULL DEFAULT 99.00,
            setup_fee_rand          NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
            transaction_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
            max_tills               INTEGER NOT NULL DEFAULT 1,
            max_staff               INTEGER NOT NULL DEFAULT 2,
            features                JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_active               BOOLEAN NOT NULL DEFAULT true,
            sort_order              INTEGER NOT NULL DEFAULT 1,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          -- Seed Default Plans if not present
          INSERT INTO pos_subscription_plans (plan_key, name, monthly_price_rand, setup_fee_rand, transaction_fee_percent, max_tills, max_staff, features, sort_order)
          VALUES 
            ('starter', 'Starter Till', 99.00, 50.00, 1.00, 1, 2, '["1 Active Digital Till", "Mobile & Web Checkout", "Cash & Tap to Pay Ready", "Basic Inventory & Low-Stock Alerts", "Daily Sales & WhatsApp Receipts"]'::jsonb, 1),
            ('business', 'Business Storefront', 249.00, 50.00, 1.00, 3, 5, '["Up to 3 Tills & Terminals", "Unlimited Staff with PIN Switch", "Supplier Management & Purchase Orders", "Advanced Gross Profit & Stock Valuation", "Direct SoftPOS & Multi-Till Sync"]'::jsonb, 2),
            ('enterprise', 'Multi-Branch Enterprise', 599.00, 0.00, 0.85, 10, 25, '["Up to 10 Branches / Tills", "Consolidated Financial Ledger", "Custom SoftPOS Gateway Integrations", "VIP Priority Support & Settlement Routing", "Dedicated Account Manager"]'::jsonb, 3)
          ON CONFLICT (plan_key) DO NOTHING;

          -- 2. Merchant POS Subscriptions
          CREATE TABLE IF NOT EXISTS pos_merchant_subscriptions (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            plan_key                TEXT NOT NULL DEFAULT 'starter' REFERENCES pos_subscription_plans(plan_key),
            status                  TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'active' | 'past_due' | 'cancelled'
            setup_fee_paid          BOOLEAN NOT NULL DEFAULT false,
            transaction_fee_percent NUMERIC(5, 2), -- NULL means use plan default
            trial_ends_at           TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
            started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            renews_at               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
            cancelled_at            TIMESTAMPTZ,
            payfast_token           TEXT,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_subs_business ON pos_merchant_subscriptions (business_id);
          CREATE INDEX IF NOT EXISTS idx_pos_subs_status ON pos_merchant_subscriptions (status);

          -- 3. POS Business Settings
          CREATE TABLE IF NOT EXISTS pos_settings (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
            currency                TEXT NOT NULL DEFAULT 'ZAR',
            tax_rate_percent        NUMERIC(5, 2) NOT NULL DEFAULT 15.00, -- SA standard VAT is 15%
            vat_number              TEXT,
            receipt_header          TEXT DEFAULT 'Thank you for supporting local business!',
            receipt_footer          TEXT DEFAULT 'Verified by VerifiedBizLink.co.za',
            phone                   TEXT,
            email                   TEXT,
            address                 TEXT,
            auto_print_receipt      BOOLEAN NOT NULL DEFAULT false,
            allow_offline_sales     BOOLEAN NOT NULL DEFAULT true,
            cash_drawer_float_rand  NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          -- 4. POS Tills / Terminals
          CREATE TABLE IF NOT EXISTS pos_tills (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            till_number             INTEGER NOT NULL DEFAULT 1,
            name                    TEXT NOT NULL DEFAULT 'Main Counter Till',
            status                  TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
            assigned_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
            current_float_cents     BIGINT NOT NULL DEFAULT 50000,
            last_opened_at          TIMESTAMPTZ DEFAULT NOW(),
            last_closed_at          TIMESTAMPTZ,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (business_id, till_number)
          );
          CREATE INDEX IF NOT EXISTS idx_pos_tills_business ON pos_tills (business_id);

          -- 5. POS Product Categories
          CREATE TABLE IF NOT EXISTS pos_categories (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            name                    TEXT NOT NULL,
            color                   TEXT DEFAULT '#d97706', -- amber theme
            sort_order              INTEGER NOT NULL DEFAULT 0,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_cat_business ON pos_categories (business_id);

          -- 6. POS Products Catalog & Inventory
          CREATE TABLE IF NOT EXISTS pos_products (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            category_id             UUID REFERENCES pos_categories(id) ON DELETE SET NULL,
            name                    TEXT NOT NULL,
            sku                     TEXT,
            barcode                 TEXT,
            description             TEXT,
            image_url               TEXT,
            cost_price_cents        BIGINT NOT NULL DEFAULT 0,
            selling_price_cents     BIGINT NOT NULL DEFAULT 0,
            tax_rate_percent        NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
            stock_quantity          NUMERIC(12, 2) NOT NULL DEFAULT 0,
            min_stock_threshold     NUMERIC(12, 2) NOT NULL DEFAULT 5,
            unit                    TEXT NOT NULL DEFAULT 'item', -- 'item' | 'kg' | 'g' | 'l' | 'ml' | 'pack'
            is_active               BOOLEAN NOT NULL DEFAULT true,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_prod_business ON pos_products (business_id);
          CREATE INDEX IF NOT EXISTS idx_pos_prod_barcode ON pos_products (business_id, barcode);
          CREATE INDEX IF NOT EXISTS idx_pos_prod_sku ON pos_products (business_id, sku);

          -- 7. POS Inventory Logs (Audit Trail)
          CREATE TABLE IF NOT EXISTS pos_inventory_logs (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            product_id              UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
            previous_quantity       NUMERIC(12, 2) NOT NULL,
            new_quantity            NUMERIC(12, 2) NOT NULL,
            change_quantity         NUMERIC(12, 2) NOT NULL,
            reason                  TEXT NOT NULL, -- 'sale' | 'purchase_receive' | 'manual_adjustment' | 'waste_damaged' | 'return_refund' | 'initial_count'
            reference_id            TEXT, -- e.g. sale_id or po_id
            notes                   TEXT,
            actor_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_inv_log_business ON pos_inventory_logs (business_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_pos_inv_log_product ON pos_inventory_logs (product_id);

          -- 8. POS Suppliers
          CREATE TABLE IF NOT EXISTS pos_suppliers (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            name                    TEXT NOT NULL,
            contact_person          TEXT,
            email                   TEXT,
            phone                   TEXT,
            address                 TEXT,
            tax_number              TEXT,
            notes                   TEXT,
            is_active               BOOLEAN NOT NULL DEFAULT true,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_suppliers_business ON pos_suppliers (business_id);

          -- 9. POS Purchase Orders
          CREATE TABLE IF NOT EXISTS pos_purchase_orders (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            supplier_id             UUID NOT NULL REFERENCES pos_suppliers(id) ON DELETE RESTRICT,
            po_number               TEXT NOT NULL,
            status                  TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'ordered' | 'received' | 'cancelled'
            total_cost_cents        BIGINT NOT NULL DEFAULT 0,
            notes                   TEXT,
            ordered_at              TIMESTAMPTZ,
            received_at             TIMESTAMPTZ,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_po_business ON pos_purchase_orders (business_id, created_at DESC);

          -- 10. POS Purchase Order Line Items
          CREATE TABLE IF NOT EXISTS pos_purchase_order_items (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            purchase_order_id       UUID NOT NULL REFERENCES pos_purchase_orders(id) ON DELETE CASCADE,
            product_id              UUID NOT NULL REFERENCES pos_products(id) ON DELETE RESTRICT,
            quantity_ordered        NUMERIC(12, 2) NOT NULL,
            quantity_received       NUMERIC(12, 2) NOT NULL DEFAULT 0,
            unit_cost_cents         BIGINT NOT NULL DEFAULT 0,
            total_cost_cents        BIGINT NOT NULL DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS idx_pos_po_items ON pos_purchase_order_items (purchase_order_id);

          -- 11. POS Sales Header
          CREATE TABLE IF NOT EXISTS pos_sales (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            till_id                 UUID REFERENCES pos_tills(id) ON DELETE SET NULL,
            cashier_id              UUID REFERENCES users(id) ON DELETE SET NULL,
            receipt_number          TEXT NOT NULL,
            subtotal_cents          BIGINT NOT NULL DEFAULT 0,
            tax_cents               BIGINT NOT NULL DEFAULT 0,
            discount_cents          BIGINT NOT NULL DEFAULT 0,
            total_cents             BIGINT NOT NULL DEFAULT 0,
            platform_fee_cents      BIGINT NOT NULL DEFAULT 0, -- 1% platform fee
            provider_fee_cents      BIGINT NOT NULL DEFAULT 0, -- e.g. 2.75% Yoco / acquiring fee
            merchant_net_cents      BIGINT NOT NULL DEFAULT 0,
            payment_method          TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'card_tap' | 'qr_online' | 'split'
            payment_status          TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'refunded' | 'partially_refunded' | 'cancelled'
            customer_name           TEXT,
            customer_phone          TEXT,
            customer_email          TEXT,
            notes                   TEXT,
            idempotency_key         TEXT UNIQUE,
            is_offline_sync         BOOLEAN NOT NULL DEFAULT false,
            offline_created_at      TIMESTAMPTZ,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_sales_business ON pos_sales (business_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_pos_sales_receipt ON pos_sales (business_id, receipt_number);

          -- 12. POS Sale Line Items
          CREATE TABLE IF NOT EXISTS pos_sale_items (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sale_id                 UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
            product_id              UUID REFERENCES pos_products(id) ON DELETE SET NULL,
            product_name            TEXT NOT NULL,
            quantity                NUMERIC(12, 2) NOT NULL,
            unit_price_cents        BIGINT NOT NULL DEFAULT 0,
            cost_price_cents        BIGINT NOT NULL DEFAULT 0,
            total_cents             BIGINT NOT NULL DEFAULT 0,
            discount_cents          BIGINT NOT NULL DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items (sale_id);

          -- 13. POS Payments Ledger
          CREATE TABLE IF NOT EXISTS pos_payments (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sale_id                 UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            method                  TEXT NOT NULL, -- 'cash' | 'card_tap' | 'qr_online'
            amount_cents            BIGINT NOT NULL,
            tender_amount_cents     BIGINT, -- cash given
            change_amount_cents     BIGINT, -- change returned
            card_last4              VARCHAR(4),
            card_brand              TEXT, -- 'visa' | 'mastercard' | 'amex'
            provider                TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'softpos_yoco' | 'softpos_realpay' | 'apple_tap_to_pay' | 'payfast' | 'sandbox'
            provider_tx_id          TEXT,
            auth_code               TEXT,
            status                  TEXT NOT NULL DEFAULT 'approved', -- 'approved' | 'declined' | 'refunded'
            raw_meta                JSONB,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_payments_sale ON pos_payments (sale_id);
          CREATE INDEX IF NOT EXISTS idx_pos_payments_business ON pos_payments (business_id, created_at DESC);

          -- 14. POS Financial Ledger (Auditable Double-Entry Ledger)
          CREATE TABLE IF NOT EXISTS pos_financial_ledger (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            entry_type              TEXT NOT NULL, -- 'sale_proceeds' | 'payment_received' | 'platform_fee' | 'fee_accrued' | 'fee_collected' | 'fee_reversal' | 'refund_deduction' | 'refund_payout'
            account_name            TEXT NOT NULL DEFAULT 'sales_revenue', -- 'sales_revenue' | 'cash_on_hand' | 'electronic_clearing' | 'platform_fee_expense' | 'platform_fee_payable' | 'platform_revenue' | 'sales_returns'
            debit_cents             BIGINT NOT NULL DEFAULT 0,
            credit_cents            BIGINT NOT NULL DEFAULT 0,
            balance_cents           BIGINT NOT NULL DEFAULT 0,
            fee_status              TEXT NOT NULL DEFAULT 'none', -- 'none' | 'accrued' | 'collected' | 'reversed'
            reference_type          TEXT NOT NULL, -- 'sale' | 'payment' | 'refund' | 'payout'
            reference_id            TEXT NOT NULL,
            description             TEXT NOT NULL,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pos_ledger_business ON pos_financial_ledger (business_id, created_at DESC);
          ALTER TABLE pos_financial_ledger ADD COLUMN IF NOT EXISTS account_name TEXT NOT NULL DEFAULT 'sales_revenue';
          ALTER TABLE pos_financial_ledger ADD COLUMN IF NOT EXISTS fee_status TEXT NOT NULL DEFAULT 'none';

          -- 15. POS Staff & Role Assignments
          CREATE TABLE IF NOT EXISTS pos_staff_roles (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role                    TEXT NOT NULL DEFAULT 'cashier', -- 'owner' | 'manager' | 'cashier' | 'stock_controller'
            pin_hash                TEXT, -- bcrypt of 4-digit PIN for quick till switch
            display_name            TEXT,
            is_active               BOOLEAN NOT NULL DEFAULT true,
            failed_pin_attempts     INT NOT NULL DEFAULT 0,
            locked_until            TIMESTAMPTZ,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (business_id, user_id)
          );
          CREATE INDEX IF NOT EXISTS idx_pos_staff_business ON pos_staff_roles (business_id);
          ALTER TABLE pos_staff_roles ADD COLUMN IF NOT EXISTS failed_pin_attempts INT NOT NULL DEFAULT 0;
          ALTER TABLE pos_staff_roles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
        END $$;
      `;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
