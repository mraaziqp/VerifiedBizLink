import db from '@/lib/db';

/**
 * Ad credits: one balance, one ledger, one way to change them.
 *
 * businesses.ad_credits is the balance. Every change to it goes through
 * changeCredits(), which updates the balance and writes a row to
 * ad_credit_transactions in the SAME statement, so the history always adds up
 * to the balance and a crash can never leave one without the other.
 *
 * Changes that come from outside (a PayFast notification, the monthly plan
 * allowance) carry a reference that is unique in the ledger. PayFast re-sends
 * a notification whenever it does not get a quick 200, and each re-send used
 * to add the credits again; now the second attempt finds the reference
 * already recorded and changes nothing.
 */

/**
 * The credit packs a business can buy. Defined here, on the server, because
 * the price PayFast charges and the credits granted must come from the same
 * table. The pack list used to live only in the browser, while the webhook
 * granted floor(rand / 10): a customer paying R129 for "150 credits" received
 * 12.
 */
export const AD_CREDIT_PACKS = [
  { id: 'starter', credits: 50, price: 49, label: 'Starter Pack' },
  { id: 'popular', credits: 150, price: 129, label: 'Most Popular (Save 15%)' },
  { id: 'value', credits: 400, price: 299, label: 'Best Value (Save 25%)' },
] as const;

export type AdCreditPack = (typeof AD_CREDIT_PACKS)[number];

export function findCreditPack(id: unknown): AdCreditPack | null {
  return AD_CREDIT_PACKS.find((p) => p.id === id) ?? null;
}

/** For notifications from before packs had ids: match what was paid to a pack price. */
export function packForAmount(rand: number): AdCreditPack | null {
  return AD_CREDIT_PACKS.find((p) => Math.abs(p.price - rand) < 0.01) ?? null;
}

export type CreditKind =
  | 'purchase'
  | 'monthly_allowance'
  | 'admin_adjustment'
  | 'ad_spend'
  | 'refund';

let ready: Promise<void> | null = null;

