/**
 * Editable platform settings + per-agent commission overrides.
 * Additive and safe to re-run.
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
  // Generic key/value store so operational numbers can change without a
  // deploy. JSONB rather than TEXT so a setting can grow from a single value
  // into a structure (the milestone ladder already needs that).
  ['platform_settings table', db`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key             TEXT PRIMARY KEY,
      value           JSONB NOT NULL,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by_name TEXT
    )`],

  // Who changed what, and to what. Commission rates decide what people are
  // paid, so a change needs to be answerable months later.
  ['platform_settings_history table', db`
    CREATE TABLE IF NOT EXISTS platform_settings_history (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key             TEXT NOT NULL,
      old_value       JSONB,
      new_value       JSONB NOT NULL,
      changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ['settings history key index', db`
    CREATE INDEX IF NOT EXISTS platform_settings_history_key_idx
    ON platform_settings_history (key, created_at DESC)`],

  // A negotiated rate for one agent, overriding the platform default.
  // NULL means "use the default", which is different from 0.
  ['users.commission_rate_override', db`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate_override NUMERIC(5,4)`],
  ['commission rate sanity check', db`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_commission_rate_override_range`],
  ['commission rate range 0..1', db`
    ALTER TABLE users ADD CONSTRAINT users_commission_rate_override_range
    CHECK (commission_rate_override IS NULL
           OR (commission_rate_override >= 0 AND commission_rate_override <= 1))`],

  // Notes an admin keeps against an agent (performance, agreements).
  ['users.agent_notes', db`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_notes TEXT`],

  // Seed the defaults that were previously hardcoded in lib/commission.
  ['seed commission settings', db`
    INSERT INTO platform_settings (key, value, updated_by_name)
    VALUES ('commission', ${JSON.stringify({
      defaultRate: 0.5,
      basis: 'first_payment',
      milestones: [
        { sales: 5, name: 'Bronze', reward: 'Free lunch' },
        { sales: 20, name: 'Silver', reward: 'Half-day off' },
        { sales: 25, name: 'Gold', reward: 'Bonus payout' },
      ],
    })}::jsonb, 'system')
    ON CONFLICT (key) DO NOTHING`],
];

for (const [label, promise] of steps) {
  try { await promise; console.log('  ok   ', label); }
  catch (e) { console.error('  FAIL ', label, '-', e.message); process.exitCode = 1; }
}

const [row] = await db`SELECT value FROM platform_settings WHERE key = 'commission'`;
console.log('\ncommission settings now:', JSON.stringify(row?.value));
console.log('migration complete');
