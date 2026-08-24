/**
 * Grants the badge to businesses on a paid plan that never received it.
 *
 * Every paid plan includes vetting and the verified badge, but the webhook
 * only ever set package_type — so a paying customer sat on the tier whose
 * headline feature is the badge, without the badge, and their advisor earned
 * no commission because only verified sales count.
 *
 * Free-tier businesses are untouched: there is nothing paid for.
 *
 * Safe to re-run. Pass --apply to write; without it, only reports.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const APPLY = process.argv.includes('--apply');

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

// Only businesses on a tier that actually costs money, and only where a
// completed payment exists — a package_type set by hand is not a purchase.
const candidates = await db`
  SELECT b.id, b.company_name, b.package_type, b.status, t.price,
         a.full_name AS agent,
         (SELECT COUNT(*)::int FROM payments p
          WHERE p.user_id = b.user_id AND p.status = 'completed') AS paid_count
  FROM businesses b
  JOIN tiers t ON t.key = b.package_type
  LEFT JOIN users a ON a.id = b.assisted_by_user_id
  WHERE b.status <> 'verified' AND t.price > 0
`;

console.log(`Paying businesses without the badge: ${candidates.length}\n`);
if (candidates.length === 0) { console.log('Nothing to do.'); process.exit(0); }

const eligible = [];
for (const c of candidates) {
  const mark = c.paid_count > 0 ? 'grant' : 'SKIP';
  console.log(`  ${c.company_name} — tier=${c.package_type} (R${c.price}), status=${c.status}`);
  console.log(`     completed payments: ${c.paid_count} -> ${mark === 'grant' ? 'grant the badge' : 'no payment on record, left alone'}`);
  if (c.agent) console.log(`     advisor: ${c.agent} (commission starts counting once verified)`);
  if (c.paid_count > 0) eligible.push(c);
}

if (!APPLY) { console.log(`\nWould grant: ${eligible.length}. Re-run with --apply to write.`); process.exit(0); }

for (const c of eligible) {
  await db`
    UPDATE businesses
    SET status = 'verified',
        verified_at = COALESCE(verified_at, NOW()),
        badge_source = COALESCE(badge_source, 'subscription'),
        updated_at = NOW()
    WHERE id = ${c.id} AND status <> 'verified'`;
  console.log(`granted: ${c.company_name}`);
}
console.log(`\nGranted ${eligible.length}. badge_source='subscription' — the documents have not been reviewed yet.`);
