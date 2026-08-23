/**
 * Agent issue reporting — a direct line from a field marketer to the admins,
 * with a screenshot so a problem can be understood without a phone call.
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
  ['agent_issues table', db`
    CREATE TABLE IF NOT EXISTS agent_issues (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category       TEXT NOT NULL DEFAULT 'other',
      priority       TEXT NOT NULL DEFAULT 'normal',
      subject        TEXT NOT NULL,
      description    TEXT NOT NULL,
      -- Where the agent was when it happened; saves a round of questions.
      page_url       TEXT,
      screenshot_url TEXT,
      status         TEXT NOT NULL DEFAULT 'open',
      admin_response TEXT,
      responded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
      responded_by_name TEXT,
      responded_at   TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ['status values', db`
    ALTER TABLE agent_issues DROP CONSTRAINT IF EXISTS agent_issues_status_check`],
  ['status check', db`
    ALTER TABLE agent_issues ADD CONSTRAINT agent_issues_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))`],
  ['priority values', db`
    ALTER TABLE agent_issues DROP CONSTRAINT IF EXISTS agent_issues_priority_check`],
  ['priority check', db`
    ALTER TABLE agent_issues ADD CONSTRAINT agent_issues_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'blocking'))`],
  ['agent index', db`
    CREATE INDEX IF NOT EXISTS agent_issues_agent_idx ON agent_issues (agent_id, created_at DESC)`],
  ['status index', db`
    CREATE INDEX IF NOT EXISTS agent_issues_status_idx ON agent_issues (status, created_at DESC)`],
];

for (const [label, promise] of steps) {
  try { await promise; console.log('  ok   ', label); }
  catch (e) { console.error('  FAIL ', label, '-', e.message); process.exitCode = 1; }
}

const [c] = await db`SELECT COUNT(*)::int AS n FROM agent_issues`;
console.log(`\nagent_issues rows: ${c.n}`);
console.log('migration complete');
