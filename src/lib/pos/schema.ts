import db, { withTransaction } from '@/lib/db';
import { POS_MIGRATIONS, LATEST_POS_SCHEMA_VERSION } from './migrations';

let schemaReady: Promise<void> | null = null;

/**
 * Brings the POS schema up to the latest version, once per server instance.
 *
 * The previous version checked only whether pos_sales existed and returned
 * early if it did — so no column or table added after the first deploy could
 * ever reach a database that already had POS. This applies each numbered
 * migration in src/lib/pos/migrations.ts that has not run yet, under a
 * Postgres advisory lock so concurrent cold starts cannot race, and records it
 * in pos_schema_migrations.
 *
 * A migration that fails rolls back completely and the error is thrown on
 * every POS request until it is fixed — POS refuses to run on a schema it
 * does not understand rather than half-working.
 */
export function ensurePosSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runPendingPosMigrations()
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null;
        console.error('[pos] schema migration failed:', err);
        throw new Error(`POS database schema is not ready: ${err instanceof Error ? err.message : String(err)}`);
      });
  }
  return schemaReady;
}

/** Applies pending migrations. Returns the versions applied by this call. */
export async function runPendingPosMigrations(): Promise<number[]> {
  await db`
    CREATE TABLE IF NOT EXISTS pos_schema_migrations (
      version     INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const [current] = await db`SELECT COALESCE(MAX(version), 0)::int AS v FROM pos_schema_migrations`;
  if (Number(current?.v ?? 0) >= LATEST_POS_SCHEMA_VERSION) return [];

  const applied: number[] = [];
  for (const migration of POS_MIGRATIONS) {
    const didApply = await withTransaction(async (tx) => {
      // Serialises migrations across instances; released at COMMIT.
      await tx`SELECT pg_advisory_xact_lock(hashtext('verifiedbizlink_pos_schema'))`;
      const [done] = await tx`SELECT 1 FROM pos_schema_migrations WHERE version = ${migration.version}`;
      if (done) return false;
      await tx([migration.sql] as unknown as TemplateStringsArray);
      await tx`INSERT INTO pos_schema_migrations (version, name) VALUES (${migration.version}, ${migration.name})`;
      return true;
    });
    if (didApply) applied.push(migration.version);
  }
  return applied;
}

/** Test helper: forget that the schema was checked in this process. */
export function __resetPosSchemaCacheForTests() {
  schemaReady = null;
}
