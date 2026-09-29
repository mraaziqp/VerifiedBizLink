/**
 * Clears the renewal-overdue flag from businesses that never had a PayFast
 * subscription to begin with.
 *
 * Why this exists: an early version of the overdue sweep matched any business
 * on a paid tier whose next_billing_at had passed. Businesses put on a paid
 * tier by hand carry that column by default and have no subscription and no
 * payment history, so they were flagged as having failed a renewal they were
 * never signed up to, and would have been downgraded 72 hours later. The
 * sweep now requires a payfast_token or a recorded payment; this undoes the
 * damage the earlier rule did.
 *
 * Only touches rows that match that exact description, so it cannot clear a
 * genuine failed payment.
 *
 *   node scripts/repair-false-overdue.mjs --dry-run
 *   node scripts/repair-false-overdue.mjs
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const db = neon(env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, ''));
const dryRun = process.argv.includes('--dry-run');

const affected = await db`
  SELECT id, company_name, package_type, payment_failed_at
  FROM businesses
  WHERE subscription_status = 'renewal_overdue'
    AND payfast_token IS NULL
    AND last_billed_at IS NULL`;

console.log(`${affected.length} business(es) wrongly flagged:`);
for (const b of affected) console.log(`  ${b.company_name} (${b.package_type}) — flagged ${b.payment_failed_at}`);

// Only the alerts about the businesses being cleared. A genuine overdue
// renewal raises the same notification type and must survive this script.
const names = affected.map((b) => String(b.company_name));
const notes = names.length
  ? await db`SELECT id, content FROM notifications WHERE type = 'renewal_overdue'`
  : [];
const noteIds = notes.filter((n) => names.some((name) => String(n.content).startsWith(`${name} is on `))).map((n) => n.id);
console.log(`${noteIds.length} renewal_overdue notification(s) to remove`);

if (dryRun) { console.log('\n--dry-run: nothing changed'); process.exit(0); }

const cleared = await db`
  UPDATE businesses
  SET payment_failed_at = NULL, grace_warned_at = NULL,
      subscription_status = NULL, updated_at = NOW()
  WHERE subscription_status = 'renewal_overdue'
    AND payfast_token IS NULL
    AND last_billed_at IS NULL
  RETURNING company_name`;
const removed = noteIds.length
  ? await db`DELETE FROM notifications WHERE id = ANY(${noteIds}) RETURNING id`
  : [];

console.log(`\ncleared: ${cleared.map((c) => c.company_name).join(', ') || 'none'}`);
console.log(`notifications removed: ${removed.length}`);

const [left] = await db`SELECT COUNT(*)::int c FROM businesses WHERE payment_failed_at IS NOT NULL`;
console.log(`businesses still in a grace window: ${left.c}`);
