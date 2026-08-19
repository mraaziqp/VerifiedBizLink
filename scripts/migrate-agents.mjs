/**
 * Affiliate/agent programme schema — additive and safe to re-run.
 *
 *   node scripts/migrate-agents.mjs
 *   DATABASE_URL=<other-db> node scripts/migrate-agents.mjs
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import crypto from 'node:crypto';

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync('.env.local', 'utf8').replace(/^﻿/, '');
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
}

const url = resolveUrl();
console.log('target host:', url.replace(/^.*@/, '').split('/')[0]);
const db = neon(url);

const steps = [
  // The agent's public code. Lives on users so it survives role changes and
  // needs no join to resolve on the signup page.
  ['users.referral_code', db`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT`],
  ['users.referral_code unique', db`
    CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_key
    ON users (referral_code) WHERE referral_code IS NOT NULL`],

  // How a business arrived. assisted_by_user_id already records WHO; this
  // records HOW, so a link-driven signup is distinguishable from one where
  // the agent was picked manually from the dropdown.
  ['businesses.referral_code', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS referral_code TEXT`],
  ['businesses.attribution_source', db`
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS attribution_source TEXT`],

  // One-time invites for newly hired marketers.
  ['agent_invites table', db`
    CREATE TABLE IF NOT EXISTS agent_invites (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash     TEXT UNIQUE NOT NULL,
      full_name      TEXT NOT NULL,
      email          TEXT NOT NULL,
      referral_code  TEXT NOT NULL,
      created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by_name TEXT,
      expires_at     TIMESTAMPTZ NOT NULL,
      accepted_at    TIMESTAMPTZ,
      accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      revoked_at     TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ['agent_invites email index', db`
    CREATE INDEX IF NOT EXISTS agent_invites_email_idx ON agent_invites (lower(email))`],

  // Commission payouts. Commission itself is always DERIVED from payments so
  // it can never drift; this table records only what has actually been paid.
  ['commission_payouts table', db`
    CREATE TABLE IF NOT EXISTS commission_payouts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents  INT NOT NULL,
      period_start  DATE,
      period_end    DATE,
      reference     TEXT,
      note          TEXT,
      paid_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recorded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
      recorded_by_name TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ['commission_payouts agent index', db`
    CREATE INDEX IF NOT EXISTS commission_payouts_agent_idx
    ON commission_payouts (agent_id, paid_at DESC)`],
];

for (const [label, promise] of steps) {
  try { await promise; console.log('  ok   ', label); }
  catch (e) { console.error('  FAIL ', label, '-', e.message); process.exitCode = 1; }
}

// Backfill a code for any existing sales agent that lacks one.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 ambiguity
function makeCode() {
  let s = '';
  while (s.length < 6) {
    const b = crypto.randomBytes(1)[0];
    if (b < 256 - (256 % ALPHABET.length)) s += ALPHABET[b % ALPHABET.length];
  }
  return s;
}

const needing = await db`
  SELECT id, full_name FROM users WHERE role = 'sales_agent' AND referral_code IS NULL`;
for (const u of needing) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      await db`UPDATE users SET referral_code = ${code} WHERE id = ${u.id}`;
      console.log(`  ok    code ${code} -> ${u.full_name}`);
      break;
    } catch { /* collision, try again */ }
  }
}
console.log(`  ok    backfilled ${needing.length} agent code(s)`);
console.log('\nmigration complete');
