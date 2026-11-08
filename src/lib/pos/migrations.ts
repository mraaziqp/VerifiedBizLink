/**
 * POS schema migrations — the single source of truth for every POS table.
 *
 * Each entry runs once, in order, inside a transaction, and is recorded in
 * pos_schema_migrations. Every statement is written to be safe on a database
 * where an earlier, un-versioned copy of the schema already ran (the original
 * ensurePosSchema() created the v1 tables directly), so nothing here assumes a
 * clean slate: CREATE … IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, and
 * constraints added NOT VALID so historic rows are never rewritten.
 *
 * Applied automatically on first POS request by ensurePosSchema() (there is no
 * deploy-time migration step on Amplify), or by hand with
 * `npm run db:migrate:pos`.
 *
 * Never edit a migration that has shipped. Add a new one.
 */

export interface PosMigration {
  version: number;
  name: string;
  sql: string;
}

const V1_BASE_SCHEMA = `
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

INSERT INTO pos_subscription_plans (plan_key, name, monthly_price_rand, setup_fee_rand, transaction_fee_percent, max_tills, max_staff, features, sort_order)
VALUES
  ('starter', 'Starter Till', 99.00, 50.00, 1.00, 1, 2, '["1 Active Digital Till", "Mobile & Web Checkout", "Cash & card-machine sales", "Basic Inventory & Low-Stock Alerts", "Daily Sales & WhatsApp Receipts"]'::jsonb, 1),
  ('business', 'Business Storefront', 249.00, 50.00, 1.00, 3, 5, '["Up to 3 Tills", "Staff accounts with PIN switch", "Supplier Management & Purchase Orders", "Gross Profit & Stock Valuation", "Expenses tracking"]'::jsonb, 2),
  ('enterprise', 'Multi-Branch Enterprise', 599.00, 0.00, 0.85, 10, 25, '["Up to 10 Tills", "Consolidated Financial Ledger", "Priority Support", "Negotiable transaction fee", "Dedicated Account Manager"]'::jsonb, 3)
ON CONFLICT (plan_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS pos_merchant_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_key                TEXT NOT NULL DEFAULT 'starter' REFERENCES pos_subscription_plans(plan_key),
  status                  TEXT NOT NULL DEFAULT 'trial',
  setup_fee_paid          BOOLEAN NOT NULL DEFAULT false,
  transaction_fee_percent NUMERIC(5, 2),
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

CREATE TABLE IF NOT EXISTS pos_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  currency                TEXT NOT NULL DEFAULT 'ZAR',
  tax_rate_percent        NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
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

CREATE TABLE IF NOT EXISTS pos_tills (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  till_number             INTEGER NOT NULL DEFAULT 1,
  name                    TEXT NOT NULL DEFAULT 'Main Counter Till',
  status                  TEXT NOT NULL DEFAULT 'open',
  assigned_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  current_float_cents     BIGINT NOT NULL DEFAULT 50000,
  last_opened_at          TIMESTAMPTZ DEFAULT NOW(),
  last_closed_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, till_number)
);
CREATE INDEX IF NOT EXISTS idx_pos_tills_business ON pos_tills (business_id);

CREATE TABLE IF NOT EXISTS pos_categories (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  color                   TEXT DEFAULT '#d97706',
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_cat_business ON pos_categories (business_id);

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
  unit                    TEXT NOT NULL DEFAULT 'item',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_prod_business ON pos_products (business_id);
CREATE INDEX IF NOT EXISTS idx_pos_prod_barcode ON pos_products (business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_pos_prod_sku ON pos_products (business_id, sku);

CREATE TABLE IF NOT EXISTS pos_inventory_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  previous_quantity       NUMERIC(12, 2) NOT NULL,
  new_quantity            NUMERIC(12, 2) NOT NULL,
  change_quantity         NUMERIC(12, 2) NOT NULL,
  reason                  TEXT NOT NULL,
  reference_id            TEXT,
  notes                   TEXT,
  actor_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_inv_log_business ON pos_inventory_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_inv_log_product ON pos_inventory_logs (product_id);

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

CREATE TABLE IF NOT EXISTS pos_purchase_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id             UUID NOT NULL REFERENCES pos_suppliers(id) ON DELETE RESTRICT,
  po_number               TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft',
  total_cost_cents        BIGINT NOT NULL DEFAULT 0,
  notes                   TEXT,
  ordered_at              TIMESTAMPTZ,
  received_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_po_business ON pos_purchase_orders (business_id, created_at DESC);

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
  platform_fee_cents      BIGINT NOT NULL DEFAULT 0,
  provider_fee_cents      BIGINT NOT NULL DEFAULT 0,
  merchant_net_cents      BIGINT NOT NULL DEFAULT 0,
  payment_method          TEXT NOT NULL DEFAULT 'cash',
  payment_status          TEXT NOT NULL DEFAULT 'completed',
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

CREATE TABLE IF NOT EXISTS pos_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id                 UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  method                  TEXT NOT NULL,
  amount_cents            BIGINT NOT NULL,
  tender_amount_cents     BIGINT,
  change_amount_cents     BIGINT,
  card_last4              VARCHAR(4),
  card_brand              TEXT,
  provider                TEXT NOT NULL DEFAULT 'cash',
  provider_tx_id          TEXT,
  auth_code               TEXT,
  status                  TEXT NOT NULL DEFAULT 'approved',
  raw_meta                JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_payments_sale ON pos_payments (sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_business ON pos_payments (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pos_financial_ledger (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entry_type              TEXT NOT NULL,
  account_name            TEXT NOT NULL DEFAULT 'sales_revenue',
  debit_cents             BIGINT NOT NULL DEFAULT 0,
  credit_cents            BIGINT NOT NULL DEFAULT 0,
  balance_cents           BIGINT NOT NULL DEFAULT 0,
  fee_status              TEXT NOT NULL DEFAULT 'none',
  reference_type          TEXT NOT NULL,
  reference_id            TEXT NOT NULL,
  description             TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_ledger_business ON pos_financial_ledger (business_id, created_at DESC);
ALTER TABLE pos_financial_ledger ADD COLUMN IF NOT EXISTS account_name TEXT NOT NULL DEFAULT 'sales_revenue';
ALTER TABLE pos_financial_ledger ADD COLUMN IF NOT EXISTS fee_status TEXT NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS pos_staff_roles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL DEFAULT 'cashier',
  pin_hash                TEXT,
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
`;