export function ensureCreditLedger(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS ad_credit_transactions (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          delta         INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          kind          TEXT NOT NULL,
          note          TEXT,
          reference     TEXT,
          actor_id      UUID,
          -- seq orders rows that land in the same instant (concurrent spends
          -- share a timestamp), so "latest" is never ambiguous.
          seq           BIGSERIAL,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
      `;
      await db`CREATE UNIQUE INDEX IF NOT EXISTS ad_credit_tx_reference_idx ON ad_credit_transactions (reference) WHERE reference IS NOT NULL`;
      await db`CREATE INDEX IF NOT EXISTS ad_credit_tx_business_idx ON ad_credit_transactions (business_id, seq DESC)`;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export interface CreditChange {
  businessId: string;
  /** Positive to add, negative to take. Must be a non-zero integer. */
  delta: number;
  kind: CreditKind;
  note?: string | null;
  /** Makes the change happen at most once. Use for anything that can be retried. */
  reference?: string | null;
  actorId?: string | null;
}

export type CreditResult =
  | { applied: true; balance: number }
  | { applied: false; reason: 'duplicate' | 'insufficient' | 'not_found'; balance: number | null };

/**
 * Applies one change atomically. A negative change never takes the balance
 * below zero: it is refused instead ('insufficient').
 */
export async function changeCredits(change: CreditChange): Promise<CreditResult> {
  const delta = Math.trunc(change.delta);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Credit change must be a non-zero integer');
  await ensureCreditLedger();

  const reference = change.reference ?? null;
  const note = change.note ? String(change.note).slice(0, 300) : null;

  // One statement: the balance update and the ledger insert commit together
  // or not at all. A concurrent duplicate with the same reference fails the
  // unique index and rolls the whole statement back.
  const rows = await db`
    WITH upd AS (
      UPDATE businesses
      SET ad_credits = COALESCE(ad_credits, 0) + ${delta}, updated_at = NOW()
      WHERE id = ${change.businessId}
        AND COALESCE(ad_credits, 0) + ${delta} >= 0
        AND (${reference}::text IS NULL OR NOT EXISTS (
          SELECT 1 FROM ad_credit_transactions WHERE reference = ${reference}
        ))
      RETURNING ad_credits
    ),
    ins AS (
      INSERT INTO ad_credit_transactions (business_id, delta, balance_after, kind, note, reference, actor_id)
      SELECT ${change.businessId}, ${delta}, upd.ad_credits, ${change.kind}, ${note}, ${reference}, ${change.actorId ?? null}
      FROM upd
      RETURNING balance_after
    )
    SELECT balance_after FROM ins
  `;
  if (rows.length > 0) return { applied: true, balance: Number(rows[0].balance_after) };

  // Work out why nothing happened, for a useful message.
  const [biz] = await db`SELECT COALESCE(ad_credits, 0) AS ad_credits FROM businesses WHERE id = ${change.businessId}`;
  if (!biz) return { applied: false, reason: 'not_found', balance: null };
  const balance = Number(biz.ad_credits);
  if (reference) {
    const [dup] = await db`SELECT 1 FROM ad_credit_transactions WHERE reference = ${reference} LIMIT 1`;
    if (dup) return { applied: false, reason: 'duplicate', balance };
  }
  return { applied: false, reason: 'insufficient', balance };
}

/**
 * Adds the plan's monthly allowance once per calendar month.
 *
 * Idempotent twice over: the credits_last_topped_up_at month guard (which
 * existing businesses already rely on) and a per-month ledger reference.
 * Admin grants no longer touch credits_last_topped_up_at — they used to, and
 * a bonus granted on the 1st silently cancelled that month's allowance.
 */
export async function ensureMonthlyAdCredits(businessId: string): Promise<void> {
  await ensureCreditLedger();
  const month = new Date().toISOString().slice(0, 7);
  await db`
    WITH amt AS (
      SELECT COALESCE((
        SELECT monthly_ad_credits FROM tiers
        WHERE key = CASE
          WHEN b.trial_package IS NOT NULL AND b.trial_ends_at IS NOT NULL AND b.trial_ends_at > NOW()
          THEN b.trial_package ELSE b.package_type END
      ), 0)::int AS n
      FROM businesses b
      WHERE b.id = ${businessId}
        AND (b.credits_last_topped_up_at IS NULL
             OR date_trunc('month', b.credits_last_topped_up_at) < date_trunc('month', NOW()))
    ),
    upd AS (
      UPDATE businesses
      SET ad_credits = COALESCE(ad_credits, 0) + (SELECT n FROM amt),
          credits_last_topped_up_at = NOW()
      WHERE id = ${businessId} AND EXISTS (SELECT 1 FROM amt)
      RETURNING ad_credits
    )
    INSERT INTO ad_credit_transactions (business_id, delta, balance_after, kind, note, reference)
    SELECT ${businessId}, (SELECT n FROM amt), upd.ad_credits, 'monthly_allowance',
           'Monthly plan allowance', ${`monthly:${businessId}:${month}`}
    FROM upd
    WHERE (SELECT n FROM amt) > 0
    ON CONFLICT DO NOTHING
  `;
}

export interface CreditTransaction {
  id: string;
  delta: number;
  balanceAfter: number;
  kind: CreditKind;
  note: string | null;
  createdAt: string;
}

export async function creditHistory(businessId: string, limit = 25): Promise<CreditTransaction[]> {
  await ensureCreditLedger();
  const rows = await db`
    SELECT id, delta, balance_after, kind, note, created_at
    FROM ad_credit_transactions
    WHERE business_id = ${businessId}
    ORDER BY seq DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    delta: Number(r.delta),
    balanceAfter: Number(r.balance_after),
    kind: r.kind as CreditKind,
    note: (r.note as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}
