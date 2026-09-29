import db from '@/lib/db';
import { sendPaymentFailedEmail } from '@/lib/email';
import { logBillingEvent } from '@/lib/billing-events';
import { graceExpiresAt, graceHoursRemaining, formatRand, formatDate } from '@/lib/billing';

type Row = Record<string, unknown>;

/**
 * What a lapsed subscription costs to resume, in cents: the amount the
 * customer last paid for this plan (their price, even if the list price has
 * changed since), falling back to the tier's current price.
 */
export async function resumeAmountCents(userId: string, tierKey: string): Promise<number> {
  const [last] = (await db`
    SELECT amount FROM payments
    WHERE user_id = ${userId}
      AND status = 'completed'
      AND purchase_type = ${`subscription_${tierKey}`}
    ORDER BY COALESCE(completed_at, created_at) DESC
    LIMIT 1
  `.catch(() => [])) as unknown as { amount: number }[];
  if (last && Number(last.amount) > 0) return Number(last.amount);

  const [tier] = (await db`SELECT price FROM tiers WHERE key = ${tierKey} LIMIT 1`.catch(() => [])) as unknown as { price: number }[];
  return Math.round((Number(tier?.price) || 0) * 100);
}

/**
 * Emails the customer that their subscription payment failed, with Pay now,
 * Choose a different plan and Cancel options, and puts the same message in
 * their in-app notifications.
 *
 * `final` is the last reminder, a day before the plan expires. Stamps
 * payment_failed_notified_at (first notice) or grace_warned_at (final) only
 * when the email actually went out — so a failed send is retried by the next
 * billing sweep instead of the customer silently never hearing.
 */
export async function sendFailureNotice(
  businessId: string,
  opts: { final?: boolean; baseUrl?: string } = {},
): Promise<boolean> {
  const final = opts.final ?? false;
  const rows = (await db`
    SELECT b.id, b.company_name, b.package_type, b.payment_failed_at, b.payment_failed_reason,
           u.id AS user_id, u.email, u.full_name,
           t.name AS tier_name
    FROM businesses b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN tiers t ON t.key = b.package_type
    WHERE b.id = ${businessId}
    LIMIT 1
  `.catch(() => [])) as unknown as Row[];
  const b = rows[0];
  if (!b || !b.payment_failed_at) return false;

  const failedAt = new Date(b.payment_failed_at as string);
  const hoursLeft = graceHoursRemaining(failedAt);
  if (hoursLeft <= 0) return false;

  const daysRemaining = Math.max(1, Math.ceil(hoursLeft / 24));
  const deadline = formatDate(graceExpiresAt(failedAt));
  const tierName = String(b.tier_name || b.package_type);
  const amountCents = await resumeAmountCents(String(b.user_id), String(b.package_type));
  const amount = formatRand(amountCents);
  const dayWord = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;

  await db`
    INSERT INTO notifications (user_id, type, title, content)
    VALUES (
      ${b.user_id},
      'payment_failed',
      ${final ? 'Your subscription expires tomorrow' : 'Subscription payment failed'},
      ${`We couldn't collect ${amount} for your ${tierName} subscription. Pay now in Settings → Billing or your subscription expires in ${dayWord} (${deadline}).`}
    )
  `.catch((e) => console.error('[billing] in-app failure notice failed:', e.message));

  try {
    await sendPaymentFailedEmail(
      String(b.email),
      {
        firstName: String(b.full_name || '').split(' ')[0],
        companyName: b.company_name ? String(b.company_name) : undefined,
        tierName,
        amount,
        daysRemaining,
        deadline,
        final,
      },
      opts.baseUrl,
    );
  } catch (err) {
    await logBillingEvent({
      event: 'notice_email_failed',
      severity: 'critical',
      businessId: String(b.id),
      userId: String(b.user_id),
      amountCents,
      detail: `The ${final ? 'final reminder' : 'payment-failed'} email to ${String(b.email)} (${String(b.company_name)}) could not be sent: ${err instanceof Error ? err.message : String(err)}. It will be retried on the next billing sweep — contact the customer directly if this repeats.`,
      alertAdmins: true,
      alertTitle: 'A payment-failed email could not be sent',
    });
    return false;
  }

  if (final) {
    await db`UPDATE businesses SET grace_warned_at = NOW() WHERE id = ${b.id}`.catch(() => {});
  } else {
    await db`UPDATE businesses SET payment_failed_notified_at = NOW() WHERE id = ${b.id}`.catch(() => {});
  }

  await logBillingEvent({
    event: final ? 'final_notice_sent' : 'failure_notice_sent',
    businessId: String(b.id),
    userId: String(b.user_id),
    amountCents,
    detail: `${final ? 'Final reminder' : 'Payment-failed email'} sent to ${String(b.email)} for ${String(b.company_name)} — ${tierName}, ${amount}, expires ${deadline}.`,
  });
  return true;
}
