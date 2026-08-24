/**
 * payfast_itn_log — every notification PayFast sends, accepted or not.
 *
 * Without it a rejected ITN leaves no trace: the only symptom is a payment
 * stuck on 'pending', which looks identical to PayFast never having called.
 *
 * payments.purchase_type — what the payment was FOR.
 *
 * The grant logic reads this from the ITN's custom_str3. It was never stored,
 * so a payment that failed to process could not be replayed afterwards: the
 * money was taken and nothing recorded what it was meant to buy.
 *
 * Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

await db`
  CREATE TABLE IF NOT EXISTS payfast_itn_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference TEXT,
    payfast_reference TEXT,
    payment_status    TEXT,
    outcome           TEXT NOT NULL,
    detail            TEXT,
    raw_body          TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log('payfast_itn_log ready');

await db`CREATE INDEX IF NOT EXISTS payfast_itn_log_ref_idx ON payfast_itn_log (payment_reference)`;
await db`CREATE INDEX IF NOT EXISTS payfast_itn_log_created_idx ON payfast_itn_log (created_at DESC)`;
console.log('indexes ready');

await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_type TEXT`;
console.log('payments.purchase_type ready');

// Backfill what can be inferred from the descriptions already stored, so the
// payments taken before this column existed can still be replayed.
const filled = await db`
  UPDATE payments SET purchase_type =
    CASE
      WHEN description ILIKE '%ad-day credit%' OR description ILIKE '%ad credit%' THEN 'ad_credits_topup'
      WHEN description ILIKE '%verification%' OR description ILIKE '%one-time%'   THEN 'verification_fee'
      WHEN description ILIKE '%boost%'                                            THEN 'ad_boost'
      ELSE NULL
    END
  WHERE purchase_type IS NULL
    AND (description ILIKE '%credit%' OR description ILIKE '%verification%'
         OR description ILIKE '%one-time%' OR description ILIKE '%boost%')
  RETURNING reference, purchase_type
`;
for (const r of filled) console.log(`  inferred ${r.reference} -> ${r.purchase_type}`);
console.log(`backfilled ${filled.length} payment(s) from their description`);
console.log('\nSubscription payments are deliberately not inferred — the tier key');
console.log('cannot be recovered from free text, and guessing it would grant the');
console.log('wrong plan. Those are listed for a person by scripts/reconcile-payment.mjs.');
