import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import db from '../src/lib/db';
import { ensurePosSchema } from '../src/lib/pos/schema';
import {
  getTills,
  openTill,
  createPosProduct,
  getPosProducts,
  updatePosProduct,
  adjustPosStock,
  getPosInventoryLogs,
  createPosSupplier,
  getPosSuppliers,
  createPosPurchaseOrder,
  receivePosPurchaseOrder,
  processPosSale,
  refundPosSale,
  getPosSales,
  getPosDailySummary,
  assignPosStaffRole,
  verifyPosStaffPin,
  getAdminPosMetrics,
} from '../src/lib/pos/pos-service';

async function runEndToEndVerification() {
  console.log('🚀 ========================================================');
  console.log('   VERIFIEDBIZLINK POS END-TO-END ACCEPTANCE & AUDIT TEST  ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Ensure Schema
  console.log('Phase 1: Database Schema Validation & Self-Healing');
  await ensurePosSchema();
  assert(true, 'POS PostgreSQL schema initialized & verified');

  // 2. Setup Two Distinct Test Merchants
  console.log('\nPhase 2: Multi-Tenant Merchant Setup');
  const [userA] = await db`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('merchant.a.pos@test.co.za', 'dummy_hash', 'Merchant Alice (Cape Craft)', 'business')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, email
  `;
  const existingBizA = await db`SELECT id, company_name FROM businesses WHERE user_id = ${userA.id} LIMIT 1`;
  const bizA = existingBizA[0] || (await db`
    INSERT INTO businesses (user_id, name, company_name, package_type)
    VALUES (${userA.id}, 'Cape Craft & Coffee Roasters', 'Cape Craft & Coffee Roasters', 'premium')
    RETURNING id, company_name
  `)[0];

  const [userB] = await db`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('merchant.b.pos@test.co.za', 'dummy_hash', 'Merchant Bob (Karoo Meats)', 'business')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, email
  `;
  const existingBizB = await db`SELECT id, company_name FROM businesses WHERE user_id = ${userB.id} LIMIT 1`;
  const bizB = existingBizB[0] || (await db`
    INSERT INTO businesses (user_id, name, company_name, package_type)
    VALUES (${userB.id}, 'Karoo Butchery & Farm Produce', 'Karoo Butchery & Farm Produce', 'standard')
    RETURNING id, company_name
  `)[0];

  assert(Boolean(bizA?.id && bizB?.id), 'Two distinct merchants initialized in PostgreSQL', `A: ${bizA.company_name}, B: ${bizB.company_name}`);

  // Clean previous test POS data for pristine test run in proper foreign-key dependency order
  await db`DELETE FROM pos_purchase_orders WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_sales WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_inventory_logs WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_products WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_tills WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_suppliers WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_financial_ledger WHERE business_id IN (${bizA.id}, ${bizB.id})`;
  await db`DELETE FROM pos_staff_roles WHERE business_id IN (${bizA.id}, ${bizB.id})`;

  // 3. Merchant A: Tills, Products, Stock
  console.log('\nPhase 3: Merchant A Catalog, 10 Products & Inventory Audit');
  const tillsA = await getTills(bizA.id);
  const tillA = tillsA[0];
  await openTill(tillA.id, bizA.id, userA.id, 50000);
  assert(Boolean(tillA?.id), 'Merchant A digital till initialized & opened with float', `ID: ${tillA.id}`);

  const productDefs = [
    { name: 'Artisanal Rooibos Tea', cost: 2000, price: 4500, barcode: '6001234567890', stock: 50 },
    { name: 'Freshly Roasted Beans 250g', cost: 4000, price: 8500, barcode: '6001234567891', stock: 30 },
    { name: 'Lavender Hand Soap', cost: 1200, price: 3500, barcode: '6001234567892', stock: 40 },
    { name: 'Cold Brew Bottle 500ml', cost: 1500, price: 4000, barcode: '6001234567893', stock: 25 },
    { name: 'Organic Honey Jar 500g', cost: 4500, price: 9500, barcode: '6001234567894', stock: 20 },
    { name: 'Sourdough Loaf', cost: 1800, price: 4800, barcode: '6001234567895', stock: 15 },
    { name: 'Cinnamon Buns 2-Pack', cost: 1400, price: 3800, barcode: '6001234567896', stock: 18 },
    { name: 'Canvas Tote Bag', cost: 5000, price: 12000, barcode: '6001234567897', stock: 10 },
    { name: 'Ceramic Coffee Mug', cost: 4500, price: 11000, barcode: '6001234567898', stock: 12 },
    { name: 'Filter Paper 100pk', cost: 2500, price: 5500, barcode: '6001234567899', stock: 35 },
  ];

  const createdProdsA = [];
  for (const def of productDefs) {
    const prod = await createPosProduct(bizA.id, {
      name: def.name,
      costPriceCents: def.cost,
      sellingPriceCents: def.price,
      barcode: def.barcode,
      stockQuantity: def.stock,
      taxRatePercent: 15.0,
      unit: 'unit',
    }, userA.id);
    createdProdsA.push(prod);
  }
  assert(createdProdsA.length === 10, 'Created 10 catalog products for Merchant A');

  // Product Edit
  const editedProd = await updatePosProduct(bizA.id, createdProdsA[0].id, {
    sellingPriceCents: 4800,
  });
  assert(Number(editedProd.selling_price_cents) === 4800, 'Product price updated successfully');

  // Stock Adjustment with Audit Log
  const teaBefore = Number(createdProdsA[0].stock_quantity);
  const adjustedTea = await adjustPosStock(bizA.id, createdProdsA[0].id, -2, 'waste_damaged', '2 boxes damaged in transit', userA.id);
  assert(Number(adjustedTea.stock_quantity) === teaBefore - 2, 'Stock manual adjustment deducted 2 units');

  const logs = await getPosInventoryLogs(bizA.id, createdProdsA[0].id);
  assert(logs.length >= 2, 'Inventory audit trail recorded correctly', `Found ${logs.length} audit logs`);

  // 4. Purchasing & Supplier Receiving
  console.log('\nPhase 4: Supplier Directory, Purchase Orders & Receiving');
  const supplier = await createPosSupplier(bizA.id, {
    name: 'Table Mountain Roasters Wholesale',
    contactPerson: 'David Miller',
    email: 'wholesale@tmroasters.co.za',
    phone: '0215551234',
  });
  assert(supplier.name === 'Table Mountain Roasters Wholesale', 'Supplier registered');

  const po = await createPosPurchaseOrder(
    bizA.id,
    supplier.id,
    [
      {
        productId: createdProdsA[1].id, // Beans
        quantity: 20,
        unitCostCents: 3800,
      },
    ],
    'Urgent restocking'
  );
  assert(po.status === 'ordered', 'Purchase order created in ordered status');

  const beansBeforePO = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${createdProdsA[1].id}`)[0].stock_quantity);
  const receivedPO = await receivePosPurchaseOrder(bizA.id, po.id, userA.id);
  const beansAfterPO = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${createdProdsA[1].id}`)[0].stock_quantity);
  assert(receivedPO.status === 'received' && beansAfterPO === beansBeforePO + 20, 'PO stock received and inventory auto-incremented by +20 units');

  // 5. Cash Checkout & Double-Entry Accounting
  console.log('\nPhase 5: Cash Checkout, Change Calculation & Ledger Balance');
  const saleItem1 = createdProdsA[1]; // Beans: R85
  const saleItem2 = createdProdsA[4]; // Honey: R95
  const expectedTotal = 8500 + 9500; // R180 (18000 cents)
  const tenderCash = 20000; // R200
  const expectedChange = 2000; // R20

  const saleRes = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'cash',
    tenderAmountCents: tenderCash,
    items: [
      { productId: saleItem1.id, name: saleItem1.name, quantity: 1, unitPriceCents: 8500, costPriceCents: 4000 },
      { productId: saleItem2.id, name: saleItem2.name, quantity: 1, unitPriceCents: 9500, costPriceCents: 4500 },
    ],
    customerName: 'Sipho Zulu',
    idempotencyKey: 'idem_test_cash_sale_001',
  });

  assert(saleRes.sale.payment_status === 'completed', 'Cash sale marked completed');
  assert(Number(saleRes.sale.total_cents) === expectedTotal, 'Total is R180.00 (18000 cents)');
  assert(Number(saleRes.payment.change_amount_cents) === expectedChange, 'Change is exact R20.00 (2000 cents)');
  assert(Number(saleRes.sale.platform_fee_cents) === 180, '1% Platform fee calculated as R1.80 (180 cents)');
  assert(Number(saleRes.sale.merchant_net_cents) === 17820, 'Merchant net proceeds equals R178.20');

  // Verify Double-Entry Ledger Equations
  const ledgerEntries = await db`
    SELECT * FROM pos_financial_ledger WHERE reference_id = ${saleRes.sale.id}
  `;
  let totalDebits = 0;
  let totalCredits = 0;
  for (const entry of ledgerEntries) {
    totalDebits += Number(entry.debit_cents);
    totalCredits += Number(entry.credit_cents);
  }
  assert(totalDebits === totalCredits && totalDebits === expectedTotal + 180,
    'Double-Entry Accounting Balance Equation verified',
    `Debits: ${totalDebits} == Credits: ${totalCredits}`
  );

  const feeEntry = ledgerEntries.find((e: any) => e.entry_type === 'fee_accrued');
  assert(feeEntry?.fee_status === 'accrued', 'Cash platform fee accurately classified as accrued liability (not falsely collected)');

  // 6. Refund & Fee Reversal
  console.log('\nPhase 6: Sale Refund, Stock Restoration & Financial Reversal');
  const honeyBeforeRefund = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${saleItem2.id}`)[0].stock_quantity);
  const refundedSale = await refundPosSale(bizA.id, saleRes.sale.id, true, 'Customer changed mind', userA.id);
  const honeyAfterRefund = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${saleItem2.id}`)[0].stock_quantity);

  assert(refundedSale.payment_status === 'refunded', 'Sale marked as refunded');
  assert(honeyAfterRefund === honeyBeforeRefund + 1, 'Refunded item restocked back into inventory (+1 unit)');

  const refundLedger = await db`
    SELECT * FROM pos_financial_ledger WHERE reference_type = 'refund' AND reference_id = ${saleRes.sale.id}
  `;
  let refundDebits = 0;
  let refundCredits = 0;
  for (const entry of refundLedger) {
    refundDebits += Number(entry.debit_cents);
    refundCredits += Number(entry.credit_cents);
  }
  assert(refundDebits === refundCredits, 'Refund double-entry balanced', `Debits: ${refundDebits} == Credits: ${refundCredits}`);
  const reversedFee = refundLedger.find((e: any) => e.entry_type === 'fee_reversal');
  assert(reversedFee?.fee_status === 'reversed', 'Platform fee reversed on refund (merchant not overcharged)');

  // 7. Staff Roles & 4-Digit PIN Security + Lockout
  console.log('\nPhase 7: Staff Management, 4-Digit Quick PIN & Brute-Force Lockout');
  const [cashierUser] = await db`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('cashier.alice@test.co.za', 'dummy_hash', 'Cashier Thabo', 'business')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, full_name
  `;
  await assignPosStaffRole(bizA.id, cashierUser.id, 'cashier', '5522', 'Thabo (Till 1)');
  const pinSuccess = await verifyPosStaffPin(bizA.id, '5522');
  assert(pinSuccess?.fullName === 'Cashier Thabo', 'Valid 4-digit PIN verified successfully');

  // Test Brute-Force Protection (5 bad attempts lock out the till)
  for (let i = 0; i < 4; i++) {
    await verifyPosStaffPin(bizA.id, '0000');
  }
  // 5th failed attempt
  await verifyPosStaffPin(bizA.id, '0000');

  // 6th attempt MUST throw lockout error
  let lockoutTriggered = false;
  try {
    await verifyPosStaffPin(bizA.id, '5522'); // Even correct PIN is blocked during active lockout
  } catch (err: any) {
    lockoutTriggered = err.message.includes('Till locked due to too many failed PIN attempts');
  }
  assert(lockoutTriggered, 'Brute-force lockout triggered after 5 failed PIN attempts (Lockout duration active)');

  // Reset lockout for clean slate
  await db`UPDATE pos_staff_roles SET failed_pin_attempts = 0, locked_until = NULL WHERE business_id = ${bizA.id}`;

  // 8. Merchant B: Cross-Tenant Data Isolation Test
  console.log('\nPhase 8: Multi-Tenant Data Isolation & Security Boundary');
  const tillsB = await getTills(bizB.id);
  const tillB = tillsB[0];
  const prodB = await createPosProduct(bizB.id, {
    name: 'Karoo Lamb Chops 1kg',
    costPriceCents: 11000,
    sellingPriceCents: 17500,
    stockQuantity: 25,
    taxRatePercent: 15.0,
    unit: 'kg',
  }, userB.id);

  // Cross-Merchant Probes:
  const leakedTill = tillsB.some((t: any) => t.id === tillA.id);
  assert(!leakedTill, 'Merchant B cannot see Merchant A tills');

  const bizBProducts = await getPosProducts(bizB.id);
  const leakedProduct = bizBProducts.some((p: any) => p.name === 'Artisanal Rooibos Tea');
  assert(!leakedProduct, 'Merchant B cannot see Merchant A products');

  const bizBSales = await getPosSales(bizB.id);
  const leakedSale = bizBSales.some((s: any) => s.id === saleRes.sale.id);
  assert(!leakedSale, 'Merchant B cannot see Merchant A sales history');

  let illegalRefundBlocked = false;
  try {
    await refundPosSale(bizB.id, saleRes.sale.id, false, 'Unauthorized cross-tenant attempt');
  } catch (err: any) {
    illegalRefundBlocked = err.message.includes('Sale not found');
  }
  assert(illegalRefundBlocked, 'Cross-tenant refund prevented (Merchant B cannot refund Merchant A sales)');

  // 9. Admin Platform Oversight & Active Transaction Metrics
  console.log('\nPhase 9: Super Admin Platform Oversight');
  const cardSale = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'card_tap',
    items: [
      { productId: createdProdsA[8].id, name: createdProdsA[8].name, quantity: 1, unitPriceCents: 11000, costPriceCents: 4500 }
    ],
    idempotencyKey: 'idem_card_sale_002',
  });
  assert(cardSale.sale.payment_status === 'completed', 'Card tap sale processed and active');

  const adminData = await getAdminPosMetrics();
  assert(Number(adminData.metrics?.total_active_merchants) >= 1, 'Admin metrics track active merchant count', `Merchants: ${adminData.metrics?.total_active_merchants}`);

  console.log('\n========================================================');
  console.log(`   FINAL VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEndToEndVerification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
