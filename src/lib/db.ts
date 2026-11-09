import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// The transaction Pool talks to Neon over WebSockets. Node 22+ has a global
// WebSocket; older runtimes (the hosting runtime's Node version is not pinned
// in this repo) need the `ws` package, as Neon's docs prescribe.
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _sql = neon(url);
  }
  return _sql;
}

/**
 * A row from a raw SQL query. Deliberately loose: the tagged-template queries
 * across the app select ad-hoc column sets, and callers narrow what they read.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export type DbRow = Record<string, any>;

/** A tagged-template query function: the shape of `db` and of a transaction handle. */
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<DbRow[]>;

/** Anything that runs a parameterised statement — a pg/Neon Pool client. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: DbRow[] }>;
}

/**
 * Swappable database backend. Production always uses Neon. Tests install a
 * driver backed by a throwaway local Postgres so they never touch the real
 * database, and so the app itself never has to import a test-only package.
 */
export interface DbDriver {
  sql: Sql;
  raw(text: string): Promise<DbRow[]>;
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

let driverOverride: DbDriver | null = null;

/** Test-only. Never call from application code. */
export function __setDbDriverForTests(driver: DbDriver | null) {
  driverOverride = driver;
}

/** Turns a tagged template into `$1, $2 …` placeholders for a Queryable client. */
export function sqlFor(client: Queryable): Sql {
  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 1; i < strings.length; i++) text += `$${i}${strings[i]}`;
    // No parameters -> simple query protocol, which allows several
    // statements in one call (migrations rely on this).
    const res = values.length === 0 ? await client.query(text) : await client.query(text, values);
    // A multi-statement simple query returns one result per statement.
    if (Array.isArray(res)) return (res[res.length - 1] as { rows: DbRow[] })?.rows ?? [];
    return res.rows;
  };
}

// Tagged template literal helper — always returns DbRow[]
export default function db(strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRow[]> {
  if (driverOverride) return driverOverride.sql(strings, ...values);
  return getDb()(strings, ...values) as unknown as Promise<DbRow[]>;
}

/**
 * Run a constant SQL statement that can't be written as a tagged template
 * (DDL from a list, e.g. CREATE INDEX CONCURRENTLY). Never pass user input:
 * nothing here is parameterised.
 */
export function rawStatement(sql: string): Promise<DbRow[]> {
  if (driverOverride) return driverOverride.raw(sql);
  return getDb().query(sql) as unknown as Promise<DbRow[]>;
}

/**
 * Runs `fn` inside one interactive database transaction: every statement
 * issued through `tx` commits together or not at all.
 *
 * The default `db` helper goes over Neon's HTTP endpoint, where each
 * statement is its own transaction — fine for reads and single writes, wrong
 * for anything that moves money or stock across several rows. This opens a
 * WebSocket connection (Neon's `Pool`, which is wire-compatible with `pg`)
 * for the duration of the transaction and closes it afterwards, the pattern
 * Neon recommends for serverless functions.
 *
 * Throwing inside `fn` rolls everything back and rethrows.
 */
export async function withTransaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  if (driverOverride) return driverOverride.transaction(fn);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neonPoolTransaction(url, fn);
}

/**
 * The production transaction path: Neon's WebSocket Pool, one short-lived
 * pool per transaction. Exported so the test suite can run every POS
 * transaction through this exact code (against a local Postgres behind a
 * WebSocket proxy) rather than through a stand-in driver.
 */
export async function neonPoolTransaction<T>(connectionString: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(sqlFor(client as unknown as Queryable));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}
