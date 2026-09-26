import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Serverless-First Drizzle Database Client
 * Powered by @neondatabase/serverless HTTP driver.
 * Prevents connection pooling bottlenecks and ensures edge runtime stability.
 */
function createDbClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allows build-time compilation without throwing if env var is missing during bundle
    console.warn('DATABASE_URL is not set — Drizzle queries will fail at runtime');
    const dummySql = neon('postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require');
    return drizzle(dummySql, { schema });
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export const db = createDbClient();
export * from './schema';
