/**
 * Asks PayFast what it actually thinks about a subscription.
 *
 * When a renewal does not arrive there are only three possibilities: the
 * subscription does not exist at PayFast, it exists but is paused/cancelled,
 * or it ran and the ITN never reached us. Our own database cannot tell those
 * apart — it only knows what it was told — so this asks PayFast directly.
 *
 * Credentials are not in .env.local (they live in Amplify), so pass them in:
 *
 *   PAYFAST_MERCHANT_ID=... PAYFAST_MERCHANT_KEY=... PAYFAST_PASSPHRASE=... \
 *     node scripts/payfast-subscription.mjs
 *
 * With no argument it looks up every subscription token in the database.
 * Pass a token to check just one.
 *
 * Read-only: it fetches, it never cancels, pauses or charges anything.
 */
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import fs from 'node:fs';

const MERCHANT_ID = (process.env.PAYFAST_MERCHANT_ID || '').trim();
const PASSPHRASE = (process.env.PAYFAST_PASSPHRASE || '').trim();
const API = 'https://api.payfast.co.za';

if (!MERCHANT_ID || !PASSPHRASE) {
  console.error('Set PAYFAST_MERCHANT_ID and PAYFAST_PASSPHRASE (they are in Amplify, not .env.local).');
  process.exit(1);
}

/**
 * PayFast's API signature is not the same as the checkout signature: the
 * parameters are sorted alphabetically here, the passphrase is one of the
 * sorted parameters rather than an appendix, and spaces encode as +.
 */
function sign(params) {
  const body = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(params[k]).trim()).replace(/%20/g, '+')}`)
    .join('&');
  return crypto.createHash('md5').update(body).digest('hex');
}

async function fetchSubscription(token) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+02:00');
  const headerParams = {
    'merchant-id': MERCHANT_ID,
    passphrase: PASSPHRASE,
    timestamp,
    version: 'v1',
  };

  const res = await fetch(`${API}/subscriptions/${token}/fetch`, {
    headers: {
      'merchant-id': MERCHANT_ID,
      version: 'v1',
      timestamp,
      signature: sign(headerParams),
    },
  });

  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* PayFast returned non-JSON */ }
  return { status: res.status, body: parsed, raw: text.slice(0, 400) };
}

const arg = process.argv[2];
let targets = [];

if (arg) {
  targets = [{ token: arg, company_name: '(given on the command line)' }];
} else {
  const env = fs.readFileSync('.env.local', 'utf8');
  const db = neon(env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, ''));
  targets = await db`
    SELECT b.payfast_token AS token, b.company_name, b.package_type,
           b.next_billing_at, b.last_billed_at, u.email
    FROM businesses b JOIN users u ON u.id = b.user_id
    WHERE b.payfast_token IS NOT NULL
    ORDER BY b.next_billing_at`;
}

if (targets.length === 0) {
  console.log('No subscription tokens found.');
  process.exit(0);
}

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

for (const t of targets) {
  console.log(`\n=== ${t.company_name}${t.email ? ` <${t.email}>` : ''} ===`);
  if (t.next_billing_at !== undefined) {
    console.log(`  our record: ${t.package_type}, last billed ${fmt(t.last_billed_at)}, next due ${fmt(t.next_billing_at)}`);
  }
  console.log(`  token: ${t.token}`);

  const r = await fetchSubscription(t.token);
  if (r.status !== 200 || !r.body) {
    console.log(`  PayFast says: HTTP ${r.status} — ${r.raw}`);
    console.log('  If this is 404, the subscription does not exist at PayFast and will never charge.');
    continue;
  }

  const d = r.body.data?.response ?? r.body.data ?? r.body;
  console.log(`  PayFast status : ${d.status_text ?? d.status ?? 'unknown'}`);
  console.log(`  next run date  : ${d.run_date ?? '—'}`);
  console.log(`  amount (cents) : ${d.amount ?? '—'}`);
  console.log(`  cycles done    : ${d.cycles_complete ?? '—'}`);
  if (d.status_text && String(d.status_text).toLowerCase() !== 'active') {
    console.log('  ^ NOT ACTIVE — this is why no money is coming off.');
  }
}

console.log('\nStatus codes: 1 = active, 2 = cancelled, 3 = paused//complete (see PayFast docs).');
