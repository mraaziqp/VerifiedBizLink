#!/usr/bin/env node
/**
 * Mass-load QA script — simulates N concurrent accounts signing up, creating
 * a business profile, and uploading a document and a media file, to measure
 * database capacity and server strain before beta.
 *
 * It drives the real HTTP API rather than the database directly, because the
 * point is to measure the whole stack (route handlers, auth, Neon, Supabase),
 * not just Postgres.
 *
 * ---------------------------------------------------------------------------
 * SAFETY
 * ---------------------------------------------------------------------------
 * This creates hundreds of real accounts with real rows and real uploaded
 * files. Run it against production and you pollute live data and load the
 * site your customers are on. It therefore refuses to run against a
 * production-looking host unless you very explicitly override, and it writes
 * every account it creates to a run file so `--cleanup` can remove them.
 *
 *   node scripts/stress-test.mjs --target http://localhost:9002 --count 200
 *   node scripts/stress-test.mjs --cleanup runs/stress-<id>.json
 *
 * Options:
 *   --target <url>     Base URL to hit. Required.
 *   --count <n>        Virtual users to simulate (default 200).
 *   --concurrency <n>  How many run at once (default 25).
 *   --skip-uploads     Signup + profile only; no document/media uploads.
 *   --cleanup <file>   Delete the accounts listed in a previous run file.
 *                      Requires ADMIN_COOKIE (a staff vbl_session value).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/* -------------------------------------------------------------------------- */
/* Args                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const args = { count: 200, concurrency: 25, skipUploads: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--target') args.target = argv[++i];
    else if (a === '--count') args.count = Number(argv[++i]);
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--skip-uploads') args.skipUploads = true;
    else if (a === '--cleanup') args.cleanup = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

/**
 * Hosts that must never be load-tested by accident.
 *
 * Matching is on hostname only. The override is deliberately a long, awkward
 * literal — a short `--force` flag is too easy to reach for at 2am.
 */
const PRODUCTION_HOSTS = [/(^|\.)verifiedbizlink\.co\.za$/i, /\.vercel\.app$/i];
const PROD_OVERRIDE = 'yes-i-really-want-to-load-test-production';

function assertSafeTarget(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    console.error(`--target must be an absolute URL, got: ${target}`);
    process.exit(2);
  }

  const looksProd = PRODUCTION_HOSTS.some((re) => re.test(url.hostname));
  if (looksProd && process.env.STRESS_ALLOW_PROD !== PROD_OVERRIDE) {
    console.error(
      `\nREFUSING TO RUN.\n\n` +
        `  ${url.hostname} looks like a production host.\n\n` +
        `  This script creates hundreds of real accounts, business profiles and\n` +
        `  uploaded files, and puts the server under sustained concurrent load.\n` +
        `  Against production that means polluted live data and a degraded site\n` +
        `  for real customers.\n\n` +
        `  Point --target at a staging deployment or a local server backed by a\n` +
        `  NON-PRODUCTION database instead.\n\n` +
        `  If you genuinely intend to load-test production, set:\n` +
        `    STRESS_ALLOW_PROD=${PROD_OVERRIDE}\n`,
    );
    process.exit(1);
  }
  return url;
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                       */
/* -------------------------------------------------------------------------- */

/** Per-step latency samples and failure counts. */
class Stats {
  constructor() {
    this.steps = new Map();
  }

  record(step, ms, ok, detail) {
    let s = this.steps.get(step);
    if (!s) {
      s = { samples: [], ok: 0, failed: 0, errors: new Map() };
      this.steps.set(step, s);
    }
    s.samples.push(ms);
    if (ok) s.ok += 1;
    else {
      s.failed += 1;
      if (detail) s.errors.set(detail, (s.errors.get(detail) || 0) + 1);
    }
  }

  static percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  }

  report() {
    const rows = [];
    for (const [step, s] of this.steps) {
      const sorted = [...s.samples].sort((a, b) => a - b);
      const total = s.ok + s.failed;
      rows.push({
        step,
        n: total,
        ok: s.ok,
        failed: s.failed,
        failPct: total ? ((s.failed / total) * 100).toFixed(1) + '%' : '—',
        p50: Math.round(Stats.percentile(sorted, 50)) + 'ms',
        p95: Math.round(Stats.percentile(sorted, 95)) + 'ms',
        p99: Math.round(Stats.percentile(sorted, 99)) + 'ms',
        max: Math.round(sorted[sorted.length - 1] || 0) + 'ms',
      });
    }
    return rows;
  }

  errorSummary() {
    const out = [];
    for (const [step, s] of this.steps) {
      for (const [msg, count] of s.errors) out.push({ step, count, error: msg });
    }
    return out.sort((a, b) => b.count - a.count).slice(0, 15);
  }
}

