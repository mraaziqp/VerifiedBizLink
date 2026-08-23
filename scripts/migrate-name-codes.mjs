/**
 * Replaces random referral codes with name-based ones for existing agents.
 *
 * Safe to re-run. Only touches agents whose current code is NOT already
 * derived from their name, and skips anyone whose name would clash with a
 * code already in use by someone else.
 *
 * Note: changing a code invalidates any link or QR already handed out, so
 * this prints exactly what changed.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync('.env.local', 'utf8').replace(/^﻿/, '');
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
}

const db = neon(resolveUrl());

const codeFromName = (n) =>
  (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);

const agents = await db`
  SELECT id, full_name, referral_code FROM users
  WHERE role = 'sales_agent' ORDER BY full_name`;

console.log(`${agents.length} agent(s) found\n`);

for (const a of agents) {
  const base = codeFromName(a.full_name);
  if (base.length < 3) {
    console.log(`  skip   ${a.full_name} — name yields no usable code`);
    continue;
  }
  if (a.referral_code === base || (a.referral_code || '').startsWith(base)) {
    console.log(`  ok     ${a.full_name} — already ${a.referral_code}`);
    continue;
  }

  let chosen = base;
  for (let n = 2; n <= 20; n += 1) {
    const clash = await db`
      SELECT 1 FROM users WHERE referral_code = ${chosen} AND id <> ${a.id} LIMIT 1`;
    if (clash.length === 0) break;
    chosen = `${base}${n}`;
  }

  const clash = await db`
    SELECT 1 FROM users WHERE referral_code = ${chosen} AND id <> ${a.id} LIMIT 1`;
  if (clash.length > 0) {
    console.log(`  skip   ${a.full_name} — could not find a free variant of ${base}`);
    continue;
  }

  await db`UPDATE users SET referral_code = ${chosen} WHERE id = ${a.id}`;
  console.log(`  update ${a.full_name}: ${a.referral_code ?? '(none)'} -> ${chosen}`);
}

console.log('\ndone — any previously shared link using an old code will stop working');
