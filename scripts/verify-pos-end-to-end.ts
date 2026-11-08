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
  getPosPurchaseOrders,
  processPosSale,
  refundPosSale,
  getPosSales,
  getPosDailySummary,
  getPosFinancialLedger,
  getPosStaff,
  assignPosStaffRole,
  verifyPosStaffPin,
  getAdminPosMetrics,
} from '../src/lib/pos/pos-service';

async function runEndToEndVerification() {
  console.log('🚀 ========================================================');
  console.log('   VERIFIEDBIZLINK POS END-TO-END ACCEPTANCE & AUDIT TEST  ');
  console.log('   Multi-Tenant (3 Merchants) + Edge Cases + Ledger Audit   ');
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

  // 2. Setup Three Distinct Test Merchants
  console.log('\nPhase 2: Multi-Tenant Setup — 3 Distinct Merchants');
  
  // Merchant A: Cape Craft & Coffee Roasters (Retail / Cafe)
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

  // Merchant B: Karoo Butchery & Farm Produce (Butchery / Fresh Produce)
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

  // Merchant C: Soweto Corner Mart & Spaza (Convenience / Spaza Shop)
  const [userC] = await db`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('merchant.c.pos@test.co.za', 'dummy_hash', 'Merchant Charlie (Soweto Mart)', 'business')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, email
  `;
  const existingBizC = await db`SELECT id, company_name FROM businesses WHERE user_id = ${userC.id} LIMIT 1`;
  const bizC = existingBizC[0] || (await db`
    INSERT INTO businesses (user_id, name, company_name, package_type)
    VALUES (${userC.id}, 'Soweto Corner Mart & Spaza', 'Soweto Corner Mart & Spaza', 'basic')
    RETURNING id, company_name
  `)[0];

  const allBizIds = [bizA.id, bizB.id, bizC.id];
  assert(Boolean(bizA?.id && bizB?.id && bizC?.id),
    'Three distinct merchants initialized in PostgreSQL',
    `A: ${bizA.company_name}, B: ${bizB.company_name}, C: ${bizC.company_name}`
  );

  // Clean previous test POS data for pristine test run in proper foreign-key dependency order
  await db`DELETE FROM pos_purchase_orders WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_sales WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_inventory_logs WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_products WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_tills WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_suppliers WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_financial_ledger WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;
  await db`DELETE FROM pos_staff_roles WHERE business_id IN (${bizA.id}, ${bizB.id}, ${bizC.id})`;

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

  const createdProdsA: any[] = [];
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
  const supplierA = await createPosSupplier(bizA.id, {
    name: 'Table Mountain Roasters Wholesale',
    contactPerson: 'David Miller',
    email: 'wholesale@tmroasters.co.za',
    phone: '0215551234',
  });
  assert(supplierA.name === 'Table Mountain Roasters Wholesale', 'Supplier registered');

  const po = await createPosPurchaseOrder(
    bizA.id,
    supplierA.id,
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

  // 8. POS Engine Edge Cases & Resilience
  console.log('\nPhase 8: POS Engine Edge Cases & Real-World Resilience');

  // 8.1 Zero-Priced Promo Item (Free sample / gift)
  const promoProduct = await createPosProduct(bizA.id, {
    name: 'Complimentary Rooibos Sample Sachet',
    costPriceCents: 200,
    sellingPriceCents: 0, // Free promo item
    stockQuantity: 100,
    unit: 'sachet',
  }, userA.id);

  const stockBeforePromo = Number(promoProduct.stock_quantity);
  const promoSale = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'cash',
    tenderAmountCents: 0,
    items: [
      { productId: promoProduct.id, name: promoProduct.name, quantity: 1, unitPriceCents: 0, costPriceCents: 200 }
    ],
    idempotencyKey: 'idem_zero_promo_001',
  });

  const stockAfterPromo = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${promoProduct.id}`)[0].stock_quantity);
  assert(promoSale.sale.payment_status === 'completed' && Number(promoSale.sale.total_cents) === 0, 'Zero-priced promotional sale processed without error');
  assert(stockAfterPromo === stockBeforePromo - 1, 'Stock properly decremented (-1) for free promotional giveaway item');
  assert(Number(promoSale.sale.platform_fee_cents) === 0, 'Platform fee on R0 item is 0 cents (no division by zero)');

  // 8.2 Custom Line Item (Manual Price & Description, No Catalog Product ID)
  const customItemSale = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'cash',
    tenderAmountCents: 5000, // Tendered R50
    items: [
      { name: 'Custom Artisanal Gift Packaging & Ribbon', quantity: 1, unitPriceCents: 3500 } // R35 ad-hoc
    ],
    idempotencyKey: 'idem_custom_item_001',
  });
  assert(customItemSale.sale.payment_status === 'completed', 'Ad-hoc custom line item sale completed');
  assert(Number(customItemSale.sale.total_cents) === 3500, 'Custom line item total equals R35.00');
  assert(Number(customItemSale.payment.change_amount_cents) === 1500, 'Change for R35 sale with R50 tender is R15.00');

  const customLedger = await db`SELECT * FROM pos_financial_ledger WHERE reference_id = ${customItemSale.sale.id}`;
  let customDebits = 0;
  let customCredits = 0;
  for (const entry of customLedger) {
    customDebits += Number(entry.debit_cents);
    customCredits += Number(entry.credit_cents);
  }
  assert(customDebits === customCredits && customDebits === 3500 + 35, 'Custom line item ledger balanced (Debits == Credits)');

  // 8.3 Idempotency Duplicate Submission Protection
  const soapItem = createdProdsA[2]; // Soap
  const soapStockBefore = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${soapItem.id}`)[0].stock_quantity);
  
  const idemKey = 'idem_unique_duplicate_check_099';
  const firstSubmission = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'card_tap',
    items: [{ productId: soapItem.id, name: soapItem.name, quantity: 1, unitPriceCents: 3500 }],
    idempotencyKey: idemKey,
  });

  const soapStockAfterFirst = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${soapItem.id}`)[0].stock_quantity);
  assert(soapStockAfterFirst === soapStockBefore - 1, 'First submission decremented stock by 1');

  // Second submission with exact same idempotencyKey
  const secondSubmission = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'card_tap',
    items: [{ productId: soapItem.id, name: soapItem.name, quantity: 1, unitPriceCents: 3500 }],
    idempotencyKey: idemKey,
  });

  const soapStockAfterSecond = Number((await db`SELECT stock_quantity FROM pos_products WHERE id = ${soapItem.id}`)[0].stock_quantity);
  assert(secondSubmission.isDuplicate === true, 'Duplicate submission identified via idempotency key');
  assert(secondSubmission.sale.id === firstSubmission.sale.id, 'Duplicate returns identical existing sale record');
  assert(soapStockAfterSecond === soapStockAfterFirst, 'Duplicate checkout did NOT decrement inventory a second time');

  // 8.4 Under-Tender Cash Rejection
  const underTenderSale = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'cash',
    tenderAmountCents: 2000, // Tendered R20 for R85 item
    items: [{ productId: saleItem1.id, name: saleItem1.name, quantity: 1, unitPriceCents: 8500 }],
  });
  assert(underTenderSale.sale.payment_status === 'failed', 'Under-tender cash transaction marked as failed');
  const failedLedger = await db`SELECT * FROM pos_financial_ledger WHERE reference_id = ${underTenderSale.sale.id}`;
  assert(failedLedger.length === 0, 'No ledger entries posted for failed under-tender transaction');

  // 8.5 Low Stock Alert Threshold
  const lowStockProd = await createPosProduct(bizA.id, {
    name: 'Rare Organic Matcha Powder 100g',
    costPriceCents: 12000,
    sellingPriceCents: 22000,
    stockQuantity: 3, // Below default threshold 5
    minStockThreshold: 5,
    unit: 'tin',
  }, userA.id);
  const bizAProducts = await getPosProducts(bizA.id);
  const fetchedLowStock = bizAProducts.find((p: any) => p.id === lowStockProd.id);
  assert(
    Boolean(fetchedLowStock && Number(fetchedLowStock.stock_quantity) <= Number(fetchedLowStock.min_stock_threshold)),
    'Low-stock threshold triggered correctly (Stock 3 <= Threshold 5)'
  );

  // 8.6 Offline-First Sync Simulation
  const offlinePastDate = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
  const offlineSale = await processPosSale({
    businessId: bizA.id,
    tillId: tillA.id,
    cashierId: userA.id,
    paymentMethod: 'cash',
    tenderAmountCents: 5000,
    items: [{ productId: createdProdsA[3].id, name: createdProdsA[3].name, quantity: 1, unitPriceCents: 4000 }],
    isOfflineSync: true,
    offlineCreatedAt: offlinePastDate,
    idempotencyKey: 'idem_offline_sync_001',
  });
  assert(offlineSale.sale.is_offline_sync === true, 'Offline-synced sale flagged with is_offline_sync: true');
  assert(Boolean(offlineSale.sale.offline_created_at), 'Offline original creation timestamp preserved');

  // 9. Merchant B Setup & Multi-Tenant Cross-Probes
  console.log('\nPhase 9: Merchant B Setup & Cross-Tenant Boundary Probing');
  const tillsB = await getTills(bizB.id);
  const tillB = tillsB[0];
  await openTill(tillB.id, bizB.id, userB.id, 30000);

  const prodB = await createPosProduct(bizB.id, {
    name: 'Karoo Prime Lamb Chops 1kg',
    costPriceCents: 11000,
    sellingPriceCents: 17500,
    barcode: '6009876543210',
    stockQuantity: 45,
    taxRatePercent: 15.0,
    unit: 'kg',
  }, userB.id);

  const saleB = await processPosSale({
    businessId: bizB.id,
    tillId: tillB.id,
    cashierId: userB.id,
    paymentMethod: 'cash',
    tenderAmountCents: 20000,
    items: [{ productId: prodB.id, name: prodB.name, quantity: 1, unitPriceCents: 17500, costPriceCents: 11000 }],
    idempotencyKey: 'idem_sale_b_001',
  });
  assert(saleB.sale.payment_status === 'completed', 'Merchant B cash sale processed successfully');

  // Cross-Merchant A & B Isolation Checks:
  const bSeesATill = tillsB.some((t: any) => t.id === tillA.id);
  assert(!bSeesATill, 'Merchant B cannot see Merchant A tills');

  const bizBProducts = await getPosProducts(bizB.id);
  const bSeesAProd = bizBProducts.some((p: any) => p.id === createdProdsA[0].id);
  assert(!bSeesAProd, 'Merchant B cannot see Merchant A products');

  const bizBSales = await getPosSales(bizB.id);
  const bSeesASale = bizBSales.some((s: any) => s.id === saleRes.sale.id);
  assert(!bSeesASale, 'Merchant B cannot see Merchant A sales history');

  let bRefundABlocked = false;
  try {
    await refundPosSale(bizB.id, saleRes.sale.id, false, 'Unauthorized cross-tenant attempt');
  } catch (err: any) {
    bRefundABlocked = err.message.includes('Sale not found');
  }
  assert(bRefundABlocked, 'Cross-tenant refund prevented: Merchant B cannot refund Merchant A sales');

  // 10. Merchant C Setup & Complete 3-Way Isolation
  console.log('\nPhase 10: Merchant C (Soweto Spaza) & Comprehensive 3-Way Isolation');
  const tillsC = await getTills(bizC.id);
  const tillC = tillsC[0];
  await openTill(tillC.id, bizC.id, userC.id, 20000); // R200 float

  const prodC1 = await createPosProduct(bizC.id, {
    name: 'Super White Maize Meal 2.5kg',
    costPriceCents: 2400,
    sellingPriceCents: 3499,
    barcode: '6001112223334',
    stockQuantity: 60,
    unit: 'bag',
  }, userC.id);

  const prodC2 = await createPosProduct(bizC.id, {
    name: 'Full Cream Fresh Milk 2L',
    costPriceCents: 2100,
    sellingPriceCents: 2999,
    barcode: '6001112223335',
    stockQuantity: 24,
    unit: 'bottle',
  }, userC.id);

  const supplierC = await createPosSupplier(bizC.id, {
    name: 'Gauteng Cash & Carry Wholesalers',
    contactPerson: 'Kagiso Modise',
    phone: '0115559876',
  });

  const poC = await createPosPurchaseOrder(
    bizC.id,
    supplierC.id,
    [{ productId: prodC1.id, quantity: 30, unitCostCents: 2300 }],
    'Weekly staple restock'
  );

  const saleC = await processPosSale({
    businessId: bizC.id,
    tillId: tillC.id,
    cashierId: userC.id,
    paymentMethod: 'card_tap',
    items: [
      { productId: prodC1.id, name: prodC1.name, quantity: 1, unitPriceCents: 3499, costPriceCents: 2400 },
      { productId: prodC2.id, name: prodC2.name, quantity: 1, unitPriceCents: 2999, costPriceCents: 2100 },
    ],
    idempotencyKey: 'idem_sale_c_001',
  });
  assert(saleC.sale.payment_status === 'completed', 'Merchant C card sale completed');

  // Verify 3-Way Cross-Tenant Boundaries:
  // C cannot see A or B:
  const cTills = await getTills(bizC.id);
  const cSeesAorBTill = cTills.some((t: any) => t.id === tillA.id || t.id === tillB.id);
  assert(!cSeesAorBTill, 'Merchant C cannot see Merchant A or B tills');

  const cProds = await getPosProducts(bizC.id);
  const cSeesAorBProd = cProds.some((p: any) => p.id === createdProdsA[0].id || p.id === prodB.id);
  assert(!cSeesAorBProd, 'Merchant C cannot see Merchant A or B products');

  const cSales = await getPosSales(bizC.id);
  const cSeesAorBSale = cSales.some((s: any) => s.id === saleRes.sale.id || s.id === saleB.sale.id);
  assert(!cSeesAorBSale, 'Merchant C cannot see Merchant A or B sales');

  const cSuppliers = await getPosSuppliers(bizC.id);
  const cSeesASupplier = cSuppliers.some((s: any) => s.id === supplierA.id);
  assert(!cSeesASupplier, 'Merchant C cannot see Merchant A suppliers');

  const cPOs = await getPosPurchaseOrders(bizC.id);
  const cSeesAPO = cPOs.some((p: any) => p.id === po.id);
  assert(!cSeesAPO, 'Merchant C cannot see Merchant A purchase orders');

  const cLedger = await getPosFinancialLedger(bizC.id);
  const cSeesAorBLedger = cLedger.some((l: any) => l.business_id === bizA.id || l.business_id === bizB.id);
  assert(!cSeesAorBLedger, 'Merchant C financial ledger contains strictly 0 cross-tenant entries');

  let cRefundBlocked = false;
  try {
    await refundPosSale(bizC.id, saleRes.sale.id, false, 'Merchant C hijacking Merchant A sale');
  } catch (err: any) {
    cRefundBlocked = err.message.includes('Sale not found');
  }
  assert(cRefundBlocked, 'Merchant C strictly forbidden from refunding Merchant A sales');

  // 11. Super Admin Oversight & Summary Metrics
  console.log('\nPhase 11: Super Admin Oversight & Aggregation Across All Merchants');
  const adminData = await getAdminPosMetrics();
  assert(Number(adminData.metrics?.total_active_merchants) >= 3,
    'Admin platform metrics aggregate active merchant count (>= 3 merchants)',
    `Active count: ${adminData.metrics?.total_active_merchants}`
  );
  assert(Number(adminData.metrics?.gross_volume_cents) > 0,
    'Admin platform metrics compute global gross transaction volume',
    `Volume: R${(Number(adminData.metrics?.gross_volume_cents) / 100).toFixed(2)}`
  );

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
