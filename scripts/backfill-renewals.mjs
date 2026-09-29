/**
 * Rebuilds subscription charges the ledger lost, and reports every
 * subscription's renewal history.
 *
 * Until the webhook fix, a renewal ITN settled onto the checkout row of the
 * subscription it belonged to instead of getting a row of its own, so every
 * month after the first was missing from Transaction History, the admin
 * payment log and advisor retention commission. PayFast's own notifications
 * are still in payfast_itn_log, so the missing charges can be rebuilt from
 * them exactly: one row per accepted COMPLETE pf_payment_id.
 *
 *   node scripts/backfill-renewals.mjs            # report + dry run (default)
 *   node scripts/backfill-renewals.mjs --apply    # write the missing rows
 *
 * Only ever inserts payments rows (keyed on pf_payment_id, so re-running is
 * harmless) and corrects the checkout row's payfast_reference back to its own
 * first charge. It never changes a business's plan or billing dates — the
 * report says where those look wrong, and a person decides.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const db = neon(env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, ''));
const apply = process.argv.includes('--apply');

const logCols = (await db`
  SELECT column_name FROM information_schema.columns WHERE table_name = 'payfast_itn_log'`)
  .map((r) => r.column_name);
const tsCol = ['created_at', 'received_at', 'logged_at'].find((c) => logCols.includes(c));
if (!tsCol) {
  console.error(`payfast_itn_log has no timestamp column I recognise (columns: ${logCols.join(', ')})`);
  process.exit(1);
}

// The timestamp column cannot be a query parameter, so it is picked here.
const itns = (await db`SELECT * FROM payfast_itn_log`)
  .map((r) => ({ ...r, at: r[tsCol] }))
  .sort((x, y) => new Date(x.at) - new Date(y.at));

const fmt = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—');

// Group every notification by the checkout it belongs to.
const byCheckout = new Map();
for (const i of itns) {
  const body = Object.fromEntries(new URLSearchParams(i.raw_body || ''));
  const ref = i.payment_reference || body.m_payment_id || '(none)';
  if (!byCheckout.has(ref)) byCheckout.set(ref, []);
  byCheckout.get(ref).push({ ...i, body });
}

let missing = 0;
let written = 0;

console.log(`${itns.length} ITN(s) logged across ${byCheckout.size} checkout(s)\n`);

for (const [ref, list] of byCheckout) {
  let [checkout] = await db`
    SELECT p.id, p.user_id, p.amount, p.status, p.payfast_reference, p.purchase_type, p.created_at,
           u.email, b.company_name, b.package_type, b.payfast_token, b.subscription_status,
           b.auto_renew, b.last_billed_at, b.next_billing_at, b.payment_failed_at
    FROM payments p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN businesses b ON b.user_id = p.user_id
    WHERE p.reference = ${ref} LIMIT 1`;

  const first = list[0].body;
  const isSub = (checkout?.purchase_type || first.custom_str3 || '').startsWith('subscription_') || Boolean(first.token);
  if (!isSub) continue;

  // The checkout row itself can be gone (test data cleared). The charges are
  // still real, so the owner is found through the subscription token or the
  // user id PayFast echoed back, and every charge is treated as unrecorded.
  let checkoutMissing = false;
  if (!checkout) {
    checkoutMissing = true;
    const userId = first.custom_str2 || null;
    [checkout] = await db`
      SELECT NULL::text AS id, u.id AS user_id, NULL::int AS amount, NULL::text AS status,
             NULL::text AS payfast_reference, ${first.custom_str3 || null}::text AS purchase_type,
             u.email, b.company_name, b.package_type, b.payfast_token, b.subscription_status,
             b.auto_renew, b.last_billed_at, b.next_billing_at, b.payment_failed_at
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.id::text = ${userId} OR b.payfast_token = ${first.token || null}
      LIMIT 1`;
  }

  console.log(`=== ${checkout?.company_name ?? '(no business)'} <${checkout?.email ?? first.email_address ?? '?'}> — ${ref}`);
  if (checkout) {
    console.log(`  plan ${checkout.package_type}, status ${checkout.subscription_status}, auto_renew ${checkout.auto_renew}`);
    console.log(`  token ${checkout.payfast_token ?? 'NONE — no PayFast subscription recorded'}`);
    console.log(`  last billed ${fmt(checkout.last_billed_at)}, next due ${fmt(checkout.next_billing_at)}` +
      (checkout.payment_failed_at ? `, grace window open since ${fmt(checkout.payment_failed_at)}` : ''));
  } else {
    console.log('  no checkout row, and no user or business matches this subscription');
  }
  if (checkoutMissing && checkout) console.log('  (checkout row is missing from payments — every charge below is unrecorded)');

  console.log('  notifications from PayFast:');
  for (const i of list) {
    console.log(`    ${fmt(i.at)}  ${String(i.payment_status).padEnd(9)} pf=${i.payfast_reference ?? '—'}  R${i.body.amount_gross ?? '?'}  ${i.outcome}`);
  }

  // One charge per distinct pf_payment_id that PayFast reported COMPLETE and
  // this app accepted. The earliest is the checkout's own first charge.
  const accepted = list.filter(
    (i) => String(i.payment_status).toUpperCase() === 'COMPLETE' && String(i.outcome).startsWith('accepted') && i.payfast_reference,
  );
  const charges = [];
  for (const i of accepted) {
    if (!charges.some((c) => c.payfast_reference === i.payfast_reference)) charges.push(i);
  }
  const rejected = list.filter((i) => String(i.outcome).startsWith('rejected'));
  if (rejected.length) {
    console.log(`  ! ${rejected.length} notification(s) were REJECTED — money may have moved without being recorded`);
  }
  console.log(`  ${charges.length} distinct completed charge(s)`);

  if (charges.length === 0) { console.log(''); continue; }
  if (!checkout) {
    // The account is gone entirely, but the money still moved. payments
    // requires an owner, so these go to the billing log instead, which is
    // shown in Admin → Payment Gateway.
    console.log(`  ! account deleted — charges will be recorded in the billing log. PayFast subscription ${first.token || '?'} may still be active: cancel it in the PayFast dashboard.`);
    checkout = { id: null, user_id: null, purchase_type: first.custom_str3 || null, payfast_reference: null };
  }

  const [firstCharge, ...laterCharges] = charges;
  const renewals = checkoutMissing ? charges : laterCharges;

  if (!checkoutMissing && checkout.payfast_reference !== firstCharge.payfast_reference) {
    console.log(`  checkout row points at pf=${checkout.payfast_reference}; its own first charge is pf=${firstCharge.payfast_reference}`);
    if (apply) {
      await db`UPDATE payments SET payfast_reference = ${firstCharge.payfast_reference} WHERE id = ${checkout.id}`;
    }
  }

  for (const r of renewals) {
    if (!checkout.user_id) {
      const [logged] = await db`
        SELECT id FROM billing_events WHERE reference = ${r.payfast_reference} LIMIT 1`.catch(() => []);
      if (logged) continue;
      missing += 1;
      const cents = Math.round(parseFloat(r.body.amount_gross || '0') * 100);
      console.log(`  + unlogged charge ${fmt(r.at)} pf=${r.payfast_reference} R${(cents / 100).toFixed(2)} (to billing log)`);
      if (apply) {
        const ins = await db`
          INSERT INTO billing_events (event, severity, amount_cents, reference, detail, created_at)
          VALUES ('charge_succeeded', 'warning', ${cents}, ${r.payfast_reference},
                  ${`PayFast charged R${(cents / 100).toFixed(2)} (${r.body.item_name || 'subscription'}) to ${r.body.email_address || 'unknown payer'} on subscription ${r.body.token || '?'}, but that account no longer exists, so it is not in the payments table. Recorded from the ITN log by scripts/backfill-renewals.mjs. Cancel the subscription at PayFast if it is still active.`},
                  ${new Date(r.at).toISOString()})
          RETURNING id`;
        written += ins.length;
      }
      continue;
    }
    const [exists] = await db`
      SELECT id FROM payments
      WHERE reference = ${r.payfast_reference}
         OR (payfast_reference = ${r.payfast_reference} AND id::text IS DISTINCT FROM ${checkout.id})
      LIMIT 1`;
    if (exists) continue;
    missing += 1;
    const cents = Math.round(parseFloat(r.body.amount_gross || '0') * 100);
    const label = checkoutMissing && r === firstCharge ? 'first charge' : 'renewal';
    console.log(`  + missing ${label} ${fmt(r.at)} pf=${r.payfast_reference} R${(cents / 100).toFixed(2)}`);
    if (apply) {
      const ins = await db`
        INSERT INTO payments (user_id, amount, status, reference, payfast_reference, description, purchase_type, created_at, completed_at)
        VALUES (${checkout.user_id}, ${cents}, 'completed', ${r.payfast_reference}, ${r.payfast_reference},
                ${checkoutMissing && r === firstCharge ? (r.body.item_name || 'Subscription') : `${r.body.item_name || 'Subscription'} — renewal`}, ${checkout.purchase_type || r.body.custom_str3 || null},
                ${new Date(r.at).toISOString()}, ${new Date(r.at).toISOString()})
        ON CONFLICT (reference) DO NOTHING
        RETURNING id`;
      written += ins.length;
    }
  }

  const lastCharge = charges[charges.length - 1];
  if (checkout.last_billed_at && new Date(lastCharge.at) > new Date(checkout.last_billed_at).getTime() + 3600_000) {
    console.log(`  ! PayFast charged on ${fmt(lastCharge.at)} but the business was last billed ${fmt(checkout.last_billed_at)} — the renewal was not applied to the plan`);
  }
  if (checkout.next_billing_at && new Date(checkout.next_billing_at) < new Date() && checkout.auto_renew) {
    console.log(`  ! renewal was due ${fmt(checkout.next_billing_at)} and no charge has landed since — check this subscription in the PayFast dashboard`);
  }
  console.log('');
}

console.log(`missing charge rows: ${missing}`);
console.log(apply ? `written: ${written}` : 'dry run — nothing written. Re-run with --apply to write them.');
