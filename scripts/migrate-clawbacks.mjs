/**
 * Commission clawbacks — policy §12.
 *
 * "If a qualifying payment is later reversed, refunded or determined to have
 * been invalid, the Company may reverse or recover the related commission."
 *
 * "May" is the operative word: a reversal raises a FLAGGED clawback for a
 * human to approve, rather than silently adjusting what an Advisor is owed.
 * Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync('.env.local', 'utf8').replace(/^﻿/, '');
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
}

const db = neon(resolveUrl());
console.log('target host:', resolveUrl().replace(/^.*@/, '').split('/')[0]);

const steps = [
  // Records WHY a payment stopped qualifying, and when.
  ['payments.reversed_at', db`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ`],
  ['payments.reversal_reason', db`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_reason TEXT`],
  ['payments.reversed_by_name', db`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by_name TEXT`],

  ['commission_clawbacks table', db`
    CREATE TABLE IF NOT EXISTS commission_clawbacks (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id       UUID,
      payment_reference TEXT,
      -- What the reversed payment had earned, captured at the moment the
      -- reversal happened. Recomputing later would give a different answer
      -- once the payment no longer counts toward its week's tier.
      commission_cents  INT NOT NULL,
      payment_cents     INT NOT NULL,
      rate_applied      NUMERIC(5,4),
      reason            TEXT NOT NULL,
      -- Was this commission already paid out when the reversal landed? That
      -- is the difference between "reduce what we owe" and "recover money".
      already_paid_out  BOOLEAN NOT NULL DEFAULT FALSE,
      status            TEXT NOT NULL DEFAULT 'pending',
      review_note       TEXT,
      reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by_name  TEXT,
      reviewed_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ['clawback status values', db`
    ALTER TABLE commission_clawbacks DROP CONSTRAINT IF EXISTS commission_clawbacks_status_check`],
  ['clawback status check', db`
    ALTER TABLE commission_clawbacks ADD CONSTRAINT commission_clawbacks_status_check
    CHECK (status IN ('pending', 'approved', 'waived', 'recovered'))`],
  ['clawback agent index', db`
    CREATE INDEX IF NOT EXISTS commission_clawbacks_agent_idx
    ON commission_clawbacks (agent_id, status)`],
  ['clawback status index', db`
    CREATE INDEX IF NOT EXISTS commission_clawbacks_status_idx
    ON commission_clawbacks (status, created_at DESC)`],
  // One clawback per reversed payment — a repeated webhook must not raise
  // the same recovery twice.
  ['clawback payment uniqueness', db`
    CREATE UNIQUE INDEX IF NOT EXISTS commission_clawbacks_payment_key
    ON commission_clawbacks (payment_reference) WHERE payment_reference IS NOT NULL`],
];

for (const [label, promise] of steps) {
  try { await promise; console.log('  ok   ', label); }
  catch (e) { console.error('  FAIL ', label, '-', e.message); process.exitCode = 1; }
}

const [c] = await db`SELECT COUNT(*)::int AS n FROM commission_clawbacks`;
console.log(`\ncommission_clawbacks rows: ${c.n}`);
console.log('migration complete');
