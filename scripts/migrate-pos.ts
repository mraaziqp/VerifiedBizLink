/**
 * Applies pending POS schema migrations (src/lib/pos/migrations.ts) to the
 * database in DATABASE_URL.
 *
 *   npm run db:migrate:pos            # apply
 *   npm run db:migrate:pos -- --check # report only, change nothing
 *
 * The app also applies these automatically on the first POS request, under an
 * advisory lock; this script exists so a deploy can run them deliberately and
 * see the result. Every migration is additive and idempotent.
 */
import 'dotenv/config';
import db from '../src/lib/db';
import { POS_MIGRATIONS, LATEST_POS_SCHEMA_VERSION } from '../src/lib/pos/migrations';
import { runPendingPosMigrations } from '../src/lib/pos/schema';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const host = (() => { try { return new URL(process.env.DATABASE_URL!).host; } catch { return '(unparseable)'; } })();
  console.log(`Database host: ${host}`);

  await db`CREATE TABLE IF NOT EXISTS pos_schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const done = new Set((await db`SELECT version FROM pos_schema_migrations`).map((r) => Number(r.version)));
  const pending = POS_MIGRATIONS.filter((m) => !done.has(m.version));
  console.log(`Latest version: ${LATEST_POS_SCHEMA_VERSION}. Pending: ${pending.length ? pending.map((m) => `${m.version} (${m.name})`).join(', ') : 'none'}`);

  if (process.argv.includes('--check') || pending.length === 0) return;
  const applied = await runPendingPosMigrations();
  console.log(`Applied: ${applied.join(', ') || 'none'}`);
}

main().catch((err) => {
  console.error('POS migration failed (nothing from the failed step was kept):', err);
  process.exit(1);
});
