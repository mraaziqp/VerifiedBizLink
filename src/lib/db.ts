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

// Tagged template literal helper — always returns Record<string, any>[]
export default function db(strings: TemplateStringsArray, ...values: any[]): Promise<Record<string, any>[]> {
  return getDb()(strings, ...values) as unknown as Promise<Record<string, any>[]>;
}
