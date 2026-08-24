/**
 * Is the live site actually working?
 *
 * Checks the deployed application over the network and the database behind
 * it, rather than the source in this folder — a green build proves the code
 * compiles, not that anything is reachable or configured in production.
 *
 *   node scripts/audit-live.mjs
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const SITE = process.env.AUDIT_URL || 'https://www.verifiedbizlink.co.za';
const APEX = SITE.replace('://www.', '://');

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

let pass = 0, fail = 0, warn = 0;
const ok = (m, d = '') => { pass++; console.log(`  PASS  ${m}${d ? ' — ' + d : ''}`); };
const bad = (m, d = '') => { fail++; console.log(`  FAIL  ${m}${d ? ' — ' + d : ''}`); };
const note = (m, d = '') => { warn++; console.log(`  WARN  ${m}${d ? ' — ' + d : ''}`); };

async function hit(url, { method = 'GET' } = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const res = await fetch(url, { method, redirect: 'manual', signal: c.signal });
    return { status: res.status, location: res.headers.get('location'), body: res };
  } catch (e) {
    return { error: e.message };
  } finally { clearTimeout(t); }
}

console.log(`Auditing ${SITE}\n`);

console.log('=== the site is reachable ===');
for (const [label, path] of [
  ['home', '/'], ['pricing', '/pricing'], ['login', '/login'], ['signup', '/signup'],
]) {
  const r = await hit(SITE + path);
  if (r.error) bad(`${label} (${path})`, r.error);
  else if (r.status >= 500) bad(`${label} (${path})`, `HTTP ${r.status}`);
  else ok(`${label} (${path})`, `HTTP ${r.status}${r.location ? ' -> ' + r.location : ''}`);
}

console.log('\n=== the apex domain ===');
{
  const r = await hit(APEX);
  if (r.error) bad('apex resolves', `${APEX} — ${r.error}. Add DNS forwarding at the registrar.`);
  else if ([301, 302, 307, 308].includes(r.status)) ok('apex redirects to www', `HTTP ${r.status} -> ${r.location}`);
  else ok('apex serves', `HTTP ${r.status}`);
}

console.log('\n=== public APIs answer without a session ===');
for (const [label, path, expect] of [
  ['tiers', '/api/tiers', 200],
  ['referral lookup', '/api/referral?code=nosuchcode', 200],
]) {
  const r = await hit(SITE + path);
  if (r.error) bad(label, r.error);
  else if (r.status !== expect) bad(label, `HTTP ${r.status}, expected ${expect}`);
  else ok(label, `HTTP ${r.status}`);
}

console.log('\n=== a real advisor referral link resolves on the live site ===');
{
  const agents = await db`
    SELECT full_name, referral_code FROM users
    WHERE role='sales_agent' AND is_suspended IS NOT TRUE AND referral_code IS NOT NULL
    ORDER BY created_at LIMIT 3`;
  for (const a of agents) {
    const r = await hit(`${SITE}/api/referral?code=${encodeURIComponent(a.referral_code)}`);
    if (r.error) { bad(`${a.full_name} (${a.referral_code})`, r.error); continue; }
    const data = await r.body.json().catch(() => ({}));
    if (data.valid) ok(`${a.full_name}`, `code "${a.referral_code}" resolves live`);
    else bad(`${a.full_name}`, `code "${a.referral_code}" returns invalid — their link is dead`);
  }
}

console.log('\n=== payments ===');
{
  const [c] = await db`SELECT COUNT(*)::int n FROM payments WHERE payfast_reference IS NOT NULL`;
  if (c.n > 0) ok('PayFast has confirmed at least one payment', `${c.n} confirmed`);
  else bad('no payment has ever been confirmed by PayFast', 'the ITN pipeline is unproven');

  const itn = await db`SELECT outcome, COUNT(*)::int n FROM payfast_itn_log GROUP BY outcome`.catch(() => []);
  if (itn.length === 0) note('no ITN has been received at all');
  for (const i of itn) {
    if (i.outcome.startsWith('rejected')) bad(`ITN outcome "${i.outcome}"`, `${i.n} — PayFast called and was turned away`);
    else ok(`ITN outcome "${i.outcome}"`, `${i.n}`);
  }

  const [stale] = await db`
    SELECT COUNT(*)::int n FROM payments
    WHERE status='pending' AND created_at < NOW() - INTERVAL '3 days'`;
  if (stale.n === 0) ok('no stale pending checkouts');
  else note(`${stale.n} checkout(s) pending for over 3 days`, 'run scripts/clear-stale-payments.mjs');

  const [orph] = await db`
    SELECT COUNT(*)::int n FROM payments p
    WHERE p.status='completed' AND p.completed_at IS NULL`;
  if (orph.n === 0) ok('every completed payment is dated');
  else bad(`${orph.n} completed payment(s) have no date`);
}

console.log('\n=== the advisor programme ===');
{
  const agents = await db`SELECT id, full_name, referral_code FROM users WHERE role='sales_agent'`;
  const missing = agents.filter((a) => !a.referral_code);
  if (missing.length === 0) ok(`all ${agents.length} advisors have a referral code`);
  else bad(`${missing.length} advisor(s) have no code`, missing.map((m) => m.full_name).join(', '));

  const seen = new Map();
  for (const a of agents) {
    const k = String(a.referral_code || '').toLowerCase();
    if (k) seen.set(k, (seen.get(k) || 0) + 1);
  }
  const dup = [...seen.entries()].filter(([, n]) => n > 1);
  if (dup.length === 0) ok('codes are unique, ignoring case');
  else bad('duplicate codes', dup.map(([k]) => k).join(', '));

  const [orphan] = await db`
    SELECT COUNT(*)::int n FROM businesses
    WHERE assisted_by_user_id IS NULL AND assisted_by IS NOT NULL AND TRIM(assisted_by) <> ''`;
  if (orphan.n === 0) ok('no attribution left unresolved');
  else bad(`${orphan.n} business(es) name an advisor who was never matched`, 'run scripts/backfill-attribution.mjs');

  const earning = await db`
    WITH fp AS (
      SELECT DISTINCT ON (p.user_id) p.user_id, p.amount
      FROM payments p WHERE p.status='completed'
      ORDER BY p.user_id, COALESCE(p.completed_at,p.created_at) ASC)
    SELECT ag.full_name AS agent, b.company_name, fp.amount
    FROM businesses b JOIN fp ON fp.user_id=b.user_id
    JOIN users ag ON ag.id=b.assisted_by_user_id
    WHERE b.status='verified' AND b.user_id <> b.assisted_by_user_id`;
  if (earning.length === 0) note('no advisor has a commissionable sale yet');
  for (const e of earning) {
    ok(`${e.agent} earns on ${e.company_name}`, `R${(Number(e.amount) * 0.2 / 100).toFixed(2)} at the 20% rate`);
  }
}

console.log('\n=== verification and vetting ===');
{
  const [paidUnreviewed] = await db`
    SELECT COUNT(*)::int n FROM businesses
    WHERE status='verified' AND badge_source IN ('subscription','verification_fee')
      AND documents_reviewed_at IS NULL`;
  if (paidUnreviewed.n === 0) ok('no badge is outstanding a document review');
  else note(`${paidUnreviewed.n} business(es) hold a paid-for badge nobody has checked`, 'see /admin/vetting');

  const [mismatch] = await db`
    SELECT COUNT(*)::int n FROM businesses
    WHERE package_type <> 'free' AND status <> 'verified'`;
  if (mismatch.n === 0) ok('every paying business carries the badge it paid for');
  else bad(`${mismatch.n} paying business(es) have no badge`);
}

console.log('\n=== schema the newer features depend on ===');
{
  const tables = (await db`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`).map((r) => r.table_name);
  for (const t of ['payfast_itn_log', 'commission_clawbacks', 'agent_issues', 'agent_activity_log', 'agent_leads']) {
    if (tables.includes(t)) ok(`table ${t}`);
    else bad(`table ${t} is missing`);
  }
  const bcols = (await db`SELECT column_name FROM information_schema.columns WHERE table_name='businesses'`).map((r) => r.column_name);
  for (const c of ['badge_source', 'documents_reviewed_at', 'assisted_by_user_id', 'attribution_source']) {
    if (bcols.includes(c)) ok(`businesses.${c}`);
    else bad(`businesses.${c} is missing`);
  }
  const pcols = (await db`SELECT column_name FROM information_schema.columns WHERE table_name='payments'`).map((r) => r.column_name);
  for (const c of ['purchase_type', 'payfast_reference', 'reversed_at']) {
    if (pcols.includes(c)) ok(`payments.${c}`);
    else bad(`payments.${c} is missing`);
  }
}

console.log('\n---------------------------------------------');
console.log(`${pass} passed, ${warn} warning(s), ${fail} failure(s)`);
if (fail === 0 && warn === 0) console.log('Everything checked is live and working.');
else if (fail === 0) console.log('Live and working, with the warnings above worth a look.');
else console.log('Some checks failed — see FAIL lines above.');
