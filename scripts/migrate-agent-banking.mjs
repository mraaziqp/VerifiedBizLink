/**
 * Banking details for advisor payouts.
 *
 * The agent portal's "My details" and "Banking & Payout Details" panels, and
 * the profile route behind them, were shipped reading these five columns —
 * but nothing ever created them. Postgres threw "column bank_name does not
 * exist" on the SELECT, the route answered 500, the panel received null, and
 * both sections rendered their headings with no fields underneath. The UI
 * looked half-built when it was actually complete and simply could not load.
 *
 * The same statements exist inside /api/setup/migrate, which had not been run
 * against this database. Kept here as well so the fix is a script anyone can
 * run and re-run, rather than an endpoint someone has to remember to call.
 *
 * Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number TEXT`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_code TEXT`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name TEXT`;
console.log('banking columns ready');

// Prove the route's own SELECT now runs, rather than assuming it does.
const rows = await db`
  SELECT id, full_name, email, phone, location, headline, bio,
         bank_name, account_number, account_type, branch_code, account_holder_name,
         referral_code, commission_rate_override, created_at
  FROM users WHERE role = 'sales_agent' LIMIT 1`;
console.log(`the agent profile query runs: ${rows.length > 0 ? 'yes, returned a row' : 'yes, no agents to return'}`);

const [{ n }] = await db`
  SELECT COUNT(*)::int n FROM users
  WHERE role = 'sales_agent' AND bank_name IS NOT NULL AND TRIM(bank_name) <> ''`;
const [{ t }] = await db`SELECT COUNT(*)::int t FROM users WHERE role = 'sales_agent'`;
console.log(`advisors with banking details captured: ${n} of ${t}`);
console.log('\nThe rest can now enter theirs in the portal under');
console.log('"My Details & Contact Directors".');
