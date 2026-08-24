/**
 * Audits whether the payment records describe something that could really
 * have happened, and whether what they granted matches what was paid for.
 *
 * This checks the database against ITSELF and against the app's own rules.
 * It cannot tell you whether PayFast actually took the money — only the
 * PayFast dashboard or their API can, and this app has never successfully
 * received a notification, so nothing here has been confirmed by PayFast.
 * Anything it cannot confirm is reported as unconfirmed rather than assumed.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

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

let problems = 0;
const flag = (msg) => { problems++; console.log(`  PROBLEM  ${msg}`); };
const ok = (msg) => console.log(`  ok       ${msg}`);

console.log('=== every payment, and how it was confirmed ===');
const pays = await db`
  SELECT p.reference, p.status, p.amount, p.description, p.purchase_type,
         p.payfast_reference, p.completed_at, p.created_at, p.reversed_at,
         u.email, b.company_name, b.package_type, b.status AS biz_status,
         b.badge_source, b.verification_paid
  FROM payments p
  LEFT JOIN users u ON u.id = p.user_id
  LEFT JOIN businesses b ON b.user_id = p.user_id
  ORDER BY p.created_at DESC`;

for (const p of pays) {
  const confirmed = p.payfast_reference ? `PayFast ref ${p.payfast_reference}` : 'NOT confirmed by PayFast';
  console.log(`\n  ${p.reference}`);
  console.log(`    ${p.status.toUpperCase()} · ${rand(p.amount)} · ${p.description}`);
  console.log(`    ${p.email} · ${confirmed}`);

  if (p.status === 'completed' && !p.payfast_reference) {
    console.log('    NOTE: marked completed by hand (reconciliation), not by a PayFast notification.');
  }
  if (p.status === 'completed' && !p.completed_at) {
    flag(`${p.reference} is completed but has no completed_at — the commission week cannot be determined`);
  }
  if (p.status === 'pending' && p.completed_at) {
    flag(`${p.reference} is pending but has a completed_at`);
  }
  if (p.reversed_at && p.status !== 'refunded') {
    flag(`${p.reference} has a reversal timestamp but status is ${p.status}`);
  }
  if (!p.purchase_type) {
    flag(`${p.reference} has no purchase_type — it cannot be replayed if the notification was lost`);
  }
}

console.log('\n\n=== status values in use ===');
const statuses = await db`SELECT status, COUNT(*)::int n FROM payments GROUP BY status ORDER BY n DESC`;
const KNOWN = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
for (const s of statuses) {
  const known = KNOWN.includes(s.status);
  console.log(`  ${s.status}: ${s.n} ${known ? '' : '<- UNKNOWN to the app'}`);
  if (!known) flag(`status "${s.status}" is not one the code ever sets or reads`);
}

console.log('\n=== did each completed payment actually grant what it paid for? ===');
const tiers = Object.fromEntries((await db`SELECT key, price FROM tiers`).map((t) => [t.key, Number(t.price)]));
for (const p of pays.filter((x) => x.status === 'completed')) {
  const paidRand = Number(p.amount) / 100;
  const t = p.purchase_type ?? '';
  if (t.startsWith('subscription_')) {
    const key = t.slice('subscription_'.length);
    if (p.package_type !== key) {
      flag(`${p.reference} paid for tier "${key}" but the business is on "${p.package_type}"`);
    } else if (tiers[key] > 0 && p.biz_status !== 'verified') {
      flag(`${p.reference} paid for "${key}" (R${tiers[key]}) but the business is not verified — no badge, no commission`);
    } else {
      ok(`${p.reference} -> tier ${key}, business verified (${p.badge_source})`);
    }
  } else if (t === 'verification_fee') {
    if (!p.verification_paid || p.biz_status !== 'verified') {
      flag(`${p.reference} paid the verification fee but the business is not verified`);
    } else ok(`${p.reference} -> verified via the once-off fee`);
  } else {
    ok(`${p.reference} -> ${t || 'unknown type'} (no tier effect to check)`);
  }
}

console.log('\n=== duplicate charges to the same account ===');
const dupes = await db`
  SELECT u.email, p.description, COUNT(*)::int n, SUM(p.amount)::int cents
  FROM payments p JOIN users u ON u.id = p.user_id
  WHERE p.status = 'completed'
  GROUP BY u.email, p.description HAVING COUNT(*) > 1`;
if (dupes.length === 0) ok('none');
for (const d of dupes) flag(`${d.email} has ${d.n} completed charges for "${d.description}" totalling ${rand(d.cents)}`);

console.log('\n=== payments with no owning user or business ===');
const orphans = await db`
  SELECT p.reference FROM payments p
  LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL`;
if (orphans.length === 0) ok('none');
for (const o of orphans) flag(`${o.reference} has no user`);

console.log('\n=== verified businesses with no payment behind them ===');
const freeVerified = await db`
  SELECT b.company_name, b.package_type, b.badge_source, b.documents_reviewed_at
  FROM businesses b
  WHERE b.status = 'verified'
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.user_id = b.user_id AND p.status = 'completed')`;
for (const f of freeVerified) {
  const how = f.badge_source === 'vetting_review' ? 'approved by an admin — legitimate' : `badge_source=${f.badge_source}, but nothing was ever paid`;
  console.log(`  ${f.company_name} (${f.package_type}): ${how}`);
  if (f.badge_source !== 'vetting_review') flag(`${f.company_name} is verified with no payment and no review`);
}

console.log('\n=== ITN audit trail ===');
const itn = await db`SELECT outcome, COUNT(*)::int n FROM payfast_itn_log GROUP BY outcome`.catch(() => []);
if (itn.length === 0) {
  console.log('  EMPTY — PayFast has never successfully delivered a notification this app recorded.');
  console.log('  Until one lands, no payment status here has been confirmed by PayFast.');
} else {
  for (const i of itn) console.log(`  ${i.outcome}: ${i.n}`);
}

console.log(`\n---------------------------------------------`);
console.log(problems === 0 ? 'No inconsistencies found.' : `${problems} problem(s) found.`);
console.log('\nWhat this CANNOT tell you: whether money actually moved. Compare the');
console.log('references above against the PayFast dashboard — that is the only');
console.log('source of truth for what was really charged.');
