/**
 * V3 Migration — adds user_preferences table, business package columns,
 * and onboarding_completed flags.
 * Safe to re-run (all statements are idempotent).
 * Run with:  npx tsx scripts/migrate-v3.ts
 */
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running v3 migration...\n');

  // User preferences (for ad/business matching algorithm)
  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
      industries JSONB DEFAULT '[]',
      services JSONB DEFAULT '[]',
      interests JSONB DEFAULT '[]',
      location VARCHAR(120) DEFAULT '',
      province VARCHAR(60) DEFAULT '',
      onboarding_completed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓  user_preferences');

  // Business package/trial columns
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS package_type VARCHAR(30) DEFAULT 'free'`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_package VARCHAR(30) DEFAULT NULL`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS industry VARCHAR(120) DEFAULT ''`;
  console.log('✓  businesses columns (package_type, trial_package, trial_ends_at, onboarding_completed, industry)');

  // Add target_industries to ads for matching
  await sql`ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_industries JSONB DEFAULT '[]'`;
  await sql`ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_provinces JSONB DEFAULT '[]'`;
  console.log('✓  ads columns (target_industries, target_provinces)');

  // Onboarding completed flag on users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`;
  console.log('✓  users.onboarding_completed');

  console.log('\nMigration v3 complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