/* -------------------------------------------------------------------------- */
/* HTTP helpers                                                                */
/* -------------------------------------------------------------------------- */

async function timed(stats, step, fn) {
  const started = performance.now();
  try {
    const result = await fn();
    stats.record(step, performance.now() - started, true);
    return result;
  } catch (error) {
    stats.record(step, performance.now() - started, false, String(error.message || error).slice(0, 120));
    throw error;
  }
}

/** Pulls the vbl_session cookie out of a response so later calls are authed. */
function sessionCookieFrom(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    if (c.startsWith('vbl_session=')) return c.split(';')[0];
  }
  return null;
}

async function expectOk(response, label) {
  if (!response.ok) {
    let body = '';
    try {
      body = JSON.stringify(await response.json()).slice(0, 160);
    } catch {
      body = (await response.text().catch(() => '')).slice(0, 160);
    }
    throw new Error(`${label} ${response.status}: ${body}`);
  }
  return response;
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

/** Every generated account carries this prefix so cleanup can find them. */
const TAG = 'qa-stress';

const INDUSTRIES = [
  'Information Technology', 'Construction & Infrastructure', 'Retail & E-commerce',
  'Logistics & Transport', 'Finance & Insurance', 'Tourism & Hospitality',
];

/** A tiny but genuinely valid single-page PDF, for document upload. */
function dummyPdf() {
  const pdf =
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n';
  return Buffer.from(pdf, 'latin1');
}

/** A 1x1 PNG, for media upload. */
function dummyPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

/* -------------------------------------------------------------------------- */
/* One virtual user                                                            */
/* -------------------------------------------------------------------------- */

async function runVirtualUser(base, index, stats, opts) {
  const unique = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const email = `${TAG}+${index}-${unique}@example.invalid`;
  const password = `QaStress!${crypto.randomBytes(6).toString('hex')}A1`;
  const companyName = `QA Stress Co ${index}-${unique.slice(-4)}`;
  const record = { index, email, companyName, ok: false };

  // 1. Sign up
  const signup = await timed(stats, '1-signup', async () =>
    expectOk(
      await fetch(new URL('/api/auth/signup', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: `QA Stress ${index}`,
          role: 'business',
          companyName,
          regNumber: `QA/${index}/${unique.slice(0, 6)}`,
          industry: INDUSTRIES[index % INDUSTRIES.length],
          website: '',
          socialLinks: {},
        }),
      }),
      'signup',
    ),
  );

  let cookie = sessionCookieFrom(signup);

  // 2. Log in if signup didn't return a session (it may require verification)
  if (!cookie) {
    const login = await timed(stats, '2-login', async () =>
      expectOk(
        await fetch(new URL('/api/auth/login', base), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
        'login',
      ),
    );
    cookie = sessionCookieFrom(login);
  }

  if (!cookie) throw new Error('no session cookie after signup/login');
  const authed = { Cookie: cookie };

  // 3. Flesh out the business profile
  await timed(stats, '3-profile', async () =>
    expectOk(
      await fetch(new URL('/api/business/profile', base), {
        method: 'PUT',
        headers: { ...authed, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Load-test profile for ${companyName}.`,
          phone: '0110000000',
          address: '1 Test Street, Cape Town',
          tagline: 'Generated by the QA mass-load script',
        }),
      }),
      'profile',
    ),
  );

  if (!opts.skipUploads) {
    // 4. Upload a vetting document (multipart, stored in Postgres)
    await timed(stats, '4-document', async () => {
      const form = new FormData();
      form.append('file', new Blob([dummyPdf()], { type: 'application/pdf' }), `qa-${index}.pdf`);
      form.append('documentType', 'cipc_registration');
      return expectOk(
        await fetch(new URL('/api/businesses/documents', base), {
          method: 'POST',
          headers: authed,
          body: form,
        }),
        'document',
      );
    });

    // 5. Upload a media file (goes to Supabase storage)
    await timed(stats, '5-media', async () => {
      const form = new FormData();
      form.append('file', new Blob([dummyPng()], { type: 'image/png' }), `qa-${index}.png`);
      return expectOk(
        await fetch(new URL('/api/media/upload', base), {
          method: 'POST',
          headers: authed,
          body: form,
        }),
        'media',
      );
    });
  }

  record.ok = true;
  return record;
}

/* -------------------------------------------------------------------------- */
/* Worker pool                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fixed-size pool. Deliberately not Promise.all over all N — firing 200
 * simultaneous signups measures how fast the client can melt, not how the
 * server behaves under a realistic sustained arrival rate.
 */
async function pool(count, concurrency, worker) {
  const results = new Array(count);
  let next = 0;
  let done = 0;

  const runners = Array.from({ length: Math.min(concurrency, count) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= count) return;
      try {
        results[i] = await worker(i);
      } catch (error) {
        results[i] = { index: i, ok: false, error: String(error.message || error) };
      }
      done += 1;
      if (done % 10 === 0 || done === count) {
        process.stdout.write(`\r  progress: ${done}/${count}`);
      }
    }
  });

  await Promise.all(runners);
  process.stdout.write('\n');
  return results;
}

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                     */
/* -------------------------------------------------------------------------- */

async function cleanup(runFile) {
  const adminCookie = process.env.ADMIN_COOKIE;
  if (!adminCookie) {
    console.error(
      'Cleanup needs a staff session. Set ADMIN_COOKIE to the value of an\n' +
        'admin account\'s vbl_session cookie, e.g.\n' +
        '  ADMIN_COOKIE=vbl_session=eyJ... node scripts/stress-test.mjs --cleanup <file>',
    );
    process.exit(2);
  }

  const run = JSON.parse(await fs.readFile(runFile, 'utf8'));
  const base = run.target;
  const created = run.accounts.filter((a) => a.ok && a.userId);

  if (created.length === 0) {
    console.log('Nothing to clean up — the run file recorded no user ids.');
    console.log('Delete the accounts from Admin > Users by searching for "' + TAG + '".');
    return;
  }

  console.log(`Deleting ${created.length} accounts from ${base}…`);
  let removed = 0;
  for (const account of created) {
    const res = await fetch(new URL(`/api/admin/users/${account.userId}`, base), {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    if (res.ok) removed += 1;
    else console.warn(`  failed to delete ${account.email}: ${res.status}`);
  }
  console.log(`Removed ${removed}/${created.length}.`);
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(await fs.readFile(new URL(import.meta.url), 'utf8').then((s) => s.split('*/')[0]));
    return;
  }

  if (args.cleanup) {
    await cleanup(args.cleanup);
    return;
  }

  if (!args.target) {
    console.error('--target is required, e.g. --target http://localhost:9002');
    process.exit(2);
  }
  if (!Number.isFinite(args.count) || args.count < 1) {
    console.error('--count must be a positive number');
    process.exit(2);
  }

  const base = assertSafeTarget(args.target);

  console.log(`\nMass-load QA run`);
  console.log(`  target      ${base.origin}`);
  console.log(`  accounts    ${args.count}`);
  console.log(`  concurrency ${args.concurrency}`);
  console.log(`  uploads     ${args.skipUploads ? 'skipped' : 'document + media'}\n`);

  const stats = new Stats();
  const startedAt = Date.now();

  const accounts = await pool(args.count, args.concurrency, (i) =>
    runVirtualUser(base, i, stats, { skipUploads: args.skipUploads }),
  );

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const succeeded = accounts.filter((a) => a?.ok).length;

  console.log(`\nCompleted in ${elapsedSec.toFixed(1)}s`);
  console.log(`  ${succeeded}/${args.count} full journeys succeeded`);
  console.log(`  ${(args.count / elapsedSec).toFixed(1)} accounts/sec sustained\n`);

  console.table(stats.report());

  const errors = stats.errorSummary();
  if (errors.length) {
    console.log('\nMost common failures:');
    console.table(errors);
  }

  // Persist the run so the accounts can be found and removed afterwards.
  const runsDir = path.join(process.cwd(), 'runs');
  await fs.mkdir(runsDir, { recursive: true });
  const runFile = path.join(runsDir, `stress-${startedAt}.json`);
  await fs.writeFile(
    runFile,
    JSON.stringify(
      { target: base.origin, startedAt, elapsedSec, count: args.count, tag: TAG, accounts },
      null,
      2,
    ),
  );

  console.log(`\nRun written to ${path.relative(process.cwd(), runFile)}`);
  console.log(
    `These are REAL accounts. Remove them with:\n` +
      `  ADMIN_COOKIE=vbl_session=... node scripts/stress-test.mjs --cleanup ${path.relative(process.cwd(), runFile)}\n` +
      `or from Admin > Users by searching "${TAG}".\n`,
  );
}

main().catch((error) => {
  console.error('\nStress run aborted:', error);
  process.exit(1);
});
