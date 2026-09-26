import { neon } from '@neondatabase/serverless';

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

// Tagged template literal helper — always returns DbRow[]
export default function db(strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRow[]> {
  return getDb()(strings, ...values) as unknown as Promise<DbRow[]>;
}

/**
 * Run a constant SQL statement that can't be written as a tagged template
 * (DDL from a list, e.g. CREATE INDEX CONCURRENTLY). Never pass user input:
 * nothing here is parameterised.
 */
export function rawStatement(sql: string): Promise<DbRow[]> {
  return getDb().query(sql) as unknown as Promise<DbRow[]>;
}
