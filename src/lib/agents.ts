import crypto from 'crypto';
import db from '@/lib/db';
import {
  calculateAgentCommission, calculateRetentionFromPayments,
  getWeeklyTierRate, weekKeyOf,
} from '@/lib/commission';
import { getClawbackPositions } from '@/lib/clawbacks';

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
  /** Weekly tiered acquisition commission (policy 4). */
  acquisitionCommissionCents: number;
  /** 5% monthly retention, capped at 12 months (policy 8). */
  retentionCommissionCents: number;
  /** Approved clawbacks against this advisor (policy 12). */
  clawedBackCents: number;
  /** Overpaid commission that needs recovering. */
  recoverableCents: number;
  /** Clawbacks raised but not yet decided. */
  pendingClawbacks: number;
  /** Sales that met policy 5 and 14. */
  qualifyingSales: number;
  /** Paid signups excluded by policy (unverified, self-registered). */
  excludedSales: number;
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
 * Commission follows the official weekly tiered policy, with a per-agent
 * negotiated rate taking precedence when one is set.
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

  /**
   * Commission is computed per payment through the SAME official policy the
   * agent portal shows, so the number an agent sees and the number Finance
   * pays from cannot differ. This previously applied a flat settings rate
   * here while the portal applied weekly tiers — two different answers for
   * the same money.
   *
   * paid_at is selected because the weekly acquisition tier depends on which
   * week a payment landed in.
   */
  const perAgentEarned = (await db`
    WITH first_payment AS (
      SELECT DISTINCT ON (p.user_id)
        p.user_id, p.amount,
        COALESCE(p.completed_at, p.created_at) AS paid_at
      FROM payments p WHERE p.status = 'completed'
      ORDER BY p.user_id, COALESCE(p.completed_at, p.created_at) ASC
    )
    SELECT b.assisted_by_user_id AS agent_id, fp.amount AS cents, fp.paid_at,
           ag.commission_rate_override AS rate_override,
           b.status AS business_status,
           -- Policy §5: verification must be complete for a sale to qualify.
           (b.status = 'verified') AS is_verified,
           -- Policy §14: an Advisor registering themselves does not qualify.
           (b.user_id = b.assisted_by_user_id) AS is_self_registration
    FROM businesses b
    JOIN first_payment fp ON fp.user_id = b.user_id
    JOIN users ag ON ag.id = b.assisted_by_user_id
    WHERE b.assisted_by_user_id IS NOT NULL
  `) as unknown as Row[];

  // Group by agent first: the tier depends on how many of THAT agent's sales
  // fell in each week, so it cannot be decided one row at a time.
  const salesByAgent = new Map<
    string,
    { amountCents: number; paidAt: string; qualifies: boolean; disqualifiedReason: string | null; override: number | null }[]
  >();
  for (const r of perAgentEarned) {
    const id = String(r.agent_id);
    const list = salesByAgent.get(id) ?? [];

    // Policy §5 and §14 decide whether this sale earns anything. The reason is
    // carried through so a zero can be explained rather than just shown.
    const selfRegistered = r.is_self_registration === true;
    const verified = r.is_verified === true;
    const disqualifiedReason = selfRegistered
      ? 'Self-registration (policy §14)'
      : !verified
        ? `Verification not complete (currently "${r.business_status}")`
        : null;

    list.push({
      amountCents: Number(r.cents) || 0,
      paidAt: String(r.paid_at),
      qualifies: disqualifiedReason === null,
      disqualifiedReason,
      override:
        r.rate_override !== null && r.rate_override !== undefined ? Number(r.rate_override) : null,
    });
    salesByAgent.set(id, list);
  }

  const earned = new Map<string, number>();
  const qualifyingCount = new Map<string, number>();
  const excludedCount = new Map<string, number>();
  // How many qualifying sales each agent has landed in the CURRENT week —
  // this is what decides the tier a new sale would be priced at.
  const currentWeekSales = new Map<string, number>();
  const thisWeek = weekKeyOf(new Date());

  for (const [id, sales] of salesByAgent) {
    const override = sales[0]?.override ?? null;
    const result = calculateAgentCommission(sales, override);
    earned.set(id, result.acquisitionCommissionCents);
    qualifyingCount.set(id, result.qualifyingSales);
    excludedCount.set(id, result.excludedSales);
    currentWeekSales.set(id, result.weeklyCounts[thisWeek] ?? 0);
  }

  /**
   * Retention commission (policy §8): 5% of every monthly payment actually
   * received, for at most 12 months from the customer's first payment.
   * Computed from real payments, because §9 ends it the moment payments stop.
   */
  const retentionRows = (await db`
    WITH first_payment AS (
      SELECT DISTINCT ON (p.user_id)
        p.user_id, COALESCE(p.completed_at, p.created_at) AS first_at
      FROM payments p WHERE p.status = 'completed'
      ORDER BY p.user_id, COALESCE(p.completed_at, p.created_at) ASC
    )
    SELECT b.assisted_by_user_id AS agent_id,
           p.amount AS cents,
           COALESCE(p.completed_at, p.created_at) AS paid_at,
           fp.first_at
    FROM payments p
    JOIN businesses b ON b.user_id = p.user_id
    JOIN first_payment fp ON fp.user_id = p.user_id
    WHERE p.status = 'completed'
      AND b.assisted_by_user_id IS NOT NULL
      AND b.status = 'verified'
      AND b.user_id <> b.assisted_by_user_id
  `.catch(() => [])) as unknown as Row[];

  const retentionByAgent = new Map<string, number>();
  const retentionInput = new Map<string, { amountCents: number; paidAt: string; firstPaymentAt: string }[]>();
  for (const r of retentionRows) {
    const id = String(r.agent_id);
    const list = retentionInput.get(id) ?? [];
    list.push({
      amountCents: Number(r.cents) || 0,
      paidAt: String(r.paid_at),
      firstPaymentAt: String(r.first_at),
    });
    retentionInput.set(id, list);
  }
  for (const [id, payments] of retentionInput) {
    retentionByAgent.set(id, calculateRetentionFromPayments(payments).totalCents);
  }

  const clawbacks = await getClawbackPositions();

  return rows.map((r) => {
    const id = String(r.id);
    const acquisitionCents = earned.get(id) || 0;
    const retentionCents = retentionByAgent.get(id) || 0;
    const position = clawbacks.get(id) ?? { creditedCents: 0, appliedCents: 0, pendingCount: 0 };
    // An undecided or waived clawback is credited back, so raising the flag
    // does not move the Advisor's balance until someone rules on it.
    const clawedBackCents = position.appliedCents;
    // What the Advisor has earned in total under the policy: weekly
    // acquisition (§4) plus monthly retention (§8).
    // Acquisition (§4) + retention (§8), plus anything credited back because
    // its clawback is still undecided or was waived.
    const earnedCents = acquisitionCents + retentionCents + position.creditedCents;
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
      acquisitionCommissionCents: acquisitionCents,
      retentionCommissionCents: retentionCents,
      clawedBackCents,
      pendingClawbacks: position.pendingCount,
      qualifyingSales: qualifyingCount.get(id) ?? 0,
      excludedSales: excludedCount.get(id) ?? 0,
      commissionPaidCents: paidCents,
      /**
       * Owed and recoverable are two sides of the same subtraction, each
       * clamped at zero: a negative balance is not something to pay, and an
       * overpayment is a debt to recover rather than a negative amount owed.
       * The clawback is NOT subtracted again here — reversing the payment
       * already removed its commission from earnedCents, so deducting it a
       * second time would double-count the same money.
       */
      commissionOwedCents: Math.max(0, earnedCents - paidCents),
      /** Paid out but no longer earned — what has to come back. */
      recoverableCents: Math.max(0, paidCents - earnedCents),
      // Under the weekly policy there is no single lifetime rate, so this
      // reports what the agent's NEXT sale would earn: their negotiated rate
      // if they have one, otherwise the tier their current week has reached.
      effectiveRate:
        r.commission_rate_override !== null && r.commission_rate_override !== undefined
          ? Number(r.commission_rate_override)
          : getWeeklyTierRate(currentWeekSales.get(id) ?? 0).rate,
      rateOverride:
        r.commission_rate_override !== null && r.commission_rate_override !== undefined
          ? Number(r.commission_rate_override)
          : null,
      notes: String(r.agent_notes || ''),
    };
  });
}
