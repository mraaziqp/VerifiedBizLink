/**
 * VerifiedBizLink POS — end-to-end tests against a real (throwaway) Postgres.
 *
 * Run: npm run test:pos
 *
 * Every test goes through the actual route handlers or service functions,
 * with the real migrations applied. Nothing is mocked except PayFast's
 * network endpoints (ITN validation and subscription cancel), which are
 * stubbed so no test can reach the internet.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  startDatabase, stopDatabase, sql, createMerchant, createProduct, createUser, addStaff, call, key,
  installFetchStub, signedItn, makeRequest, setEnv, type TestMerchant, type TestUser, type Handler,
} from './harness';

// Route handlers (imported after the harness has set the environment).
let checkout: { POST: Handler };
let refund: { POST: Handler };
let sales: { GET: Handler };
let products: { GET: Handler; POST: Handler };
let productById: { PATCH: Handler };
let purchasing: { GET: Handler; POST: Handler };
let suppliers: { GET: Handler; POST: Handler };
let staff: { GET: Handler; POST: Handler };
let reports: { GET: Handler };
let settings: { GET: Handler; PATCH: Handler };
let subscription: { GET: Handler; POST: Handler };
let fees: { GET: Handler; POST: Handler };
let tills: { GET: Handler; POST: Handler };
let exportRoute: { GET: Handler };
let expenses: { GET: Handler; POST: Handler };
let adminPos: { GET: Handler; POST: Handler };
let itn: { POST: Handler };
let cronPos: { GET: Handler };

let A: TestMerchant; // starter
let B: TestMerchant; // starter, VAT registered
let C: TestMerchant; // business plan
let platformAdmin: TestUser;
let complianceAdmin: TestUser;

const sale = (m: TestMerchant | TestUser, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  call(checkout.POST, 'POST', '/api/pos/checkout', { user: 'owner' in m ? m.owner : m, body: { idempotencyKey: key('sale'), paymentMethod: 'cash', ...body }, headers });

async function ledgerBalanced(businessId: string) {
  const [t] = await sql`SELECT COALESCE(SUM(debit_cents),0) AS d, COALESCE(SUM(credit_cents),0) AS c FROM pos_financial_ledger WHERE business_id = ${businessId} AND journal_id IS NOT NULL`;
  const unbalanced = await sql`
    SELECT journal_id FROM pos_financial_ledger WHERE business_id = ${businessId} AND journal_id IS NOT NULL
    GROUP BY journal_id HAVING SUM(debit_cents) <> SUM(credit_cents)`;
  return { debit: Number(t.d), credit: Number(t.c), unbalancedJournals: unbalanced.length };
}

async function stockOf(productId: string) {
  const [p] = await sql`SELECT stock_quantity FROM pos_products WHERE id = ${productId}`;
  return Number(p.stock_quantity);
}

before(async () => {
  const { applied } = await startDatabase();
  assert.deepEqual(applied, [1, 2], 'both migrations apply to a fresh database');
  installFetchStub();
  setEnv('NODE_ENV', 'test');
  delete process.env.POS_ALLOW_SANDBOX;
  delete process.env.POS_PLATFORM_COLLECTION_APPROVED;

  checkout = await import('../../src/app/api/pos/checkout/route');
  refund = await import('../../src/app/api/pos/sales/[id]/refund/route');
  sales = await import('../../src/app/api/pos/sales/route');
  products = await import('../../src/app/api/pos/products/route');
  productById = await import('../../src/app/api/pos/products/[id]/route');
  purchasing = await import('../../src/app/api/pos/purchasing/route');
  suppliers = await import('../../src/app/api/pos/suppliers/route');
  staff = await import('../../src/app/api/pos/staff/route');
  reports = await import('../../src/app/api/pos/reports/route');
  settings = await import('../../src/app/api/pos/settings/route');
  subscription = await import('../../src/app/api/pos/subscription/route');
  fees = await import('../../src/app/api/pos/fees/route');
  tills = await import('../../src/app/api/pos/tills/route');
  exportRoute = await import('../../src/app/api/pos/export/route');
  expenses = await import('../../src/app/api/pos/expenses/route');
  adminPos = await import('../../src/app/api/admin/pos/route');
  itn = await import('../../src/app/api/payfast/notify/route');
  cronPos = await import('../../src/app/api/cron/pos-billing/route');

  A = await createMerchant('Alpha Stall');
  B = await createMerchant('Bravo Spaza', { vat: true });
  C = await createMerchant('Charlie Clothing', { plan: 'business' });
  platformAdmin = await createUser('admin@test.local', 'admin');
  complianceAdmin = await createUser('compliance@test.local', 'compliance_admin');
}, { timeout: 180_000 });

after(async () => {
  await stopDatabase();
});

// ===========================================================================
describe('schema migrations', () => {
  it('re-running migrations applies nothing', async () => {
    const { runPendingPosMigrations } = await import('../../src/lib/pos/schema');
    assert.deepEqual(await runPendingPosMigrations(), []);
  });

  it('v2 repairs a database created by the old un-versioned schema', async () => {
    // Simulate the legacy state on a fresh business: a subscription marked
    // active without payment, and duplicate receipt numbers.
    const { POS_MIGRATIONS } = await import('../../src/lib/pos/migrations');
    assert.equal(POS_MIGRATIONS.length, 2);
    const m = await createMerchant('Legacy Store', { active: false });
    await sql`INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, setup_fee_paid) VALUES (${m.businessId}, 'starter', 'active', false)`;
    // The old random receipt numbers could collide.
    await sql`DROP INDEX uq_pos_sales_receipt`;
    await sql`INSERT INTO pos_sales (business_id, receipt_number, total_cents, payment_status) VALUES (${m.businessId}, 'VBL-20261101-1234', 100, 'completed'), (${m.businessId}, 'VBL-20261101-1234', 100, 'completed')`;
    // Re-apply the v2 SQL (it must be safe to run again over real data).
    const { withTransaction } = await import('../../src/lib/db');
    await withTransaction(async (tx) => { await tx([POS_MIGRATIONS[1].sql] as unknown as TemplateStringsArray); });
    const [sub] = await sql`SELECT status, suspended_reason FROM pos_merchant_subscriptions WHERE business_id = ${m.businessId}`;
    assert.equal(sub.status, 'inactive', 'free "active" subscription without a PayFast token is reset');
    assert.equal(sub.suspended_reason, 'activation_never_paid');
    const receipts = await sql`SELECT receipt_number FROM pos_sales WHERE business_id = ${m.businessId} ORDER BY receipt_number`;
    assert.deepEqual(receipts.map((r) => r.receipt_number), ['VBL-20261101-1234', 'VBL-20261101-1234-2']);
    const [idx] = await sql`SELECT 1 FROM pg_indexes WHERE indexname = 'uq_pos_sales_receipt'`;
    assert.ok(idx, 'unique receipt index re-created after de-duplication');
  });
});

// ===========================================================================
describe('fee engine (pure)', async () => {
  const { percentOfCents, calculatePlatformFee, feeReversalFor, FALLBACK_FEE_RULE } = await import('../../src/lib/pos/fees');
  const { vatInclusiveCents, lineGrossCents } = await import('../../src/lib/pos/money');

  it('1% rounds half-up to the cent', () => {
    assert.equal(percentOfCents(1, 100), 0);          // R0.01 -> 0.01c -> 0
    assert.equal(percentOfCents(49, 100), 0);         // R0.49 -> 0.49c -> 0
    assert.equal(percentOfCents(50, 100), 1);         // R0.50 -> 0.5c -> 1c
    assert.equal(percentOfCents(9999, 100), 100);     // R99.99 -> 99.99c -> 100c
    assert.equal(percentOfCents(10000, 100), 100);    // R100 -> R1
    assert.equal(percentOfCents(10_000_000, 100), 100_000); // R100 000 -> R1 000
    assert.equal(percentOfCents(15000, 85), 128);     // 0.85% of R150 = 127.5c -> 128c
  });

  it('min, cap, fixed and exemption', () => {
    const rule = { ...FALLBACK_FEE_RULE, rateBps: 100 };
    assert.equal(calculatePlatformFee(10000, { ...rule, minFeeCents: 200 }).feeCents, 200);
    assert.equal(calculatePlatformFee(10_000_000, { ...rule, maxFeeCents: 5000 }).feeCents, 5000);
    assert.equal(calculatePlatformFee(10000, { ...rule, fixedCents: 50 }).feeCents, 150);
    assert.equal(calculatePlatformFee(10000, { ...rule, exempt: true }).feeCents, 0);
    assert.equal(calculatePlatformFee(100, { ...rule, minFeeCents: 500 }).feeCents, 100, 'never more than the sale');
  });

  it('partial fee reversals add up to exactly the fee', () => {
    const total = 9999, fee = 100;
    let refunded = 0, reversed = 0;
    for (const part of [3333, 3333, 3333]) {
      reversed += feeReversalFor({ saleTotalCents: total, saleFeeCents: fee, alreadyRefundedCents: refunded, alreadyReversedFeeCents: reversed, refundCents: part });
      refunded += part;
    }
    assert.equal(refunded, total);
    assert.equal(reversed, fee);
  });

  it('VAT-inclusive component and fractional quantities', () => {
    assert.equal(vatInclusiveCents(11500, 1500), 1500);
    assert.equal(vatInclusiveCents(15000, 1500), 1957);
    assert.equal(lineGrossCents(1999, 0.5), 1000); // 999.5c -> 1000c
    assert.equal(lineGrossCents(1999, 3), 5997);
  });
});

// ===========================================================================
describe('checkout', () => {
  it('prices come from the catalogue, never the request', async () => {
    const p = await createProduct(A, 'Vetkoek', 1500, 50);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 2, unitPriceCents: 1, costPriceCents: 0 }], tenderAmountCents: 5000 });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(Number(r.json.sale.total_cents), 3000);
    assert.equal(Number(r.json.sale.platform_fee_cents), 30);
    assert.equal(Number(r.json.sale.fee_rate_bps), 100);
    assert.equal(r.json.sale.fee_status, 'accrued');
    assert.equal(Number(r.json.payment.change_amount_cents), 2000);
    assert.equal(await stockOf(p.id), 48);
    assert.match(r.json.sale.receipt_number, /^VBL-\d{6}$/);
  });

  it('a non-VAT merchant charges no VAT; a VAT vendor shows the inclusive 15%', async () => {
    const pa = await createProduct(A, 'Juice', 11500, 10);
    const pb = await createProduct(B, 'Juice', 11500, 10);
    const ra = await sale(A, { items: [{ productId: pa.id, quantity: 1 }] });
    const rb = await sale(B, { items: [{ productId: pb.id, quantity: 1 }] });
    assert.equal(Number(ra.json.sale.tax_cents), 0);
    assert.equal(ra.json.sale.vat_registered, false);
    assert.equal(Number(rb.json.sale.tax_cents), 1500);
    assert.equal(rb.json.sale.vat_registered, true);
  });

  it('weighed goods round half-up', async () => {
    const p = await createProduct(A, 'Tomatoes (kg)', 1999, 20);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 0.5 }] });
    assert.equal(Number(r.json.sale.total_cents), 1000);
  });

  it('custom items use their own price; zero, negative and silly quantities are refused', async () => {
    const ok = await sale(A, { items: [{ custom: { name: 'Phone repair', unitPriceCents: 15000 }, quantity: 1 }] });
    assert.equal(ok.status, 201);
    assert.equal(Number(ok.json.sale.total_cents), 15000);
    const p = await createProduct(A, 'Bread', 2000, 10);
    for (const q of [0, -1, 1.234, 'x']) {
      const r = await sale(A, { items: [{ productId: p.id, quantity: q }] });
      assert.equal(r.status, 400, `quantity ${q}`);
    }
  });

  it('cash tendered below the total is declined and nothing is recorded', async () => {
    const p = await createProduct(A, 'Airtime', 5000, 5);
    const before = await sql`SELECT COUNT(*)::int AS n FROM pos_sales WHERE business_id = ${A.businessId}`;
    const r = await sale(A, { items: [{ productId: p.id, quantity: 1 }], tenderAmountCents: 4000 });
    assert.equal(r.status, 402);
    const afterRows = await sql`SELECT COUNT(*)::int AS n FROM pos_sales WHERE business_id = ${A.businessId}`;
    assert.equal(afterRows[0].n, before[0].n);
    assert.equal(await stockOf(p.id), 5);
  });

  it('card on the merchant’s own machine records the reference', async () => {
    const p = await createProduct(A, 'Shoes', 45000, 3);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'card_external', externalReference: 'YOCO-123456' });
    assert.equal(r.status, 201);
    assert.equal(r.json.sale.payment_method, 'card_external');
    assert.equal(r.json.sale.payment_reference, 'YOCO-123456');
    assert.equal(r.json.payment.provider, 'external_terminal');
  });

  it('an idempotency key is required', async () => {
    const p = await createProduct(A, 'Gum', 500, 5);
    const r = await call(checkout.POST, 'POST', '/api/pos/checkout', { user: A.owner, body: { items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'cash' } });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, 'IDEMPOTENCY_REQUIRED');
  });
});

// ===========================================================================
describe('payment safety', () => {
  it('in production the sandbox is unreachable, whatever the request says', async () => {
    const p = await createProduct(A, 'Prod guard item', 1000, 10);
    const prev = process.env.NODE_ENV;
    setEnv('NODE_ENV', 'production');
    process.env.POS_ALLOW_SANDBOX = 'true';
    try {
      const tap = await sale(A, { items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'card_tap', useSandbox: true });
      assert.equal(tap.status, 409);
      assert.equal(tap.json.code, 'PAYMENT_UNAVAILABLE');
      const qr = await sale(A, { items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'qr_online' });
      assert.equal(qr.status, 409);
      const { SandboxPaymentAdapter } = await import('../../src/lib/pos/payments/sandbox-adapter');
      await assert.rejects(new SandboxPaymentAdapter().initiate({ saleId: 'x', businessId: 'y', amountCents: 1, currency: 'ZAR', method: 'card_tap', idempotencyKey: 'k' }));
    } finally {
      setEnv('NODE_ENV', prev);
      delete process.env.POS_ALLOW_SANDBOX;
    }
    assert.equal(await stockOf(p.id), 10);
  });

  it('tap-on-phone and QR are off by default (awaiting approval)', async () => {
    const p = await createProduct(A, 'Default-off item', 1000, 10);
    for (const method of ['card_tap', 'qr_online']) {
      const r = await sale(A, { items: [{ productId: p.id, quantity: 1 }], paymentMethod: method });
      assert.equal(r.status, 409, method);
    }
    const s = await call(settings.GET, 'GET', '/api/pos/settings', { user: A.owner });
    const methods = Object.fromEntries((s.json.paymentMethods as { method: string; enabled: boolean }[]).map((m) => [m.method, m.enabled]));
    assert.deepEqual(methods, { cash: true, card_external: true, card_tap: false, qr_online: false });
  });

  it('the real SoftPOS / Tap to Pay adapters never approve', async () => {
    const { SoftPosPaymentAdapter } = await import('../../src/lib/pos/payments/softpos-adapter');
    const { AppleTapToPayAdapter } = await import('../../src/lib/pos/payments/apple-tap-to-pay-adapter');
    const req = { saleId: 'x', businessId: 'y', amountCents: 100, currency: 'ZAR', method: 'card_tap' as const, idempotencyKey: 'k' };
    await assert.rejects(new SoftPosPaymentAdapter().initiate(req));
    await assert.rejects(new AppleTapToPayAdapter().initiate(req));
  });
});

// ===========================================================================
describe('concurrency & idempotency', () => {
  it('20 tills racing for the last unit: exactly one sale wins', async () => {
    const p = await createProduct(A, 'Last loaf', 2000, 1);
    const results = await Promise.all(Array.from({ length: 20 }, () => sale(A, { items: [{ productId: p.id, quantity: 1 }] })));
    const wins = results.filter((r) => r.status === 201).length;
    const stockOut = results.filter((r) => r.status === 409 && r.json.code === 'INSUFFICIENT_STOCK').length;
    assert.equal(wins, 1, JSON.stringify(results.map((r) => r.status)));
    assert.equal(stockOut, 19);
    assert.equal(await stockOf(p.id), 0);
  });

  it('the same idempotency key 10 times in parallel makes one sale, one journal, one stock move', async () => {
    const p = await createProduct(A, 'Idem item', 1000, 50);
    const k = key('idem');
    const results = await Promise.all(Array.from({ length: 10 }, () => sale(A, { idempotencyKey: k, items: [{ productId: p.id, quantity: 2 }] })));
    assert.ok(results.every((r) => r.status === 200 || r.status === 201), JSON.stringify(results.map((r) => [r.status, r.json.error])));
    const ids = new Set(results.map((r) => r.json.sale.id));
    assert.equal(ids.size, 1);
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_sales WHERE business_id = ${A.businessId} AND idempotency_key = ${k}`;
    assert.equal(n, 1);
    const [{ j }] = await sql`SELECT COUNT(*)::int AS j FROM pos_ledger_journals WHERE journal_key = ${`sale:${[...ids][0]}`}`;
    assert.equal(j, 1);
    assert.equal(await stockOf(p.id), 48);
  });

  it('idempotency keys are per business (no cross-tenant lookup)', async () => {
    const pa = await createProduct(A, 'Shared-key A', 1000, 5);
    const pb = await createProduct(B, 'Shared-key B', 2000, 5);
    const k = key('shared');
    const ra = await sale(A, { idempotencyKey: k, items: [{ productId: pa.id, quantity: 1 }] });
    const rb = await sale(B, { idempotencyKey: k, items: [{ productId: pb.id, quantity: 1 }] });
    assert.equal(ra.status, 201);
    assert.equal(rb.status, 201);
    assert.notEqual(ra.json.sale.id, rb.json.sale.id);
    assert.equal(rb.json.sale.business_id, B.businessId);
  });
});

// ===========================================================================
describe('tenant isolation', () => {
  let bProduct: Record<string, unknown>;
  let bSale: Record<string, unknown>;
  let bSupplier: Record<string, unknown>;

  before(async () => {
    bProduct = await createProduct(B, 'Bravo secret item', 9900, 10);
    bSale = (await sale(B, { items: [{ productId: bProduct.id, quantity: 1 }] })).json.sale;
    bSupplier = (await call(suppliers.POST, 'POST', '/api/pos/suppliers', { user: B.owner, body: { name: 'Bravo Supplier' } })).json.supplier;
  });

  it('A cannot sell B’s product', async () => {
    const r = await sale(A, { items: [{ productId: bProduct.id, quantity: 1 }] });
    assert.equal(r.status, 404);
    assert.equal(await stockOf(String(bProduct.id)), 9);
  });

  it('A cannot read, refund, edit or adjust B’s records', async () => {
    assert.equal((await call(sales.GET, 'GET', '/api/pos/sales', { user: A.owner, query: { id: String(bSale.id) } })).status, 404);
    assert.equal((await call(refund.POST, 'POST', `/api/pos/sales/${bSale.id}/refund`, { user: A.owner, body: { idempotencyKey: key('r'), reason: 'x' } }, { id: String(bSale.id) })).status, 404);
    assert.equal((await call(productById.PATCH, 'PATCH', `/api/pos/products/${bProduct.id}`, { user: A.owner, body: { sellingPriceCents: 1 } }, { id: String(bProduct.id) })).status, 404);
    assert.equal((await call(products.POST, 'POST', '/api/pos/products', { user: A.owner, body: { action: 'adjust_stock', productId: bProduct.id, change: -5, reason: 'manual_adjustment', notes: 'steal' } })).status, 404);
    const [p] = await sql`SELECT selling_price_cents, stock_quantity FROM pos_products WHERE id = ${bProduct.id}`;
    assert.equal(Number(p.selling_price_cents), 9900);
    assert.equal(Number(p.stock_quantity), 9);
  });

  it('A cannot order from B’s supplier or put B’s product on an order', async () => {
    const pa = await createProduct(A, 'A PO item', 1000, 0);
    const own = (await call(suppliers.POST, 'POST', '/api/pos/suppliers', { user: A.owner, body: { name: 'Alpha Supplier' } })).json.supplier;
    assert.equal((await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: A.owner, body: { supplierId: bSupplier.id, items: [{ productId: pa.id, quantity: 1, unitCostCents: 100 }] } })).status, 404);
    assert.equal((await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: A.owner, body: { supplierId: own.id, items: [{ productId: bProduct.id, quantity: 1, unitCostCents: 100 }] } })).status, 404);
  });

  it('naming another business in the header gets nothing', async () => {
    const r = await call(sales.GET, 'GET', '/api/pos/sales', { user: A.owner, headers: { 'x-business-id': B.businessId } });
    assert.equal(r.status, 401);
  });

  it('lists and exports contain only the caller’s data', async () => {
    const list = await call(sales.GET, 'GET', '/api/pos/sales', { user: A.owner, query: { limit: '500' } });
    assert.ok(list.json.sales.length > 0);
    assert.ok(list.json.sales.every((s: { business_id: string }) => s.business_id === A.businessId));
    const prods = await call(products.GET, 'GET', '/api/pos/products', { user: A.owner });
    assert.ok(prods.json.products.every((p: { business_id: string }) => p.business_id === A.businessId));
    const csv = await call(exportRoute.GET, 'GET', '/api/pos/export', { user: A.owner, query: { type: 'sales' } });
    assert.equal(csv.status, 200);
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_sales WHERE business_id = ${A.businessId}`;
    assert.equal(csv.text.trim().split('\r\n').length - 1, n);
  });

  it('a stranger with no business gets 401 everywhere', async () => {
    const stranger = await createUser('stranger@test.local');
    for (const [h, method, p] of [[sales.GET, 'GET', '/api/pos/sales'], [products.GET, 'GET', '/api/pos/products'], [fees.GET, 'GET', '/api/pos/fees']] as const) {
      assert.equal((await call(h as Handler, method, p, { user: stranger })).status, 401, p);
    }
  });
});

// ===========================================================================
describe('refunds', () => {
  it('full refund: stock back, fee reversed, ledger balanced', async () => {
    const p = await createProduct(C, 'Jacket', 50000, 5);
    const s = (await sale(C, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    const r = await call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: key('rf'), reason: 'Wrong size' } }, { id: s.id });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.sale.payment_status, 'refunded');
    assert.equal(Number(r.json.refund.amount_cents), 50000);
    assert.equal(Number(r.json.refund.fee_reversal_cents), 500);
    assert.equal(await stockOf(p.id), 5);
    assert.ok(r.json.instructions?.includes('cash drawer'));
    const again = await call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: key('rf'), reason: 'again' } }, { id: s.id });
    assert.equal(again.status, 409);
    assert.deepEqual(await ledgerBalanced(C.businessId).then((l) => l.unbalancedJournals), 0);
  });

  it('partial refunds are proportional and never exceed the fee', async () => {
    const p = await createProduct(C, 'Socks', 3333, 10);
    const s = (await sale(C, { items: [{ productId: p.id, quantity: 3 }] })).json.sale; // R99.99, fee 100c
    const [item] = await sql`SELECT id FROM pos_sale_items WHERE sale_id = ${s.id}`;
    const r1 = await call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: key('p1'), reason: 'one pair', items: [{ saleItemId: item.id, quantity: 1 }] } }, { id: s.id });
    assert.equal(r1.status, 200);
    assert.equal(r1.json.sale.payment_status, 'partially_refunded');
    assert.equal(Number(r1.json.refund.amount_cents), 3333);
    assert.equal(Number(r1.json.refund.fee_reversal_cents), 33);
    const over = await call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: key('p2'), reason: 'too many', items: [{ saleItemId: item.id, quantity: 3 }] } }, { id: s.id });
    assert.equal(over.status, 400);
    const r2 = await call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: key('p3'), reason: 'rest' } }, { id: s.id });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.sale.payment_status, 'refunded');
    assert.equal(Number(r2.json.sale.refunded_cents), 9999);
    assert.equal(Number(r2.json.sale.fee_reversed_cents), 100);
  });

  it('a retried refund request with the same key refunds once', async () => {
    const p = await createProduct(C, 'Hat', 10000, 3);
    const s = (await sale(C, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    const k = key('rr');
    const rs = await Promise.all([1, 2, 3].map(() => call(refund.POST, 'POST', `/api/pos/sales/${s.id}/refund`, { user: C.owner, body: { idempotencyKey: k, reason: 'retry' } }, { id: s.id })));
    assert.ok(rs.every((r) => r.status === 200), JSON.stringify(rs.map((r) => [r.status, r.json.error])));
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_refunds WHERE sale_id = ${s.id}`;
    assert.equal(n, 1);
  });
});

// ===========================================================================
describe('roles & till operators', () => {
  let cashier: TestUser, manager: TestUser, stockCtl: TestUser;
  let item: Record<string, unknown>;

  before(async () => {
    cashier = await addStaff(C, 'cashier', '1234');
    manager = await addStaff(C, 'manager', '5678');
    stockCtl = await addStaff(C, 'stock_controller');
    item = await createProduct(C, 'Role test item', 10000, 100);
  });

  it('the role matrix matches the specification', async () => {
    const { POS_ROLE_MATRIX } = await import('../../src/lib/pos/auth-helper');
    const expected: Record<string, string[]> = {
      'sale.create': ['owner', 'manager', 'cashier'],
      'sale.refund': ['owner', 'manager'],
      'discount.override': ['owner', 'manager'],
      'catalog.write': ['owner', 'manager', 'stock_controller'],
      'stock.adjust': ['owner', 'manager', 'stock_controller'],
      'purchasing.write': ['owner', 'manager', 'stock_controller'],
      'reports.read': ['owner', 'manager', 'admin_readonly'],
      'staff.manage': ['owner', 'manager'],
      'billing.read': ['owner', 'admin_readonly'],
      'billing.manage': ['owner'],
    };
    for (const [cap, roles] of Object.entries(expected)) {
      assert.deepEqual([...POS_ROLE_MATRIX[cap as keyof typeof POS_ROLE_MATRIX]].sort(), [...roles].sort(), cap);
    }
  });

  it('cashier: can sell, cannot refund, edit stock, see reports, manage staff or billing', async () => {
    const s = await sale(cashier, { items: [{ productId: item.id, quantity: 1 }] });
    assert.equal(s.status, 201);
    assert.equal(s.json.sale.cashier_id, cashier.id);
    assert.equal((await call(refund.POST, 'POST', `/api/pos/sales/${s.json.sale.id}/refund`, { user: cashier, body: { idempotencyKey: key(), reason: 'x' } }, { id: s.json.sale.id })).status, 403);
    assert.equal((await call(products.POST, 'POST', '/api/pos/products', { user: cashier, body: { name: 'x', sellingPriceCents: 100 } })).status, 403);
    assert.equal((await call(products.POST, 'POST', '/api/pos/products', { user: cashier, body: { action: 'adjust_stock', productId: item.id, change: 5, reason: 'manual_adjustment' } })).status, 403);
    assert.equal((await call(reports.GET, 'GET', '/api/pos/reports', { user: cashier })).status, 403);
    assert.equal((await call(staff.POST, 'POST', '/api/pos/staff', { user: cashier, body: { email: 'x@y.z', role: 'cashier' } })).status, 403);
    assert.equal((await call(settings.PATCH, 'PATCH', '/api/pos/settings', { user: cashier, body: { receipt_footer: 'x' } })).status, 403);
    assert.equal((await call(fees.GET, 'GET', '/api/pos/fees', { user: cashier })).status, 403);
    assert.equal((await call(exportRoute.GET, 'GET', '/api/pos/export', { user: cashier, query: { type: 'sales' } })).status, 403);
  });

  it('cashier discounts above the merchant limit need a manager', async () => {
    const big = await sale(cashier, { items: [{ productId: item.id, quantity: 1, discountCents: 2000 }] }); // 20% > 10%
    assert.equal(big.status, 403);
    assert.equal(big.json.code, 'DISCOUNT_NOT_AUTHORISED');
    const small = await sale(cashier, { items: [{ productId: item.id, quantity: 1, discountCents: 1000 }] });
    assert.equal(small.status, 201);
    assert.equal(Number(small.json.sale.total_cents), 9000);
    const mgr = await sale(manager, { items: [{ productId: item.id, quantity: 1, discountCents: 5000 }] });
    assert.equal(mgr.status, 201);
  });

  it('stock controller: stock and purchasing yes, selling and refunds no', async () => {
    assert.equal((await sale(stockCtl, { items: [{ productId: item.id, quantity: 1 }] })).status, 403);
    assert.equal((await call(products.POST, 'POST', '/api/pos/products', { user: stockCtl, body: { action: 'adjust_stock', productId: item.id, change: 5, reason: 'customer_return' } })).status, 200);
    assert.equal((await call(reports.GET, 'GET', '/api/pos/reports', { user: stockCtl })).status, 403);
  });

  it('manager: refunds and reports yes; can add cashiers but not managers; no billing', async () => {
    assert.equal((await call(reports.GET, 'GET', '/api/pos/reports', { user: manager })).status, 200);
    const newbie = await createUser('newcashier@test.local');
    assert.equal((await call(staff.POST, 'POST', '/api/pos/staff', { user: manager, body: { email: newbie.email, role: 'cashier', pin: '4321' } })).status, 200);
    const other = await createUser('wannabe@test.local');
    assert.equal((await call(staff.POST, 'POST', '/api/pos/staff', { user: manager, body: { email: other.email, role: 'manager' } })).status, 403);
    assert.equal((await call(subscription.POST, 'POST', '/api/pos/subscription', { user: manager, body: { action: 'cancel' } })).status, 403);
  });

  it('PIN switch: sales are recorded against the PIN holder, with their limits', async () => {
    const v = await call(staff.POST, 'POST', '/api/pos/staff', { user: C.owner, body: { action: 'verify_pin', pin: '1234' } });
    assert.equal(v.status, 200);
    const op = { 'x-pos-operator': v.json.operatorToken };
    const s = await sale(C, { items: [{ productId: item.id, quantity: 1 }] }, op);
    assert.equal(s.status, 201);
    assert.equal(s.json.sale.cashier_id, cashier.id, 'recorded against the cashier, not the device owner');
    const rf = await call(refund.POST, 'POST', `/api/pos/sales/${s.json.sale.id}/refund`, { user: C.owner, headers: op, body: { idempotencyKey: key(), reason: 'x' } }, { id: s.json.sale.id });
    assert.equal(rf.status, 403, 'owner device + cashier PIN cannot refund');
    const bad = await sale(C, { items: [{ productId: item.id, quantity: 1 }] }, { 'x-pos-operator': 'not-a-token' });
    assert.equal(bad.status, 401);
  });

  it('five wrong PINs lock PIN sign-in', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await call(staff.POST, 'POST', '/api/pos/staff', { user: C.owner, body: { action: 'verify_pin', pin: '0000' } })).status);
    }
    assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
    assert.equal(statuses[5], 429);
    await sql`UPDATE pos_staff_roles SET locked_until = NULL, failed_pin_attempts = 0 WHERE business_id = ${C.businessId}`;
  });

  it('platform admins are read-only on merchant data, and audited', async () => {
    const r = await call(sales.GET, 'GET', '/api/pos/sales', { user: platformAdmin, query: { businessId: C.businessId } });
    assert.equal(r.status, 200);
    const w = await sale(platformAdmin, { items: [{ productId: item.id, quantity: 1 }] }, { 'x-business-id': C.businessId });
    assert.equal(w.status, 403);
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_audit_logs WHERE business_id = ${C.businessId} AND action = 'admin_view' AND actor_user_id = ${platformAdmin.id}`;
    assert.ok(n >= 1);
    const none = await call(sales.GET, 'GET', '/api/pos/sales', { user: platformAdmin });
    assert.equal(none.status, 401, 'no fallback to an arbitrary business');
  });
});

// ===========================================================================
describe('inventory & purchasing', () => {
  it('stock adjustments are logged and cannot go negative', async () => {
    const p = await createProduct(A, 'Adjust me', 1000, 5);
    const bad = await call(products.POST, 'POST', '/api/pos/products', { user: A.owner, body: { action: 'adjust_stock', productId: p.id, change: -6, reason: 'waste_damaged', notes: 'dropped' } });
    assert.equal(bad.status, 409);
    const ok = await call(products.POST, 'POST', '/api/pos/products', { user: A.owner, body: { action: 'adjust_stock', productId: p.id, change: -2, reason: 'waste_damaged', notes: 'dropped' } });
    assert.equal(ok.status, 200);
    const count = await call(products.POST, 'POST', '/api/pos/products', { user: A.owner, body: { action: 'adjust_stock', productId: p.id, setTo: 10, reason: 'stock_count' } });
    assert.equal(count.status, 200);
    const logs = await sql`SELECT previous_quantity, new_quantity, change_quantity, reason, actor_user_id FROM pos_inventory_logs WHERE product_id = ${p.id} ORDER BY created_at`;
    assert.deepEqual(logs.map((l) => [Number(l.previous_quantity), Number(l.new_quantity), Number(l.change_quantity), l.reason]), [[5, 3, -2, 'waste_damaged'], [3, 10, 7, 'stock_count']]);
    assert.ok(logs.every((l) => l.actor_user_id === A.owner.id));
    const patch = await call(productById.PATCH, 'PATCH', `/api/pos/products/${p.id}`, { user: A.owner, body: { stockQuantity: 999 } }, { id: p.id });
    assert.equal(patch.status, 400, 'stock cannot be set without an adjustment record');
  });

  it('purchase orders: partial delivery, weighted average cost, no over-receiving', async () => {
    const p = await createProduct(C, 'Denim', 40000, 10, 20000);
    const sup = (await call(suppliers.POST, 'POST', '/api/pos/suppliers', { user: C.owner, body: { name: 'Mill' } })).json.supplier;
    const po = await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: C.owner, body: { supplierId: sup.id, items: [{ productId: p.id, quantity: 10, unitCostCents: 26000 }] } });
    assert.equal(po.status, 201);
    assert.match(po.json.order.po_number, /^PO-\d{5}$/);
    const [line] = await sql`SELECT id FROM pos_purchase_order_items WHERE purchase_order_id = ${po.json.order.id}`;
    const part = await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: C.owner, body: { action: 'receive', poId: po.json.order.id, items: [{ itemId: line.id, quantity: 5 }] } });
    assert.equal(part.json.order.status, 'partially_received');
    assert.equal(await stockOf(p.id), 15);
    const [prod] = await sql`SELECT cost_price_cents FROM pos_products WHERE id = ${p.id}`;
    assert.equal(Number(prod.cost_price_cents), 22000); // (10×200 + 5×260) / 15
    const over = await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: C.owner, body: { action: 'receive', poId: po.json.order.id, items: [{ itemId: line.id, quantity: 6 }] } });
    assert.equal(over.status, 400);
    const rest = await call(purchasing.POST, 'POST', '/api/pos/purchasing', { user: C.owner, body: { action: 'receive', poId: po.json.order.id } });
    assert.equal(rest.json.order.status, 'received');
    assert.equal(await stockOf(p.id), 20);
  });

  it('plan limits: a starter plan has one till', async () => {
    await call(tills.GET, 'GET', '/api/pos/tills', { user: A.owner });
    const r = await call(tills.POST, 'POST', '/api/pos/tills', { user: A.owner, body: { action: 'create', name: 'Second till' } });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'TILL_LIMIT');
  });

  it('expenses are recorded and reduce net profit, not sales', async () => {
    const e = await call(expenses.POST, 'POST', '/api/pos/expenses', { user: A.owner, body: { category: 'transport', amountCents: 5000, description: 'Taxi to market' } });
    assert.equal(e.status, 201);
    const d = await call(reports.GET, 'GET', '/api/pos/reports', { user: A.owner, query: { type: 'dashboard', compare: '0' } });
    assert.equal(d.status, 200);
    assert.ok(d.json.expensesCents >= 5000);
    assert.equal(d.json.netProfitCents, d.json.grossProfitCents - d.json.platformFeesCents - d.json.expensesCents);
    assert.ok(d.json.grossSalesCents > d.json.grossProfitCents, 'revenue is not reported as profit');
  });

  it('exports neutralise spreadsheet formulas in merchant text', async () => {
    await createProduct(A, '=HYPERLINK("http://evil")', 100, 1);
    const csv = await call(exportRoute.GET, 'GET', '/api/pos/export', { user: A.owner, query: { type: 'products' } });
    assert.ok(csv.text.includes(`"'=HYPERLINK(""http://evil"")"`), csv.text.split('\r\n').find((l) => l.includes('HYPERLINK')));
  });
});

// ===========================================================================
describe('offline sales', () => {
  it('five queued cash sales synced twice make exactly five sales', async () => {
    const p = await createProduct(A, 'Offline mielies', 1000, 100);
    const queue = Array.from({ length: 5 }, () => ({
      idempotencyKey: key('off'), items: [{ productId: p.id, quantity: 1 }],
      offline: { createdAt: new Date(Date.now() - 3600_000).toISOString(), clientTotalCents: 1000 },
    }));
    for (let round = 0; round < 2; round++) {
      for (const q of queue) assert.ok([200, 201].includes((await sale(A, q)).status));
    }
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_sales WHERE business_id = ${A.businessId} AND idempotency_key = ANY(${queue.map((q) => q.idempotencyKey)}::text[])`;
    assert.equal(n, 5);
    assert.equal(await stockOf(p.id), 95);
  });

  it('an offline sale that oversold is kept and flagged, never dropped', async () => {
    const p = await createProduct(A, 'Offline last bag', 3000, 1);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 3 }], offline: { createdAt: new Date().toISOString(), clientTotalCents: 9000 } });
    assert.equal(r.status, 201);
    assert.match(r.json.sale.review_reason, /stock_shortfall/);
    assert.equal(await stockOf(p.id), 0);
    const [c] = await sql`SELECT requested_qty, available_qty FROM pos_stock_conflicts WHERE product_id = ${p.id}`;
    assert.deepEqual([Number(c.requested_qty), Number(c.available_qty)], [3, 1]);
  });

  it('a price change between offline sale and sync is flagged', async () => {
    const p = await createProduct(A, 'Price moved', 2000, 10);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 1 }], offline: { createdAt: new Date().toISOString(), clientTotalCents: 1500 } });
    assert.match(r.json.sale.review_reason, /offline_price_mismatch/);
  });

  it('card sales cannot be recorded offline', async () => {
    const p = await createProduct(A, 'Offline card', 2000, 10);
    const r = await sale(A, { items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'card_external', offline: { createdAt: new Date().toISOString() } });
    assert.equal(r.status, 400);
  });
});

// ===========================================================================
describe('fee rules over time', () => {
  it('a negotiated rate applies to new sales only; history keeps its rate', async () => {
    const p = await createProduct(C, 'Rate item', 100000, 20);
    const before = (await sale(C, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    assert.equal(Number(before.platform_fee_cents), 1000);
    const denied = await call(adminPos.POST, 'POST', '/api/admin/pos', { user: complianceAdmin, body: { action: 'fee_override', businessId: C.businessId, rateBps: 50, reason: 'deal' } });
    assert.equal(denied.status, 403, 'only finance roles change fees');
    const ok = await call(adminPos.POST, 'POST', '/api/admin/pos', { user: platformAdmin, body: { action: 'fee_override', businessId: C.businessId, rateBps: 50, reason: 'Negotiated volume rate' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const afterSale = (await sale(C, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    assert.equal(Number(afterSale.platform_fee_cents), 500);
    assert.equal(Number(afterSale.fee_rate_bps), 50);
    const [old] = await sql`SELECT platform_fee_cents, fee_rate_bps FROM pos_sales WHERE id = ${before.id}`;
    assert.equal(Number(old.platform_fee_cents), 1000);
    const [audit] = await sql`SELECT action FROM pos_audit_logs WHERE action = 'fee_rule_created' AND business_id = ${C.businessId}`;
    assert.ok(audit);
    // A rule effective in the future is not used yet.
    await call(adminPos.POST, 'POST', '/api/admin/pos', { user: platformAdmin, body: { action: 'fee_override', businessId: C.businessId, rateBps: 0, exempt: true, effectiveFrom: new Date(Date.now() + 86400_000).toISOString(), reason: 'Promo next month' } });
    const still = (await sale(C, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    assert.equal(Number(still.fee_rate_bps), 50);
  });
});

// ===========================================================================
describe('activation & subscription billing', () => {
  let D: TestMerchant;

  async function itnFromCheckout(checkoutData: Record<string, string>, extra: Record<string, string>) {
    return signedItn({
      m_payment_id: checkoutData.m_payment_id,
      item_name: checkoutData.item_name,
      custom_str1: checkoutData.custom_str1 ?? '',
      custom_str2: checkoutData.custom_str2 ?? '',
      custom_str3: checkoutData.custom_str3 ?? '',
      custom_str4: checkoutData.custom_str4 ?? '',
      custom_int1: checkoutData.custom_int1 ?? '',
      amount_gross: checkoutData.amount,
      ...extra,
    });
  }
  const postItn = (body: string) => call(itn.POST, 'POST', '/api/payfast/notify', { body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });

  before(async () => {
    D = await createMerchant('Delta Food Stall', { active: false });
  });

  it('a new merchant cannot sell until POS is paid for', async () => {
    const p = await createProduct(D, 'Boerewors roll', 3500, 20);
    const r = await sale(D, { items: [{ productId: p.id, quantity: 1 }] });
    assert.equal(r.status, 402);
    assert.equal(r.json.code, 'POS_SUBSCRIPTION_INACTIVE');
  });

  it('the old setupFeePaid flag activates nothing; activation returns a PayFast checkout', async () => {
    const r = await call(subscription.POST, 'POST', '/api/pos/subscription', { user: D.owner, body: { planKey: 'starter', setupFeePaid: true } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.firstChargeCents, 14900, 'R50 setup + R99 first month');
    assert.equal(r.json.data.amount, '149.00');
    assert.equal(r.json.data.recurring_amount, '99.00');
    assert.equal(r.json.data.custom_str3, 'pos_subscription_starter');
    const [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'inactive');
    (globalThis as Record<string, unknown>).__dCheckout = r.json.data;
  });

  it('an underpaid or forged ITN does not activate', async () => {
    // A separate checkout: PayFast never sends two first charges for one m_payment_id.
    const other = await call(subscription.POST, 'POST', '/api/pos/subscription', { user: D.owner, body: { action: 'activate', planKey: 'starter' } });
    const data = other.json.data as Record<string, string>;
    const low = await postItn(await itnFromCheckout(data, { amount_gross: '5.00', token: 'tok-low' }));
    assert.equal(low.status, 200);
    let [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'inactive');
    const genuine = (globalThis as Record<string, unknown>).__dCheckout as Record<string, string>;
    const forged = (await itnFromCheckout(genuine, { token: 'tok-d' })).replace(/signature=[a-f0-9]+/, 'signature=deadbeef');
    assert.equal((await postItn(forged)).status, 403);
    // A checkout row created outside the POS flow (cheap amount) cannot buy POS.
    const ref = `VBL-forged-${crypto.randomBytes(3).toString('hex')}`;
    await sql`INSERT INTO payments (user_id, amount, status, reference, purchase_type) VALUES (${D.owner.id}, 500, 'pending', ${ref}, 'pos_subscription_starter')`;
    await postItn(await signedItn({ m_payment_id: ref, amount_gross: '5.00', custom_str1: D.businessId, custom_str2: D.owner.id, custom_str3: 'pos_subscription_starter', token: 'tok-forged' }));
    [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'inactive');
    const [ev] = await sql`SELECT COUNT(*)::int AS n FROM billing_events WHERE event = 'payment_unapplied'`;
    assert.ok(ev.n >= 2, 'both are raised for a person to review');
  });

  it('a genuine ITN activates; a re-delivered one changes nothing', async () => {
    const data = (globalThis as Record<string, unknown>).__dCheckout as Record<string, string>;
    const body = await itnFromCheckout(data, { token: 'tok-d', pf_payment_id: '900001' });
    assert.equal((await postItn(body)).status, 200);
    assert.equal((await postItn(body)).status, 200);
    const [sub] = await sql`SELECT * FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'active');
    assert.equal(sub.setup_fee_paid, true);
    assert.equal(Number(sub.recurring_amount_cents), 9900);
    const charges = await sql`SELECT kind, amount_cents FROM pos_billing_charges WHERE business_id = ${D.businessId} ORDER BY kind`;
    assert.deepEqual(charges.map((c) => [c.kind, Number(c.amount_cents)]), [['setup_fee', 5000], ['subscription', 9900]]);
    const p = await createProduct(D, 'Pap & vleis', 6000, 5);
    assert.equal((await sale(D, { items: [{ productId: p.id, quantity: 1 }] })).status, 201);
  });

  it('missed renewal → grace (still selling) → read-only, data intact → renewal restores', async () => {
    const p = await createProduct(D, 'Grace item', 1000, 50);
    await sql`UPDATE pos_merchant_subscriptions SET renews_at = NOW() - INTERVAL '3 days' WHERE business_id = ${D.businessId}`;
    const cron = await call(cronPos.GET, 'GET', '/api/cron/pos-billing', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    assert.equal(cron.status, 200, JSON.stringify(cron.json));
    let [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'grace');
    assert.equal((await sale(D, { items: [{ productId: p.id, quantity: 1 }] })).status, 201, 'grace keeps the till open');

    await sql`UPDATE pos_merchant_subscriptions SET payment_failed_at = NOW() - INTERVAL '6 days' WHERE business_id = ${D.businessId}`;
    await call(cronPos.GET, 'GET', '/api/cron/pos-billing', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'suspended');
    assert.equal((await sale(D, { items: [{ productId: p.id, quantity: 1 }] })).status, 402);
    assert.equal((await call(sales.GET, 'GET', '/api/pos/sales', { user: D.owner })).status, 200, 'history still readable');
    assert.equal((await call(exportRoute.GET, 'GET', '/api/pos/export', { user: D.owner, query: { type: 'sales' } })).status, 200, 'export still works');

    const data = (globalThis as Record<string, unknown>).__dCheckout as Record<string, string>;
    await postItn(await itnFromCheckout(data, { token: 'tok-d', pf_payment_id: '900002', amount_gross: '99.00' }));
    [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'active');
    assert.equal((await sale(D, { items: [{ productId: p.id, quantity: 1 }] })).status, 201);
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM pos_billing_charges WHERE business_id = ${D.businessId} AND kind = 'subscription'`;
    assert.equal(n, 2);
  });

  it('cancelling confirms with PayFast, runs to period end, then read-only', async () => {
    const r = await call(subscription.POST, 'POST', '/api/pos/subscription', { user: D.owner, body: { action: 'cancel' } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.subscription.cancel_at_period_end, true);
    await sql`UPDATE pos_merchant_subscriptions SET renews_at = NOW() - INTERVAL '1 minute' WHERE business_id = ${D.businessId}`;
    await call(cronPos.GET, 'GET', '/api/cron/pos-billing', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const [sub] = await sql`SELECT status FROM pos_merchant_subscriptions WHERE business_id = ${D.businessId}`;
    assert.equal(sub.status, 'cancelled');
  });

  it('the cron route needs its secret', async () => {
    assert.equal((await call(cronPos.GET, 'GET', '/api/cron/pos-billing')).status, 401);
  });
});

// ===========================================================================
describe('fee statements: accrued → billed → collected', () => {
  let E: TestMerchant;
  let statement: Record<string, unknown>;

  before(async () => {
    E = await createMerchant('Echo Traders');
  });

  it('last month’s fees, less refunds, become one statement', async () => {
    const p = await createProduct(E, 'Statement item', 200000, 50);
    const s1 = (await sale(E, { items: [{ productId: p.id, quantity: 1 }] })).json.sale; // fee 2000
    const s2 = (await sale(E, { items: [{ productId: p.id, quantity: 2 }] })).json.sale; // fee 4000
    await call(refund.POST, 'POST', `/api/pos/sales/${s1.id}/refund`, { user: E.owner, body: { idempotencyKey: key(), reason: 'returned' } }, { id: s1.id }); // reversal 2000
    await sql`UPDATE pos_sales SET completed_at = NOW() - INTERVAL '40 days' WHERE id IN (${s1.id}, ${s2.id})`;
    await sql`UPDATE pos_refunds SET created_at = NOW() - INTERVAL '39 days' WHERE sale_id = ${s1.id}`;

    const { generateFeeStatement, previousMonthStart } = await import('../../src/lib/pos/pos-billing');
    const period = previousMonthStart(new Date());
    statement = (await generateFeeStatement(E.businessId, period))!;
    assert.ok(statement);
    assert.equal(Number(statement.fees_accrued_cents), 6000);
    assert.equal(Number(statement.fee_reversals_cents), 2000);
    assert.equal(Number(statement.net_due_cents), 4000);
    assert.equal(statement.status, 'open');
    const again = await generateFeeStatement(E.businessId, period);
    assert.equal(again!.id, statement.id, 'one statement per period');

    const summary = await call(fees.GET, 'GET', '/api/pos/fees', { user: E.owner });
    assert.equal(summary.json.outstandingCents, 4000);
    assert.equal(summary.json.feesCollectedCents, 0, 'accrued is not collected');
  });

  it('paying the statement through PayFast collects it', async () => {
    const start = await call(fees.POST, 'POST', '/api/pos/fees', { user: E.owner, body: { action: 'pay_statement', statementId: statement.id } });
    assert.equal(start.status, 200, JSON.stringify(start.json));
    const d = start.json.data as Record<string, string>;
    assert.equal(d.amount, '40.00');
    const body = await signedItn({
      m_payment_id: d.m_payment_id, item_name: d.item_name, amount_gross: d.amount,
      custom_str1: d.custom_str1, custom_str2: d.custom_str2, custom_str3: d.custom_str3, custom_str4: d.custom_str4, pf_payment_id: '700001',
    });
    assert.equal((await call(itn.POST, 'POST', '/api/payfast/notify', { body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })).status, 200);
    const [s] = await sql`SELECT status FROM pos_fee_statements WHERE id = ${statement.id}`;
    assert.equal(s.status, 'paid');
    const summary = await call(fees.GET, 'GET', '/api/pos/fees', { user: E.owner });
    assert.equal(summary.json.feesCollectedCents, 4000);
    assert.equal(summary.json.outstandingCents, 0);
    const salesRows = await sql`SELECT DISTINCT fee_status FROM pos_sales WHERE fee_statement_id = ${statement.id}`;
    assert.deepEqual(salesRows.map((r) => r.fee_status), ['collected']);
    const [payable] = await sql`
      SELECT SUM(credit_cents) - SUM(debit_cents) AS owed FROM pos_financial_ledger
      WHERE business_id = ${E.businessId} AND account_name = 'platform_fee_payable' AND journal_id IS NOT NULL`;
    assert.equal(Number(payable.owed), 0, 'nothing owed after paying');
  });

  it('a refund after the fee was paid becomes a credit on the next statement', async () => {
    const [s2] = await sql`SELECT id FROM pos_sales WHERE business_id = ${E.businessId} AND fee_statement_id = ${statement.id} AND payment_status = 'completed'`;
    await call(refund.POST, 'POST', `/api/pos/sales/${s2.id}/refund`, { user: E.owner, body: { idempotencyKey: key(), reason: 'late return' } }, { id: s2.id });
    const { generateFeeStatement } = await import('../../src/lib/pos/pos-billing');
    const thisMonth = new Date().toISOString().slice(0, 7) + '-01';
    const next = await generateFeeStatement(E.businessId, thisMonth);
    assert.equal(next!.status, 'credit');
    assert.equal(Number(next!.net_due_cents), -4000);
  });

  it('a balance under R5 (PayFast’s minimum) carries into the next statement', async () => {
    const G = await createMerchant('Golf Sweets');
    const p = await createProduct(G, 'Sweets', 10000, 50); // fee R1 each
    const s = (await sale(G, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    await sql`UPDATE pos_sales SET completed_at = NOW() - INTERVAL '70 days' WHERE id = ${s.id}`;
    const { generateFeeStatement } = await import('../../src/lib/pos/pos-billing');
    const twoMonthsAgo = new Date(Date.now() - 70 * 86400_000);
    const first = await generateFeeStatement(G.businessId, `${twoMonthsAgo.toISOString().slice(0, 7)}-01`);
    assert.equal(first!.status, 'carried');
    assert.equal(first!.due_at, null, 'not due, so it cannot make the account overdue');
    for (let i = 0; i < 5; i++) await sale(G, { items: [{ productId: p.id, quantity: 1 }] });
    await sql`UPDATE pos_sales SET completed_at = NOW() - INTERVAL '40 days' WHERE business_id = ${G.businessId} AND fee_statement_id IS NULL`;
    const { previousMonthStart } = await import('../../src/lib/pos/pos-billing');
    const second = await generateFeeStatement(G.businessId, previousMonthStart(new Date()));
    assert.equal(Number(second!.carried_forward_cents), 100);
    assert.equal(Number(second!.net_due_cents), 600);
    assert.equal(second!.status, 'open');
  });

  it('an overdue statement puts the account into grace', async () => {
    const F = await createMerchant('Foxtrot Fish');
    const p = await createProduct(F, 'Hake', 100000, 10);
    const s = (await sale(F, { items: [{ productId: p.id, quantity: 1 }] })).json.sale;
    await sql`UPDATE pos_sales SET completed_at = NOW() - INTERVAL '40 days' WHERE id = ${s.id}`;
    const { generateFeeStatement, previousMonthStart, runPosBillingSweep } = await import('../../src/lib/pos/pos-billing');
    const st = await generateFeeStatement(F.businessId, previousMonthStart(new Date()));
    await sql`UPDATE pos_fee_statements SET due_at = NOW() - INTERVAL '1 day' WHERE id = ${st!.id}`;
    await runPosBillingSweep();
    const [sub] = await sql`SELECT status, suspended_reason FROM pos_merchant_subscriptions WHERE business_id = ${F.businessId}`;
    assert.equal(sub.status, 'grace');
    assert.equal(sub.suspended_reason, 'fee_statement_overdue');
  });
});

// ===========================================================================
describe('online (QR) sale completed only by ITN — development sandbox', () => {
  it('pending until a matching ITN; mismatches and replays change nothing', async () => {
    process.env.POS_ALLOW_SANDBOX = 'true';
    try {
      const p = await createProduct(A, 'QR item', 2500, 4);
      const r = await sale(A, { items: [{ productId: p.id, quantity: 2 }], paymentMethod: 'qr_online' });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      assert.equal(r.json.sale.payment_status, 'pending');
      assert.ok(r.json.paymentResponse.paymentActionUrl.startsWith('https://sandbox.payfast.co.za'));
      assert.equal(await stockOf(p.id), 4, 'no stock taken while unpaid');
      const saleId = r.json.sale.id;
      const base = { m_payment_id: `POS-${saleId}`, custom_str1: saleId, custom_str2: A.businessId, custom_str3: 'pos_checkout', pf_payment_id: '555001' };
      const post = async (fields: Record<string, string>) =>
        call(itn.POST, 'POST', '/api/payfast/notify', { body: await signedItn(fields), headers: { 'content-type': 'application/x-www-form-urlencoded' } });

      await post({ ...base, amount_gross: '1.00' });
      let [s] = await sql`SELECT payment_status FROM pos_sales WHERE id = ${saleId}`;
      assert.equal(s.payment_status, 'pending', 'wrong amount does not complete');

      await post({ ...base, amount_gross: '50.00' });
      await post({ ...base, amount_gross: '50.00' });
      [s] = await sql`SELECT payment_status, fee_status FROM pos_sales WHERE id = ${saleId}`;
      assert.equal(s.payment_status, 'completed');
      assert.equal(s.fee_status, 'accrued');
      assert.equal(await stockOf(p.id), 2, 'stock taken exactly once');
      const [{ j }] = await sql`SELECT COUNT(*)::int AS j FROM pos_ledger_journals WHERE journal_key = ${`sale:${saleId}`}`;
      assert.equal(j, 1);
    } finally {
      delete process.env.POS_ALLOW_SANDBOX;
    }
  });
});

// ===========================================================================
describe('admin console', () => {
  it('platform revenue is only what was collected', async () => {
    const r = await call(adminPos.GET, 'GET', '/api/admin/pos', { user: platformAdmin, query: { view: 'overview', from: '2000-01-01' } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const [c] = await sql`SELECT COALESCE(SUM(amount_cents),0) AS t FROM pos_billing_charges`;
    assert.equal(r.json.collectedRevenue.totalCents, Number(c.t));
    assert.ok(r.json.sales.merchantGmvCents > r.json.collectedRevenue.totalCents, 'merchant sales are not platform revenue');
    assert.ok(r.json.fees.accruedCents > 0);
  });

  it('merchant list, drill-down and suspend/reactivate (audited)', async () => {
    const list = await call(adminPos.GET, 'GET', '/api/admin/pos', { user: platformAdmin, query: { view: 'merchants' } });
    assert.ok(list.json.merchants.some((m: { business_id: string }) => m.business_id === A.businessId));
    const s = await call(adminPos.POST, 'POST', '/api/admin/pos', { user: platformAdmin, body: { action: 'suspend', businessId: B.businessId, reason: 'Fraud check' } });
    assert.equal(s.status, 200);
    const pb = await createProduct(B, 'Suspended item', 1000, 5);
    assert.equal((await sale(B, { items: [{ productId: pb.id, quantity: 1 }] })).status, 402);
    const noReason = await call(adminPos.POST, 'POST', '/api/admin/pos', { user: platformAdmin, body: { action: 'reactivate', businessId: B.businessId } });
    assert.equal(noReason.status, 400);
    const re = await call(adminPos.POST, 'POST', '/api/admin/pos', { user: platformAdmin, body: { action: 'reactivate', businessId: B.businessId, reason: 'Cleared' } });
    assert.equal(re.status, 200);
    assert.equal((await sale(B, { items: [{ productId: pb.id, quantity: 1 }] })).status, 201);
    const audit = await sql`SELECT action FROM pos_audit_logs WHERE business_id = ${B.businessId} AND action IN ('admin_suspend', 'admin_reactivate') ORDER BY created_at`;
    assert.deepEqual(audit.map((a) => a.action), ['admin_suspend', 'admin_reactivate']);
  });

  it('non-staff cannot reach the admin API', async () => {
    assert.equal((await call(adminPos.GET, 'GET', '/api/admin/pos', { user: A.owner })).status, 403);
  });
});

// ===========================================================================
describe('ledger integrity across everything above', () => {
  it('every journal of every merchant balances', async () => {
    for (const m of [A, B, C]) {
      const l = await ledgerBalanced(m.businessId);
      assert.equal(l.unbalancedJournals, 0, m.name);
      assert.equal(l.debit, l.credit, m.name);
    }
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM (
        SELECT journal_id FROM pos_financial_ledger WHERE journal_id IS NOT NULL GROUP BY journal_id HAVING SUM(debit_cents) <> SUM(credit_cents)
      ) x`;
    assert.equal(n, 0);
  });

  it('a hand-built unbalanced journal is refused', async () => {
    const { postJournal } = await import('../../src/lib/pos/ledger');
    const { withTransaction } = await import('../../src/lib/db');
    await assert.rejects(withTransaction((tx) => postJournal(tx, {
      businessId: A.businessId, journalKey: key('bad'), kind: 'test', referenceType: 'test', referenceId: 'x',
      lines: [{ account: 'cash_on_hand', entryType: 'x', debitCents: 100, description: 'x' }, { account: 'sales_revenue', entryType: 'x', creditCents: 99, description: 'x' }],
    })), /unbalanced/);
  });
});

// Keep the request helper referenced for ad-hoc debugging.
void makeRequest;
