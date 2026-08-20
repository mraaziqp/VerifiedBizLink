/**
 * Payout reconciliation — matching what we recorded against what the bank
 * actually shows. Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync('.env.local', 'utf8').replace(/^﻿/, '');
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
}

const url = resolveUrl();
console.log('target host:', url.replace(/^.*@/, '').split('/')[0]);
const db = neon(url);

const steps = [
  // recorded  -> an admin says it was paid
  // reconciled-> a bank line has been matched to it
  // disputed  -> the bank shows something different, or nothing
  ['commission_payouts.status', db`
    ALTER TABLE commission_payouts
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'recorded'`],
  ['status check', db`
    ALTER TABLE commission_payouts DROP CONSTRAINT IF EXISTS commission_payouts_status_check`],
  ['status allowed values', db`
    ALTER TABLE commission_payouts ADD CONSTRAINT commission_payouts_status_check
    CHECK (status IN ('recorded', 'reconciled', 'disputed'))`],

  // What the bank actually showed, kept separately from what we recorded, so
  // a mismatch is visible rather than overwritten.
  ['bank_reference', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS bank_reference TEXT`],
  ['statement_amount_cents', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS statement_amount_cents INT`],
  ['statement_date', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS statement_date DATE`],
  ['reconciled_at', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ`],
  ['reconciled_by_name', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS reconciled_by_name TEXT`],
  ['reconciliation_note', db`
    ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS reconciliation_note TEXT`],
  ['status index', db`
    CREATE INDEX IF NOT EXISTS commission_payouts_status_idx
    ON commission_payouts (status, paid_at DESC)`],
];

for (const [label, promise] of steps) {
  try { await promise; console.log('  ok   ', label); }
  catch (e) { console.error('  FAIL ', label, '-', e.message); process.exitCode = 1; }
}

const [counts] = await db`
  SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'reconciled')::int AS reconciled
  FROM commission_payouts`;
console.log(`\npayouts: ${counts.total} total, ${counts.reconciled} reconciled`);
console.log('migration complete');
