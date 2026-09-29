/**
 * Billing event log + failed-payment notice tracking.
 *
 * billing_events is the one place every money event lands: each charge,
 * each failure, each email sent (or not), each downgrade. Before it, a
 * renewal that never charged left no trace anywhere — the only way to find
 * out was a customer noticing, or nobody noticing at all.
 *
 * Additive only: a new table and two nullable columns. Safe to re-run.
 *
 *   node scripts/migrate-billing-events.mjs
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const db = neon(env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, ''));

await db`
  CREATE TABLE IF NOT EXISTS billing_events (
    id BIGSERIAL PRIMARY KEY,
    event TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    business_id TEXT NULL,
    user_id TEXT NULL,
    amount_cents INTEGER NULL,
    reference TEXT NULL,
    detail TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
await db`CREATE INDEX IF NOT EXISTS billing_events_created_idx ON billing_events (created_at DESC)`;
await db`CREATE INDEX IF NOT EXISTS billing_events_business_idx ON billing_events (business_id, created_at DESC)`;

// When the first "payment failed" email for the current failure went out.
// grace_warned_at already exists and now marks the final reminder.
await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_failed_notified_at TIMESTAMPTZ NULL`;
await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_failed_reason TEXT NULL`;

const [t] = await db`SELECT COUNT(*)::int n FROM billing_events`;
console.log(`billing_events ready (${t.n} rows); businesses.payment_failed_notified_at + payment_failed_reason ready`);
