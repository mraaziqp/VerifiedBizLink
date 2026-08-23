import db from '@/lib/db';
import { getWeeklyTierRate, weekKeyOf, commissionCents } from '@/lib/commission';

/**
 * Commission clawbacks — Commission Policy §12.
 *
 * "If a qualifying payment is later reversed, refunded or determined to have
 * been invalid, the Company may reverse or recover the related commission."
 *
 * The policy says MAY, not MUST, so a reversal never silently adjusts an
 * Advisor's balance. It raises a flagged clawback that a human approves or
 * waives — a bank error and a fraudulent registration deserve different
 * answers, and only a person can tell them apart.
 */

type Row = Record<string, unknown>;

export interface ClawbackInput {
  paymentReference: string;
  reason: string;
  actorName?: string | null;
}

export interface ClawbackResult {
  raised: boolean;
  reason: string;
  clawbackId?: string;
  commissionCents?: number;
  agentName?: string;
}

/**
 * Marks a payment reversed and, if it had earned an Advisor commission,
 * raises a clawback for review.
 *
 * The commission is captured at the value it actually earned, BEFORE the
 * payment is excluded. Recomputing it afterwards would give a different
 * answer, because removing the payment can drop that week below a tier
 * boundary and change the rate every other sale in the week was paid at.
 */
export async function reversePaymentAndRaiseClawback(
  input: ClawbackInput,
): Promise<ClawbackResult> {
  const { paymentReference, reason, actorName } = input;

  const payments = (await db`
    SELECT p.id, p.user_id, p.amount, p.status,
           COALESCE(p.completed_at, p.created_at) AS paid_at
    FROM payments p
    WHERE p.reference = ${paymentReference}
    LIMIT 1
  `) as unknown as Row[];

  if (payments.length === 0) {
    return { raised: false, reason: 'No payment found with that reference.' };
  }
  const payment = payments[0];

  if (payment.status === 'refunded' || payment.status === 'reversed') {
    return { raised: false, reason: 'That payment is already marked reversed.' };
  }

  // Which Advisor, if any, earned on this — and had they been paid already?
  const attribution = (await db`
    SELECT b.id AS business_id, b.assisted_by_user_id AS agent_id,
           b.status AS business_status,
           (b.user_id = b.assisted_by_user_id) AS is_self,
           u.full_name AS agent_name,
           u.commission_rate_override AS rate_override,
           COALESCE((SELECT SUM(amount_cents) FROM commission_payouts WHERE agent_id = b.assisted_by_user_id), 0)::int AS paid_out_cents
    FROM businesses b
    LEFT JOIN users u ON u.id = b.assisted_by_user_id
    WHERE b.user_id = ${payment.user_id}
    LIMIT 1
  `.catch(() => [])) as unknown as Row[];

  const wasCommissionable =
    attribution.length > 0 &&
    attribution[0].agent_id &&
    attribution[0].business_status === 'verified' &&
    attribution[0].is_self !== true;

  let commission = 0;
  let rateApplied: number | null = null;

  if (wasCommissionable) {
    const agentId = String(attribution[0].agent_id);
    const override = attribution[0].rate_override;

    // The week this payment belonged to, priced as it was priced then.
    const weekOfPayment = weekKeyOf(String(payment.paid_at));
    const siblings = (await db`
      SELECT COALESCE(p.completed_at, p.created_at) AS paid_at
      FROM payments p
      JOIN businesses b ON b.user_id = p.user_id
      WHERE b.assisted_by_user_id = ${agentId}
        AND p.status = 'completed'
        AND b.status = 'verified'
    `.catch(() => [])) as unknown as Row[];

    const weekCount = siblings.filter((s) => weekKeyOf(String(s.paid_at)) === weekOfPayment).length;
    rateApplied =
      override !== null && override !== undefined
        ? Number(override)
        : getWeeklyTierRate(weekCount).rate;
    commission = commissionCents(Number(payment.amount) || 0, rateApplied);
  }

  // Exclude the payment first, so every derived figure stops counting it.
  await db`
    UPDATE payments
    SET status = 'refunded',
        reversed_at = NOW(),
        reversal_reason = ${String(reason).slice(0, 500)},
        reversed_by_name = ${actorName ?? 'System'}
    WHERE id = ${payment.id}
  `;

  if (!wasCommissionable || commission <= 0) {
    return {
      raised: false,
      reason: 'Payment reversed. It had not earned any commission, so there is nothing to recover.',
    };
  }

  const agentId = String(attribution[0].agent_id);
  const alreadyPaidOut = Number(attribution[0].paid_out_cents) >= commission;

  const rows = (await db`
    INSERT INTO commission_clawbacks (
      agent_id, business_id, payment_reference, commission_cents,
      payment_cents, rate_applied, reason, already_paid_out, status
    ) VALUES (
      ${agentId}, ${attribution[0].business_id}, ${paymentReference}, ${commission},
      ${Number(payment.amount) || 0}, ${rateApplied}, ${String(reason).slice(0, 500)},
      ${alreadyPaidOut}, 'pending'
    )
    ON CONFLICT (payment_reference) DO NOTHING
    RETURNING id
  `) as unknown as Row[];

  if (rows.length === 0) {
    return { raised: false, reason: 'A clawback for that payment already exists.' };
  }

  // Flagged for a human, not applied silently.
  await db`
    INSERT INTO notifications (user_id, title, content, link)
    SELECT id, 'Commission clawback needs review',
           ${`R${(commission / 100).toFixed(2)} earned by ${attribution[0].agent_name ?? 'an advisor'} on a payment that was ${reason}`},
           '/admin/agents'
    FROM users WHERE role = 'admin'
  `.catch((e) => console.error('Clawback notification failed:', e));

  return {
    raised: true,
    reason: 'Clawback raised for review.',
    clawbackId: String(rows[0].id),
    commissionCents: commission,
    agentName: String(attribution[0].agent_name ?? ''),
  };
}

export interface ClawbackPosition {
  /** Credited back while undecided or waived — the advisor is unaffected. */
  creditedCents: number;
  /** Confirmed deductions, for reporting. */
  appliedCents: number;
  pendingCount: number;
}

/**
 * Each agent's clawback position.
 *
 * Commission is derived from completed payments, so reversing a payment
 * removes its commission the moment the status changes. That is exactly the
 * silent adjustment the policy's "may" is meant to prevent, so a clawback
 * that has not been decided yet CREDITS the amount back: raising the flag
 * changes nothing about what the Advisor is owed until a person rules on it.
 *
 *   pending  -> credited back  (flagged, but the Advisor is untouched)
 *   waived   -> credited back  (the Advisor keeps it, permanently)
 *   approved -> not credited   (the deduction stands)
 *   recovered-> not credited   (the money has been taken back)
 */
export async function getClawbackPositions(): Promise<Map<string, ClawbackPosition>> {
  const rows = (await db`
    SELECT agent_id,
           COALESCE(SUM(commission_cents) FILTER (WHERE status IN ('pending', 'waived')), 0)::int AS credited,
           COALESCE(SUM(commission_cents) FILTER (WHERE status IN ('approved', 'recovered')), 0)::int AS applied,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count
    FROM commission_clawbacks
    GROUP BY agent_id
  `.catch(() => [])) as unknown as Row[];

  const map = new Map<string, ClawbackPosition>();
  for (const r of rows) {
    map.set(String(r.agent_id), {
      creditedCents: Number(r.credited) || 0,
      appliedCents: Number(r.applied) || 0,
      pendingCount: Number(r.pending_count) || 0,
    });
  }
  return map;
}
