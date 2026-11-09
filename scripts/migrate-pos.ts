/**
 * Applies pending POS schema migrations (src/lib/pos/migrations.ts) to the
 * database in DATABASE_URL (read from .env.local, then .env).
 *
 *   npm run db:migrate:pos            # apply
 *   npm run db:migrate:pos -- --check # READ-ONLY: report state and what v2 would change
 *
 * --check issues SELECTs only — no CREATE, no UPDATE — so it is safe to point
 * at production before deciding to deploy.
 *
 * The app also applies migrations automatically on the first POS request,
 * under an advisory lock. Every migration is additive and idempotent.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import db from '../src/lib/db';
import { POS_MIGRATIONS, LATEST_POS_SCHEMA_VERSION } from '../src/lib/pos/migrations';
import { runPendingPosMigrations } from '../src/lib/pos/schema';

const exists = async (table: string) => Boolean((await db`SELECT to_regclass(${table}) IS NOT NULL AS ok`)[0]?.ok);

async function preview() {
  const hasMigrations = await exists('pos_schema_migrations');
  const done = hasMigrations ? new Set((await db`SELECT version FROM pos_schema_migrations`).map((r) => Number(r.version))) : new Set<number>();
  const pending = POS_MIGRATIONS.filter((m) => !done.has(m.version));
  console.log(`Schema version table present: ${hasMigrations ? 'yes' : 'no'}`);
  console.log(`Pending migrations: ${pending.length ? pending.map((m) => `${m.version} (${m.name})`).join(', ') : 'none'}`);

  if (!(await exists('pos_sales'))) {
    console.log('No POS tables yet: migration 1 creates them, migration 2 hardens them. No existing data is affected.');
    return;
  }

  const [counts] = await db`
    SELECT
      (SELECT COUNT(*) FROM pos_merchant_subscriptions) AS subscriptions,
      (SELECT COUNT(*) FROM pos_merchant_subscriptions WHERE status = 'active' AND payfast_token IS NULL) AS free_active,
      (SELECT COUNT(*) FROM pos_merchant_subscriptions WHERE status = 'active' AND payfast_token IS NOT NULL) AS paid_active,
      (SELECT COUNT(*) FROM pos_merchant_subscriptions WHERE status = 'trial') AS trials,
      (SELECT COUNT(*) FROM (SELECT business_id FROM pos_merchant_subscriptions GROUP BY business_id HAVING COUNT(*) > 1) d) AS businesses_with_duplicate_subs,
      (SELECT COUNT(*) FROM pos_sales) AS sales,
      (SELECT COUNT(DISTINCT business_id) FROM pos_sales) AS businesses_with_sales,
      (SELECT COUNT(*) FROM pos_sales WHERE payment_method IN ('card_tap', 'qr_online')) AS card_or_qr_sales,
      (SELECT COUNT(*) FROM (SELECT 1 FROM pos_sales GROUP BY business_id, receipt_number HAVING COUNT(*) > 1) d) AS duplicate_receipt_numbers,
      (SELECT COUNT(*) FROM pos_products) AS products,
      (SELECT COUNT(*) FROM pos_products WHERE stock_quantity < 0) AS negative_stock_products
  `;
  console.log('\nExisting POS data:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(32)} ${v}`);

  if (pending.some((m) => m.version === 2)) {
    console.log('\nWhat migration 2 will change in existing data:');
    console.log(`  - ${counts.free_active} subscription(s) marked 'active' without ever paying -> 'inactive' (they must activate through PayFast; their data is kept)`);
    console.log(`  - duplicate unpaid subscription rows removed for ${counts.businesses_with_duplicate_subs} business(es) (oldest kept)`);
    console.log(`  - ${counts.duplicate_receipt_numbers} duplicated receipt number(s) get a "-2", "-3" suffix`);
    console.log(`  - all ${counts.sales} existing sale(s) become 'not_billable': no fee is ever charged on sales made before paid POS terms`);
    if (Number(counts.card_or_qr_sales) > 0) {
      console.log(`  ! ${counts.card_or_qr_sales} existing card/QR sale(s) were recorded by the old code, which auto-approved card taps.`);
      console.log('    They were never verified and will be flagged for review in Sales.');
    }
    if (Number(counts.negative_stock_products) > 0) {
      console.log(`  ! ${counts.negative_stock_products} product(s) have negative stock; the new non-negative rule applies to future changes only.`);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const host = (() => { try { return new URL(process.env.DATABASE_URL!).host; } catch { return '(unparseable)'; } })();
  console.log(`Database host: ${host}`);
  console.log(`Latest POS schema version: ${LATEST_POS_SCHEMA_VERSION}\n`);

  await preview();
  if (process.argv.includes('--check')) {
    console.log('\n--check: nothing was changed.');
    return;
  }
  const applied = await runPendingPosMigrations();
  console.log(`\nApplied: ${applied.join(', ') || 'none'}`);
}

main().catch((err) => {
  console.error('POS migration failed (nothing from the failed step was kept):', err);
  process.exit(1);
});
