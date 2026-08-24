/**
 * Finishes a payment PayFast took but the app never processed.
 *
 * The notification is the only thing that grants a tier, so a lost or
 * rejected ITN leaves a customer charged with nothing to show for it. This
 * applies exactly what the webhook would have applied.
 *
 * Only ever run this against a payment you have confirmed in the PayFast
 * dashboard. It grants the product; it does not verify that money moved.
 *
 *   node scripts/reconcile-payment.mjs
 *       list stuck payments, and the tier keys available
 *
 *   node scripts/reconcile-payment.mjs --ref=VBL-... [--type=subscription_standard] [--apply]
 *       without --apply it reports what it would do and changes nothing
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--'))
    .map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);
const APPLY = args.apply === true;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

const rand = (c) => `R${(Number(c) / 100).toFixed(2)}`;

if (!args.ref) {
  const stuck = await db`
    SELECT p.reference, p.status, p.amount, p.description, p.purchase_type,
           p.created_at, u.email
    FROM payments p LEFT JOIN users u ON u.id = p.user_id
    WHERE p.status = 'pending' ORDER BY p.created_at DESC`;
  console.log(`Payments still pending: ${stuck.length}\n`);
  for (const p of stuck) {
    console.log(`  ${p.reference}`);
    console.log(`     ${rand(p.amount)} · ${p.description}`);
    console.log(`     ${p.email} · type=${p.purchase_type ?? 'UNKNOWN — pass --type'}`);
  }
  const tiers = await db`SELECT key, name, price FROM tiers ORDER BY price`.catch(() => []);
  if (tiers.length) {
    console.log('\nTier keys (use --type=subscription_<key>):');
    for (const t of tiers) console.log(`  subscription_${t.key.padEnd(14)} ${t.name} — R${t.price}`);
  }
  console.log('\nThen: node scripts/reconcile-payment.mjs --ref=<reference> --type=<type> --apply');
  process.exit(0);
}

const [pay] = await db`
  SELECT p.*, u.email, u.full_name FROM payments p
  LEFT JOIN users u ON u.id = p.user_id
  WHERE p.reference = ${args.ref} LIMIT 1`;

if (!pay) { console.error(`No payment with reference ${args.ref}`); process.exit(1); }
if (pay.status === 'completed') { console.log('Already completed — nothing to do.'); process.exit(0); }

const type = args.type || pay.purchase_type;
if (!type) {
  console.error('This payment has no purchase_type stored. Re-run with --type=<type>.');
  process.exit(1);
}

console.log(`Payment : ${pay.reference}`);
console.log(`Customer: ${pay.email}`);
console.log(`Amount  : ${rand(pay.amount)}`);
console.log(`Grant   : ${type}\n`);

const paidRand = Number(pay.amount) / 100;
const plan = [];

if (type.startsWith('subscription_')) {
  const key = type.slice('subscription_'.length);
  const [tier] = await db`SELECT key, name, price, is_purchasable FROM tiers WHERE key = ${key} LIMIT 1`.catch(() => []);
  if (!tier) { console.error(`No tier "${key}".`); process.exit(1); }
  // Not a blocker here, unlike at checkout. The money has already moved, and
  // withholding a product someone has paid for is worse than granting a tier
  // that has since been closed to new purchases.
  if (!tier.is_purchasable) {
    console.warn(`  note: "${key}" is no longer purchasable — honouring it anyway, the charge already happened.`);
  }
  if (paidRand + 0.01 < Number(tier.price)) {
    console.error(`Underpaid: ${rand(pay.amount)} against R${tier.price} for ${tier.name}. Refusing.`);
    process.exit(1);
  }
  plan.push(`upgrade the business to "${tier.name}" and start a monthly billing cycle`);
} else if (type === 'verification_fee') {
  if (paidRand + 0.01 < 49) { console.error(`Underpaid: ${rand(pay.amount)} against R49. Refusing.`); process.exit(1); }
  plan.push('mark the business verified and its verification fee paid');
} else if (type === 'ad_credits_topup') {
  plan.push(`add ${Math.floor(paidRand / 10)} ad-day credit(s)`);
} else if (type === 'ad_boost') {
  plan.push('boost the attached ad for its normal duration');
} else {
  console.error(`Unknown purchase type "${type}".`); process.exit(1);
}
plan.push('mark the payment completed');

console.log('Would:');
for (const p of plan) console.log(`  - ${p}`);

const [biz] = await db`
  SELECT b.id, b.company_name, b.package_type, b.status, a.full_name AS agent
  FROM businesses b LEFT JOIN users a ON a.id = b.assisted_by_user_id
  WHERE b.user_id = ${pay.user_id} LIMIT 1`;
if (biz) {
  console.log(`\nBusiness: ${biz.company_name} (tier=${biz.package_type}, status=${biz.status})`);
  console.log(`Advisor : ${biz.agent ?? 'none'}`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply to write.'); process.exit(0); }

if (type.startsWith('subscription_')) {
  const key = type.slice('subscription_'.length);
  const next = new Date(); next.setMonth(next.getMonth() + 1);
  await db`
    UPDATE businesses
    SET package_type = ${key}, subscription_status = 'active', last_billed_at = NOW(),
        billing_interval_months = 1, next_billing_at = ${next.toISOString()}, auto_renew = TRUE,
        payment_failed_at = NULL, grace_warned_at = NULL,
        downgraded_from = NULL, downgraded_at = NULL, updated_at = NOW()
    WHERE user_id = ${pay.user_id}`;
} else if (type === 'verification_fee') {
  await db`
    UPDATE businesses
    SET verification_paid = TRUE, verification_paid_at = NOW(), status = 'verified',
        verified_at = COALESCE(verified_at, NOW()), updated_at = NOW()
    WHERE user_id = ${pay.user_id}`;
} else if (type === 'ad_credits_topup') {
  const days = Math.floor(paidRand / 10);
  if (days > 0) {
    await db`UPDATE businesses SET ad_credits = ad_credits + ${days}, updated_at = NOW() WHERE user_id = ${pay.user_id}`;
  }
} else if (type === 'ad_boost' && pay.ad_id) {
  await db`
    UPDATE ads SET is_boosted = TRUE, is_active = TRUE, boost_expires_at = NOW() + INTERVAL '7 days'
    WHERE id = ${pay.ad_id}`;
}

await db`
  UPDATE payments
  SET status = 'completed', completed_at = COALESCE(completed_at, NOW()),
      purchase_type = COALESCE(purchase_type, ${type})
  WHERE reference = ${args.ref}`;

await db`
  INSERT INTO notifications (user_id, title, content, link)
  VALUES (${pay.user_id}, 'Payment confirmed',
          ${`Your payment of ${rand(pay.amount)} has been applied to your account.`}, '/settings')
`.catch(() => {});

console.log('\nApplied.');
const [after] = await db`
  SELECT b.package_type, b.status, b.verification_paid FROM businesses b WHERE b.user_id = ${pay.user_id} LIMIT 1`;
if (after) console.log(`Business now: tier=${after.package_type} status=${after.status} verification_paid=${after.verification_paid}`);
