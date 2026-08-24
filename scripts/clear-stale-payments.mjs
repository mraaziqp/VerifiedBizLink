/**
 * Clears abandoned checkouts out of the pending queue.
 *
 * A payment row is created the moment someone clicks Pay, before they reach
 * PayFast. Anyone who closes the card page leaves a 'pending' row behind
 * forever, and those accumulate until the queue is mostly noise and a genuinely
 * stuck payment is impossible to spot.
 *
 * These are CANCELLED, not deleted. None of them was ever confirmed either
 * way, so if one did take money the row is the only evidence it existed —
 * deleting it would destroy that while the customer is still out of pocket.
 * Cancelling clears the queue just as well and can be undone.
 *
 * A payment PayFast confirmed is never touched, whatever its age.
 *
 *   node scripts/clear-stale-payments.mjs --before=2026-08-22
 *   node scripts/clear-stale-payments.mjs --before=2026-08-22 --apply
 *   node scripts/clear-stale-payments.mjs --older-than-days=14 --apply
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

let cutoff;
if (args.before) {
  cutoff = new Date(`${args.before}T00:00:00Z`);
} else if (args['older-than-days']) {
  cutoff = new Date(Date.now() - Number(args['older-than-days']) * 86400000);
} else {
  console.error('Give a boundary: --before=YYYY-MM-DD or --older-than-days=N');
  process.exit(1);
}
if (Number.isNaN(cutoff.getTime())) { console.error('Unreadable date.'); process.exit(1); }

console.log(`Cutoff: anything still pending and created before ${cutoff.toISOString()}\n`);

const stale = await db`
  SELECT p.reference, p.amount, p.description, p.created_at, u.email
  FROM payments p LEFT JOIN users u ON u.id = p.user_id
  WHERE p.status = 'pending'
    AND p.created_at < ${cutoff.toISOString()}
    AND p.payfast_reference IS NULL   -- never confirmed by PayFast
  ORDER BY p.created_at`;

if (stale.length === 0) { console.log('Nothing to clear.'); process.exit(0); }

console.log(`${APPLY ? 'Cancelling' : 'Would cancel'} ${stale.length} abandoned checkout(s):`);
let total = 0;
for (const s of stale) {
  total += Number(s.amount);
  console.log(`  ${s.reference}  ${rand(s.amount).padStart(8)}  ${new Date(s.created_at).toISOString().slice(0, 10)}  ${s.email}`);
  console.log(`      ${s.description}`);
}
console.log(`  face value: ${rand(total)} (none of it confirmed as taken)`);

// Anything PayFast DID confirm, to show plainly that it is being left alone.
const confirmed = await db`
  SELECT reference, amount, status, payfast_reference FROM payments
  WHERE payfast_reference IS NOT NULL ORDER BY created_at DESC`;
console.log(`\nUntouched — confirmed by PayFast (${confirmed.length}):`);
for (const c of confirmed) {
  console.log(`  ${c.reference}  ${rand(c.amount)}  ${c.status}  pf_ref=${c.payfast_reference}`);
}

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const refs = stale.map((s) => s.reference);
const updated = await db`
  UPDATE payments
  SET status = 'cancelled'
  WHERE reference = ANY(${refs})
    AND status = 'pending'
    AND payfast_reference IS NULL
  RETURNING reference`;

console.log(`\nCancelled ${updated.length} payment(s).`);

const [left] = await db`SELECT COUNT(*)::int n FROM payments WHERE status = 'pending'`;
console.log(`Still pending: ${left.n}`);
console.log('\nNothing was deleted. To restore one:');
console.log("  UPDATE payments SET status = 'pending' WHERE reference = '<ref>';");