const V2_HARDENING = `
-- ---------------------------------------------------------------------------
-- Settings: VAT is opt-in. Most stall owners are not VAT vendors, and a
-- receipt must not show VAT or call itself a tax invoice unless they are.
-- ---------------------------------------------------------------------------
ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS max_cashier_discount_bps INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS allow_custom_items BOOLEAN NOT NULL DEFAULT true;
UPDATE pos_settings SET vat_registered = true WHERE vat_number IS NOT NULL AND btrim(vat_number) <> '' AND vat_registered = false;

-- ---------------------------------------------------------------------------
-- Plans & subscriptions
-- ---------------------------------------------------------------------------
ALTER TABLE pos_subscription_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pos_subscription_plans ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS recurring_amount_cents BIGINT;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid_at TIMESTAMPTZ;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS last_payment_reference TEXT;
ALTER TABLE pos_merchant_subscriptions ADD COLUMN IF NOT EXISTS pending_plan_key TEXT;
ALTER TABLE pos_merchant_subscriptions ALTER COLUMN status SET DEFAULT 'inactive';
ALTER TABLE pos_merchant_subscriptions ALTER COLUMN trial_ends_at DROP DEFAULT;
ALTER TABLE pos_merchant_subscriptions ALTER COLUMN renews_at DROP DEFAULT;

-- The original code upserted ON CONFLICT (business_id) without a unique
-- constraint to conflict on. Remove auto-created duplicate trial rows that
-- never paid (keeping the oldest), then enforce one row per business.
DELETE FROM pos_merchant_subscriptions s
USING pos_merchant_subscriptions keep
WHERE s.business_id = keep.business_id
  AND s.id <> keep.id
  AND (keep.created_at, keep.id) < (s.created_at, s.id)
  AND s.payfast_token IS NULL
  AND s.setup_fee_paid = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_subs_business ON pos_merchant_subscriptions (business_id);

-- Activation used to be granted from a browser flag with no payment. A row
-- that is 'active' with no PayFast token was never paid for: it goes back to
-- 'inactive' (data untouched) and the merchant activates properly.
UPDATE pos_merchant_subscriptions
SET status = 'inactive', suspended_reason = 'activation_never_paid', updated_at = NOW()
WHERE status = 'active' AND payfast_token IS NULL;

-- ---------------------------------------------------------------------------
-- Per-business counters (receipt numbers, PO numbers, statements)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_counters (
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  last_number  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, kind)
);

-- ---------------------------------------------------------------------------
-- Fee rules: the only place a platform fee rate comes from.
-- Resolution order: merchant -> plan -> global, each by effective date.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_fee_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           TEXT NOT NULL CHECK (scope IN ('global', 'plan', 'merchant')),
  plan_key        TEXT REFERENCES pos_subscription_plans(plan_key),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  rate_bps        INTEGER NOT NULL DEFAULT 100 CHECK (rate_bps BETWEEN 0 AND 10000),
  fixed_cents     BIGINT NOT NULL DEFAULT 0 CHECK (fixed_cents >= 0),
  min_fee_cents   BIGINT CHECK (min_fee_cents IS NULL OR min_fee_cents >= 0),
  max_fee_cents   BIGINT CHECK (max_fee_cents IS NULL OR max_fee_cents >= 0),
  exempt          BOOLEAN NOT NULL DEFAULT false,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to    TIMESTAMPTZ,
  reason          TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope = 'global' AND plan_key IS NULL AND business_id IS NULL)
      OR (scope = 'plan' AND plan_key IS NOT NULL AND business_id IS NULL)
      OR (scope = 'merchant' AND business_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_pos_fee_rules_lookup ON pos_fee_rules (scope, business_id, plan_key, effective_from DESC);

INSERT INTO pos_fee_rules (scope, rate_bps, reason)
SELECT 'global', 100, 'Launch default: 1% of eligible completed sales'
WHERE NOT EXISTS (SELECT 1 FROM pos_fee_rules WHERE scope = 'global');

INSERT INTO pos_fee_rules (scope, plan_key, rate_bps, reason)
SELECT 'plan', p.plan_key, ROUND(p.transaction_fee_percent * 100)::int, 'Seeded from plan transaction_fee_percent'
FROM pos_subscription_plans p
WHERE NOT EXISTS (SELECT 1 FROM pos_fee_rules r WHERE r.scope = 'plan' AND r.plan_key = p.plan_key);

INSERT INTO pos_fee_rules (scope, business_id, rate_bps, reason)
SELECT 'merchant', s.business_id, ROUND(s.transaction_fee_percent * 100)::int, 'Seeded from legacy merchant override'
FROM pos_merchant_subscriptions s
WHERE s.transaction_fee_percent IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pos_fee_rules r WHERE r.scope = 'merchant' AND r.business_id = s.business_id);

-- ---------------------------------------------------------------------------
-- Sales: snapshot every rate used, so later config changes never rewrite
-- history; track refunds and where each fee is in its billing life.
-- ---------------------------------------------------------------------------
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS fee_rate_bps INTEGER;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS fee_rule_id UUID;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS fee_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS fee_statement_id UUID;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS refunded_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS fee_reversed_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE pos_sales SET completed_at = created_at WHERE completed_at IS NULL AND payment_status IN ('completed', 'refunded', 'partially_refunded');
UPDATE pos_sales SET fee_rate_bps = 100 WHERE fee_rate_bps IS NULL;
UPDATE pos_sales SET fee_status = 'accrued'
WHERE fee_status = 'none' AND platform_fee_cents > 0 AND payment_status IN ('completed', 'partially_refunded');

-- Receipt numbers were 4 random digits a day and could collide.
WITH d AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id, receipt_number ORDER BY created_at, id) AS rn
  FROM pos_sales
)
UPDATE pos_sales s SET receipt_number = s.receipt_number || '-' || d.rn
FROM d WHERE s.id = d.id AND d.rn > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_sales_receipt ON pos_sales (business_id, receipt_number);

-- Idempotency is per business. A global key let one merchant's retry find
-- another merchant's sale.
ALTER TABLE pos_sales DROP CONSTRAINT IF EXISTS pos_sales_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_sales_idempotency ON pos_sales (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_sales_fee ON pos_sales (business_id, fee_status, completed_at);

ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS refunded_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE pos_products ADD CONSTRAINT chk_pos_products_stock_nonneg CHECK (stock_quantity >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pos_products ADD CONSTRAINT chk_pos_products_prices_nonneg CHECK (selling_price_cents >= 0 AND cost_price_cents >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pos_sales ADD CONSTRAINT chk_pos_sales_money_nonneg
    CHECK (total_cents >= 0 AND platform_fee_cents >= 0 AND refunded_cents >= 0 AND refunded_cents <= total_cents AND fee_reversed_cents <= platform_fee_cents) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pos_sale_items ADD CONSTRAINT chk_pos_sale_items_refund CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Ledger journals: each financial event posts exactly once, balanced.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_ledger_journals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  journal_key     TEXT NOT NULL UNIQUE,
  kind            TEXT NOT NULL,
  reference_type  TEXT NOT NULL,
  reference_id    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pos_financial_ledger ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES pos_ledger_journals(id);
CREATE INDEX IF NOT EXISTS idx_pos_ledger_account ON pos_financial_ledger (business_id, account_name);
CREATE INDEX IF NOT EXISTS idx_pos_ledger_journal ON pos_financial_ledger (journal_id);

-- ---------------------------------------------------------------------------
-- Refunds: their own rows, never an edit of the sale.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id             UUID NOT NULL REFERENCES pos_sales(id) ON DELETE RESTRICT,
  amount_cents        BIGINT NOT NULL CHECK (amount_cents > 0),
  fee_reversal_cents  BIGINT NOT NULL DEFAULT 0 CHECK (fee_reversal_cents >= 0),
  reason              TEXT,
  restocked           BOOLEAN NOT NULL DEFAULT false,
  method              TEXT NOT NULL,
  fee_statement_id    UUID,
  actor_user_id       UUID,
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_refunds_sale ON pos_refunds (sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_refunds_business ON pos_refunds (business_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_refunds_idempotency ON pos_refunds (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_refund_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID NOT NULL REFERENCES pos_refunds(id) ON DELETE CASCADE,
  sale_item_id  UUID NOT NULL REFERENCES pos_sale_items(id) ON DELETE RESTRICT,
  quantity      NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  amount_cents  BIGINT NOT NULL CHECK (amount_cents >= 0)
);

-- ---------------------------------------------------------------------------
-- Monthly fee statements: how accrued fees become collected revenue.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_fee_statements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  statement_number      TEXT NOT NULL UNIQUE,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  sales_count           INTEGER NOT NULL DEFAULT 0,
  eligible_sales_cents  BIGINT NOT NULL DEFAULT 0,
  fees_accrued_cents    BIGINT NOT NULL DEFAULT 0,
  fee_reversals_cents   BIGINT NOT NULL DEFAULT 0,
  -- Signed: + an amount too small to collect carried in, - a credit carried in.
  carried_forward_cents BIGINT NOT NULL DEFAULT 0,
  net_due_cents         BIGINT NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'waived', 'credit', 'zero', 'carried')),
  due_at                TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  payment_reference     TEXT,
  waived_by             UUID,
  waived_reason         TEXT,
  -- A 'credit' statement (refunds exceeded fees) or a 'carried' one (owed,
  -- but below the smallest amount PayFast can collect) rolls into the next
  -- statement exactly once; this records which one absorbed it.
  carried_to            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_pos_fee_statements_status ON pos_fee_statements (status, due_at);

-- ---------------------------------------------------------------------------
-- What VerifiedBizLink has actually been paid. Platform revenue reports read
-- this table and nothing else.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_billing_charges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL CHECK (kind IN ('setup_fee', 'subscription', 'fee_statement')),
  amount_cents       BIGINT NOT NULL CHECK (amount_cents >= 0),
  payment_reference  TEXT NOT NULL,
  plan_key           TEXT,
  fee_statement_id   UUID REFERENCES pos_fee_statements(id),
  period_start       TIMESTAMPTZ,
  period_end         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, payment_reference)
);
CREATE INDEX IF NOT EXISTS idx_pos_billing_charges_business ON pos_billing_charges (business_id, created_at);

-- ---------------------------------------------------------------------------
-- Offline sync problems a person has to look at.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_stock_conflicts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id          UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES pos_products(id) ON DELETE SET NULL,
  requested_qty    NUMERIC(12, 2) NOT NULL,
  available_qty    NUMERIC(12, 2) NOT NULL,
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_stock_conflicts_open ON pos_stock_conflicts (business_id) WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- Expenses (kept apart from sales and from platform fees).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  description    TEXT,
  amount_cents   BIGINT NOT NULL CHECK (amount_cents > 0),
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id    UUID REFERENCES pos_suppliers(id) ON DELETE SET NULL,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_expenses_business ON pos_expenses (business_id, expense_date DESC);

-- ---------------------------------------------------------------------------
-- Purchasing: partial receipts.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_po_number ON pos_purchase_orders (business_id, po_number);

-- ---------------------------------------------------------------------------
-- Audit log for sensitive POS actions (admin reads included).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID,
  actor_user_id  UUID,
  actor_role     TEXT,
  action         TEXT NOT NULL,
  target_type    TEXT,
  target_id      TEXT,
  detail         JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_audit_business ON pos_audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_audit_created ON pos_audit_logs (created_at DESC);
`;

export const POS_MIGRATIONS: PosMigration[] = [
  { version: 1, name: 'base_schema', sql: V1_BASE_SCHEMA },
  { version: 2, name: 'hardening_billing_ledger', sql: V2_HARDENING },
];

export const LATEST_POS_SCHEMA_VERSION = POS_MIGRATIONS[POS_MIGRATIONS.length - 1].version;
