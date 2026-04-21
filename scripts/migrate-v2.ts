/**
 * V2 Migration — creates support_tickets, deletion_requests, ads, ad_settings tables.
 * Safe to re-run (all statements are idempotent).
 * Run with:  npx tsx scripts/migrate-v2.ts
 */
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running v2 migration...\n');

  // Support tickets
  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      category VARCHAR(60) NOT NULL,
      subject VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      responded_by UUID
    )
  `;
  console.log('✓  support_tickets');

  // Deletion requests
  await sql`
    CREATE TABLE IF NOT EXISTS deletion_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      scheduled_for TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      cancelled_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `;
  console.log('✓  deletion_requests');

  // Ads
  await sql`
    CREATE TABLE IF NOT EXISTS ads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      business_name VARCHAR(120) NOT NULL,
      cta_text VARCHAR(60) DEFAULT 'Learn More',
      cta_url TEXT NOT NULL,
      badge VARCHAR(60),
      is_boosted BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      boost_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `;
  console.log('✓  ads');

  // Ad settings (global toggle)
  await sql`
    CREATE TABLE IF NOT EXISTS ad_settings (
      key VARCHAR(60) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO ad_settings (key, value, updated_at)
    VALUES ('ads_enabled', 'true', NOW())
    ON CONFLICT (key) DO NOTHING
  `;
  console.log('✓  ad_settings  (ads_enabled = true)');

  // Extra document columns (if not already added)
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 0`;
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT ''`;
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS vetting_score INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT ''`;
  console.log('✓  column migrations (documents & users extras)');

  console.log('\nMigration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
