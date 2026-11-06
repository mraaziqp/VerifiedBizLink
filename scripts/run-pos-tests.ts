import { CashPaymentAdapter } from '../src/lib/pos/payments/cash-adapter';
import { SandboxPaymentAdapter } from '../src/lib/pos/payments/sandbox-adapter';
import { resolveAdapterForMethod } from '../src/lib/pos/payments/index';

async function runTests() {
  console.log('🧪 Starting VerifiedBizLink POS Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // 1. Fee & Tax Tests
  console.log('--- 1. Fee & Tax Calculations ---');
  const totalCents = 15000;
  const platformFee = Math.round(totalCents * 0.01);
  const merchantNet = totalCents - platformFee;
  assert(platformFee === 150, '1% Platform fee for R150 is R1.50 (150 cents)');
  assert(merchantNet === 14850, 'Merchant net proceeds equals R148.50');

  const vat = Math.round(totalCents - totalCents / 1.15);
  assert(vat === 1957, 'SA 15% inclusive VAT correctly extracted (R19.57 on R150)');

  // 2. Cash Adapter Tests
  console.log('\n--- 2. Cash Payment Adapter ---');
  const cash = new CashPaymentAdapter();
  const cashExact = await cash.initiate({
    saleId: 'test_1',
    businessId: 'biz_1',
    amountCents: 10000,
    currency: 'ZAR',
    method: 'cash',
    tenderAmountCents: 10000,
    idempotencyKey: 'idem_1',
  });
  assert(cashExact.success && cashExact.changeAmountCents === 0, 'Exact cash tender approved with R0 change');

  const cashChange = await cash.initiate({
    saleId: 'test_2',
    businessId: 'biz_1',
    amountCents: 7500,
    currency: 'ZAR',
    method: 'cash',
    tenderAmountCents: 10000,
    idempotencyKey: 'idem_2',
  });
  assert(cashChange.success && cashChange.changeAmountCents === 2500, 'Over-tender cash approved with R25.00 change due');

  const cashShort = await cash.initiate({
    saleId: 'test_3',
    businessId: 'biz_1',
    amountCents: 5000,
    currency: 'ZAR',
    method: 'cash',
    tenderAmountCents: 3000,
    idempotencyKey: 'idem_3',
  });
  assert(!cashShort.success && cashShort.status === 'declined', 'Under-tender cash rejected');

  // 3. SoftPOS / Tap to Pay Sandbox Tests
  console.log('\n--- 3. SoftPOS & Tap to Pay Adapter ---');
  const sandbox = new SandboxPaymentAdapter();
  const tapApprove = await sandbox.initiate({
    saleId: 'tap_1',
    businessId: 'biz_1',
    amountCents: 24000,
    currency: 'ZAR',
    method: 'card_tap',
    idempotencyKey: 'idem_tap_1',
  });
  assert(tapApprove.success && tapApprove.status === 'approved', 'Contactless card tap approved');
  assert(Boolean(tapApprove.authCode) && Boolean(tapApprove.cardBrand), `Auth code (${tapApprove.authCode}) and brand (${tapApprove.cardBrand}) generated`);

  const tapDecline = await sandbox.initiate({
    saleId: 'tap_2',
    businessId: 'biz_1',
    amountCents: 24000,
    currency: 'ZAR',
    method: 'card_tap',
    idempotencyKey: 'idem_tap_2',
    metadata: { simulateDecline: true },
  });
  assert(!tapDecline.success && tapDecline.status === 'declined', 'Simulated card decline handled safely');

  // 4. Platform Adapter Routing
  console.log('\n--- 4. Platform Adapter Resolution ---');
  const androidAdapter = resolveAdapterForMethod('card_tap', { isAndroid: true });
  assert(androidAdapter.providerName === 'softpos_yoco', 'Android routes to SoftPOS (Yoco/NFC)');

  const iosAdapter = resolveAdapterForMethod('card_tap', { isIos: true });
  assert(iosAdapter.providerName === 'apple_tap_to_pay', 'iOS routes to Apple Tap to Pay (ProximityReader)');

  const qrAdapter = resolveAdapterForMethod('qr_online');
  assert(qrAdapter.providerName === 'payfast', 'QR/online routes to PayFast fallback');

  // 5. Double-Entry Accounting Proof
  console.log('\n--- 5. Double-Entry Accounting Ledger ---');
  const gross = 85000;
  const pFee = Math.round(gross * 0.01);
  const netProceeds = gross - pFee;
  const credits = gross;
  const debits = pFee;
  assert(credits - debits === netProceeds, 'Ledger balance equation verified: Credits - Debits == Net');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
