import crypto from 'crypto';
import db from '@/lib/db';
import { commissionCents } from '@/lib/commission';

/**
 * Sales agent programme: referral codes, invite tokens, and the commission
 * figures Finance pays out on.
 *
 * Commission is always DERIVED from the payments table rather than stored.
 * A stored balance drifts the moment a payment is refunded or a row is
 * corrected; a derived one cannot disagree with the money that actually
 * moved. Only what has genuinely been PAID is recorded, in commission_payouts.
 */

/** No O/0 or I/1 — these codes get read aloud and written on paper. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateReferralCode(): string {
  let out = '';
  while (out.length < CODE_LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    // Reject the tail of the byte range so every character stays equally likely.
    if (byte < 256 - (256 % CODE_ALPHABET.length)) {
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return out;
}

/** Allocates a code that is not already taken. */
export async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode();
    const clash = (await db`
      SELECT 1 FROM users WHERE referral_code = ${code} LIMIT 1
    `) as unknown as unknown[];
    if (clash.length === 0) return code;
  }
  throw new Error('Could not allocate a unique referral code');
}

export function referralLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, '')}/signup?ref=${encodeURIComponent(code)}`;
}

/**
 * QR image for a referral link, via a public generator so no extra dependency
 * or build step is needed. The URL is the only thing encoded — nothing
 * sensitive leaves the app.
 */
export function referralQrUrl(link: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
}

/** Invite tokens are stored hashed, exactly like password-reset tokens. */
export function hashInviteToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const INVITE_TTL_DAYS = 14;

export interface AgentSummary {
  id: string;
  fullName: string;
  email: string;
  referralCode: string | null;
  isSuspended: boolean;
  joinedAt: string | null;
  signups: number;
  sales: number;
  linkSignups: number;
  revenueCents: number;
  commissionEarnedCents: number;
  commissionPaidCents: number;
  commissionOwedCents: number;
}

type Row = Record<string, unknown>;

/**
 * Every agent with their production figures.
 *
 * `sales` counts only businesses whose owner has actually paid — commission
 * is 50% of that first payment, so an unpaid signup earns nothing yet and is
 * reported separately rather than being quietly counted.
 */
export async function getAgentSummaries(): Promise<AgentSummary[]> {
  const rows = (await db`
    WITH first_payment AS (
      SELECT DISTINCT ON (p.user_id)
        p.user_id, p.amount
      FROM payments p
      WHERE p.status = 'completed'
      ORDER BY p.user_id, COALESCE(p.completed_at, p.created_at) ASC
    ),
    attributed AS (
      SELECT
        b.assisted_by_user_id AS agent_id,
        b.referral_code,
        COALESCE(fp.amount, 0) AS first_payment_cents
      FROM businesses b
      LEFT JOIN first_payment fp ON fp.user_id = b.user_id
      WHERE b.assisted_by_user_id IS NOT NULL
    ),
    paid AS (
      SELECT agent_id, COALESCE(SUM(amount_cents), 0)::int AS paid_cents
      FROM commission_payouts GROUP BY agent_id
    )
    SELECT
      u.id, u.full_name, u.email, u.referral_code, u.is_suspended, u.created_at,
      COUNT(a.agent_id)::int                                              AS signups,
      COUNT(*) FILTER (WHERE a.first_payment_cents > 0)::int              AS sales,
      COUNT(*) FILTER (WHERE a.referral_code IS NOT NULL)::int            AS link_signups,
      COALESCE(SUM(a.first_payment_cents), 0)::int                        AS revenue_cents,
      COALESCE(p.paid_cents, 0)                                           AS paid_cents
    FROM users u
    LEFT JOIN attributed a ON a.agent_id = u.id
    LEFT JOIN paid p ON p.agent_id = u.id
    WHERE u.role = 'sales_agent'
    GROUP BY u.id, u.full_name, u.email, u.referral_code, u.is_suspended, u.created_at, p.paid_cents
    ORDER BY u.full_name ASC
  `) as unknown as Row[];

  // Commission is computed per payment, not on the summed revenue, so the
  // per-payment rounding matches what each individual invoice would show.
  const perAgentEarned = (await db`
    WITH first_payment AS (
      SELECT DISTINCT ON (p.user_id) p.user_id, p.amount
      FROM payments p WHERE p.status = 'completed'
      ORDER BY p.user_id, COALESCE(p.completed_at, p.created_at) ASC
    )
    SELECT b.assisted_by_user_id AS agent_id, fp.amount AS cents
    FROM businesses b
    JOIN first_payment fp ON fp.user_id = b.user_id
    WHERE b.assisted_by_user_id IS NOT NULL
  `) as unknown as Row[];

  const earned = new Map<string, number>();
  for (const r of perAgentEarned) {
    const id = String(r.agent_id);
    earned.set(id, (earned.get(id) || 0) + commissionCents(Number(r.cents) || 0));
  }

  return rows.map((r) => {
    const id = String(r.id);
    const earnedCents = earned.get(id) || 0;
    const paidCents = Number(r.paid_cents) || 0;
    return {
      id,
      fullName: String(r.full_name || ''),
      email: String(r.email || ''),
      referralCode: (r.referral_code as string) ?? null,
      isSuspended: r.is_suspended === true,
      joinedAt: (r.created_at as string) ?? null,
      signups: Number(r.signups) || 0,
      sales: Number(r.sales) || 0,
      linkSignups: Number(r.link_signups) || 0,
      revenueCents: Number(r.revenue_cents) || 0,
      commissionEarnedCents: earnedCents,
      commissionPaidCents: paidCents,
      commissionOwedCents: Math.max(0, earnedCents - paidCents),
    };
  });
}
