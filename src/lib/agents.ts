import crypto from 'crypto';
import db from '@/lib/db';
import { commissionCents } from '@/lib/commission';
import { getCommissionSettings } from '@/lib/settings';

/**
 * Sales agent programme: referral codes, invite tokens, and the commission
 * figures Finance pays out on.
 *
 * Commission is always DERIVED from the payments table rather than stored.
 * A stored balance drifts the moment a payment is refunded or a row is
 * corrected; a derived one cannot disagree with the money that actually
 * moved. Only what has genuinely been PAID is recorded, in commission_payouts.
 */

/**
 * Generates a referral code from the agent's full name.
 *
 * The code is the agent's name with spaces, special chars stripped, and
 * lowercased. e.g. "Mohammed Parker" -> "mohammedparker"
 */
export function generateNameBasedCode(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30) || 'agent';
}

/** No O/0 or I/1 — these codes get read aloud and written on paper. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Legacy random code generator — kept for backward compatibility. */
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

/**
 * Allocates a name-based referral code that is not already taken.
 * Falls back to adding numeric suffixes for collisions.
 */
export async function allocateReferralCode(fullName?: string): Promise<string> {
  if (fullName) {
    const base = generateNameBasedCode(fullName);
    if (base.length >= 3) {
      // Try the name as-is first
      const clash0 = (await db`
        SELECT 1 FROM users WHERE LOWER(referral_code) = ${base} LIMIT 1
      `) as unknown as unknown[];
      if (clash0.length === 0) return base;

      // Try with numeric suffixes
      for (let i = 2; i <= 20; i++) {
        const candidate = `${base}${i}`;
        const clash = (await db`
          SELECT 1 FROM users WHERE LOWER(referral_code) = ${candidate} LIMIT 1
        `) as unknown as unknown[];
        if (clash.length === 0) return candidate;
      }
    }
  }

  // Fallback to random code if name-based fails
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

/**
 * Logs an activity event for a sales agent.
 * Non-blocking — failures are logged but never throw.
 */
export async function logAgentActivity(
  agentId: string,
  eventType: string,
  description: string,
  businessId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db`
      INSERT INTO agent_activity_log (agent_id, event_type, business_id, description, metadata)
      VALUES (${agentId}, ${eventType}, ${businessId || null}, ${description}, ${JSON.stringify(metadata || {})}::jsonb)
    `;
  } catch (err) {
    console.error('Agent activity log write failed:', err);
  }
}

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
  /** The rate actually applied to this agent, 0–1. */
  effectiveRate: number;
  /** Non-null when this agent has a negotiated rate of their own. */
  rateOverride: number | null;
  notes: string;
}

type Row = Record<string, unknown>;

/**
 * Every agent with their production figures.
 *
 * `sales` counts only businesses whose owner has actually paid — commission
 * is earned on that first payment, so an unpaid signup earns nothing yet and
 * is reported separately rather than being quietly counted.
 *
 * The rate comes from platform settings, with a per-agent override taking
 * precedence, so a negotiated rate is honoured everywhere at once.
 */
export async function getAgentSummaries(): Promise<AgentSummary[]> {
  // The platform rate, and any per-agent rate negotiated on top of it.
  const settings = await getCommissionSettings();

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
      u.commission_rate_override, u.agent_notes,
      COUNT(a.agent_id)::int                                              AS signups,
      COUNT(*) FILTER (WHERE a.first_payment_cents > 0)::int              AS sales,
      COUNT(*) FILTER (WHERE a.referral_code IS NOT NULL)::int            AS link_signups,
      COALESCE(SUM(a.first_payment_cents), 0)::int                        AS revenue_cents,
      COALESCE(p.paid_cents, 0)                                           AS paid_cents
    FROM users u
    LEFT JOIN attributed a ON a.agent_id = u.id
    LEFT JOIN paid p ON p.agent_id = u.id
    WHERE u.role = 'sales_agent'
    GROUP BY u.id, u.full_name, u.email, u.referral_code, u.is_suspended, u.created_at,
             u.commission_rate_override, u.agent_notes, p.paid_cents
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
    SELECT b.assisted_by_user_id AS agent_id, fp.amount AS cents,
           ag.commission_rate_override AS rate_override
    FROM businesses b
    JOIN first_payment fp ON fp.user_id = b.user_id
    JOIN users ag ON ag.id = b.assisted_by_user_id
    WHERE b.assisted_by_user_id IS NOT NULL
  `) as unknown as Row[];

  const earned = new Map<string, number>();
  for (const r of perAgentEarned) {
    const id = String(r.agent_id);
    const rate = r.rate_override !== null && r.rate_override !== undefined
      ? Number(r.rate_override)
      : settings.defaultRate;
    earned.set(id, (earned.get(id) || 0) + commissionCents(Number(r.cents) || 0, rate));
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
      effectiveRate:
        r.commission_rate_override !== null && r.commission_rate_override !== undefined
          ? Number(r.commission_rate_override)
          : settings.defaultRate,
      rateOverride:
        r.commission_rate_override !== null && r.commission_rate_override !== undefined
          ? Number(r.commission_rate_override)
          : null,
      notes: String(r.agent_notes || ''),
    };
  });
}
