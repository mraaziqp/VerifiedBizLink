/**
 * Billing engine migration — additive only.
 *
 * Every statement is IF NOT EXISTS so it is safe to re-run, and safe to run
 * against production after it has been proven on the QaTst branch. Nothing
 * here drops or rewrites existing data: a cancelled or lapsed business keeps
 * every row it had, because the product rule is downgrade-not-delete.
 *
 *   node scripts/migrate-billing.mjs            # uses DATABASE_URL from .env.local
 *   DATABASE_URL=<prod-url> node scripts/migrate-billing.mjs
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync('.env.local', 'utf8').replace(/^﻿/, '');
  const m = env.match(/^DATABASE_URL=(.*)$/m);
  if (!m) throw new Error('No DATABASE_URL in env or .env.local');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const url = resolveUrl();
console.log('target host:', url.replace(/^.*@/, '').split('/')[0]);
const db = neon(url);

const steps = [
  // Belongs to the abandoned-signups cron rather than billing, but it is the
  // other column production is missing — folded in so one run covers both.
  ['users.abandoned_email_sent_at', db`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMPTZ`],
  ['businesses.auto_renew', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT TRUE`],
  ['businesses.billing_interval_months', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS billing_interval_months INT NOT NULL DEFAULT 1`],
  ['businesses.next_billing_at', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ`],
  // Set the moment a payment first fails; the 72-hour grace clock runs from here.
  ['businesses.payment_failed_at', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ`],
  // Set when the halfway-point warning goes out, so the hourly cron warns
  // once per failure rather than every hour for three days.
  ['businesses.grace_warned_at', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS grace_warned_at TIMESTAMPTZ`],
  ['businesses.cancelled_at', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`],
  ['businesses.cancellation_reason', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`],
  // Which tier they were on before an automatic downgrade, so support can see
  // what someone lost and reinstate it without guessing.
  ['businesses.downgraded_from', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS downgraded_from TEXT`],
  ['businesses.downgraded_at', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ`],

  ['invoices table', db`
    CREATE TABLE IF NOT EXISTS invoices (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number     TEXT UNIQUE NOT NULL,
      user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id        UUID,
      tier_key           TEXT,
      tier_name          TEXT,
      description        TEXT,
      amount_cents       INT NOT NULL,
      currency           TEXT NOT NULL DEFAULT 'ZAR',
      interval_months    INT NOT NULL DEFAULT 1,
      period_start       TIMESTAMPTZ,
      period_end         TIMESTAMPTZ,
      next_billing_at    TIMESTAMPTZ,
      renewal_price_cents INT,
      status             TEXT NOT NULL DEFAULT 'paid',
      payment_reference  TEXT,
      issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      emailed_at         TIMESTAMPTZ
    )`],
  ['invoices.user_id index', db`
    CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices (user_id, issued_at DESC)`],

  // Durations a tier can be bought for. Kept as a table rather than a constant
  // so admins can add or retire terms without a deploy.
  ['tier_durations table', db`
    CREATE TABLE IF NOT EXISTS tier_durations (
      months          INT PRIMARY KEY,
      label           TEXT NOT NULL,
      discount_percent INT NOT NULL DEFAULT 0,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order      INT NOT NULL DEFAULT 0
    )`],
  ['seed tier_durations', db`
    INSERT INTO tier_durations (months, label, discount_percent, sort_order) VALUES
      (1,  'Monthly',    0,  1),
      (3,  '3 months',   5,  2),
      (6,  '6 months',  10,  3),
      (12, '12 months', 15,  4)
    ON CONFLICT (months) DO NOTHING`],
];

for (const [label, promise] of steps) {
  try {
    await promise;
    console.log('  ok   ', label);
  } catch (e) {
    console.error('  FAIL ', label, '-', e.message);
    process.exitCode = 1;
  }
}

// Backfill: anyone already on a paid tier gets a sensible next billing date so
// the renewal cron does not immediately treat them as overdue.
const backfilled = await db`
  UPDATE businesses
  SET next_billing_at = COALESCE(last_billed_at, NOW()) + INTERVAL '1 month'
  WHERE next_billing_at IS NULL
    AND package_type IS NOT NULL
    AND package_type <> 'free'
  RETURNING id`;
console.log(`  ok    backfilled next_billing_at for ${backfilled.length} paid business(es)`);

console.log('\nmigration complete');
