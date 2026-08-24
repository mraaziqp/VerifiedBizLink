/**
 * businesses.badge_source — how a business came to carry the verified badge.
 *
 * Every paid plan now includes vetting and the badge, and the R49 once-off is
 * the same deal without a subscription. Both grant the badge on payment, which
 * is what the customer bought.
 *
 * That leaves one question nobody could answer afterwards: has anyone actually
 * looked at this business's documents? Once payment sets status='verified' the
 * business drops out of the vetting queue entirely, so a badge sold and a badge
 * earned become indistinguishable — on a platform whose whole product is
 * verification, that is worth one column.
 *
 *   subscription      the badge came with a paid plan
 *   verification_fee  the R49 once-off
 *   vetting_review    a person checked the documents and approved it
 *
 * Additive and safe to re-run.
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

await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS badge_source TEXT`;
await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS documents_reviewed_at TIMESTAMPTZ`;
console.log('businesses.badge_source and documents_reviewed_at ready');

// Everything verified before this existed went through the vetting desk —
// that was the only route to the badge at the time.
const back = await db`
  UPDATE businesses
  SET badge_source = 'vetting_review',
      documents_reviewed_at = COALESCE(documents_reviewed_at, verified_at)
  WHERE status = 'verified' AND badge_source IS NULL
  RETURNING company_name`;
console.log(`marked ${back.length} existing verified business(es) as vetting_review:`);
for (const r of back) console.log(`  ${r.company_name}`);

await db`CREATE INDEX IF NOT EXISTS businesses_badge_source_idx ON businesses (badge_source)`;
console.log('index ready');
