/**
 * Repairs businesses whose assisted_by holds a typed string that was never
 * resolved to an advisor.
 *
 * Before the signup route resolved typed input, a business signed up with an
 * advisor's name or code typed by hand stored that text in assisted_by and
 * left assisted_by_user_id NULL. Commission is calculated from the id, so
 * those sales were credited to nobody.
 *
 * Only exact, unambiguous matches on referral code / full name / email are
 * repaired. Anything that matches two advisors, or none, is reported and left
 * alone — guessing who earned a commission is worse than leaving it for a
 * person to decide.
 *
 * Safe to re-run. Pass --apply to write; without it, it only reports.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const APPLY = process.argv.includes('--apply');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}

const db = neon(databaseUrl());

const orphans = await db`
  SELECT id, company_name, assisted_by
  FROM businesses
  WHERE assisted_by_user_id IS NULL
    AND assisted_by IS NOT NULL
    AND TRIM(assisted_by) <> ''
`;

console.log(`Unresolved attributions found: ${orphans.length}`);
if (orphans.length === 0) {
  console.log('Nothing to repair.');
  process.exit(0);
}

let repaired = 0;
const skipped = [];

for (const b of orphans) {
  const needle = String(b.assisted_by).trim().toLowerCase();

  const matches = await db`
    SELECT id, full_name, referral_code
    FROM users
    WHERE role = 'sales_agent'
      AND is_suspended IS NOT TRUE
      AND (
        LOWER(referral_code) = ${needle}
        OR LOWER(full_name)  = ${needle}
        OR LOWER(email)      = ${needle}
      )
    LIMIT 2
  `;

  if (matches.length !== 1) {
    skipped.push({ company: b.company_name, typed: b.assisted_by, matches: matches.length });
    continue;
  }

  const agent = matches[0];
  console.log(`  "${b.assisted_by}" -> ${agent.full_name} (${b.company_name})`);

  if (APPLY) {
    await db`
      UPDATE businesses
      SET assisted_by_user_id = ${agent.id},
          assisted_by         = ${agent.full_name},
          assisted_signup     = TRUE,
          referral_code       = COALESCE(referral_code, ${agent.referral_code}),
          attribution_source  = COALESCE(attribution_source, 'manual_backfill'),
          updated_at          = NOW()
      WHERE id = ${b.id}
        AND assisted_by_user_id IS NULL
    `;
  }
  repaired += 1;
}

console.log(`\n${APPLY ? 'Repaired' : 'Would repair'}: ${repaired}`);
if (skipped.length) {
  console.log(`Left for a human (${skipped.length}):`);
  for (const s of skipped) {
    console.log(`  "${s.typed}" on ${s.company} — ${s.matches === 0 ? 'no advisor matches' : 'ambiguous, matches several'}`);
  }
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
