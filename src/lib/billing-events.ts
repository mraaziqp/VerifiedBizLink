import db from '@/lib/db';
import { sendRawEmail, sendWithin } from '@/lib/email';

/**
 * The billing log.
 *
 * Every money event — a charge, a failure, a notice sent or not sent, a
 * downgrade — is written to billing_events and to the server log. Events that
 * need a person (a failed or missing payment, money that could not be
 * recorded or applied, a subscription we could not cancel at PayFast) also
 * notify every admin in-app and by email, because the failure this exists
 * for was a paying customer's renewal not charging with nobody told.
 *
 * Never throws. Logging a problem must not become a second problem.
 */
export type BillingEvent =
  | 'charge_succeeded'
  | 'renewal_succeeded'
  | 'charge_failed'
  | 'renewal_failed'
  | 'renewal_overdue'
  | 'failure_notice_sent'
  | 'final_notice_sent'
  | 'notice_email_failed'
  | 'downgraded_nonpayment'
  | 'pay_now_started'
  | 'old_subscription_cancelled'
  | 'old_subscription_cancel_failed'
  | 'charge_on_replaced_subscription'
  | 'payment_unrecorded'
  | 'payment_unapplied';

export interface BillingEventInput {
  event: BillingEvent;
  severity?: 'info' | 'warning' | 'critical';
  businessId?: string | null;
  userId?: string | null;
  amountCents?: number | null;
  reference?: string | null;
  detail: string;
  /** Tell every admin, in-app and by email. */
  alertAdmins?: boolean;
  /** Title for the admin alert. */
  alertTitle?: string;
}

export async function logBillingEvent(input: BillingEventInput): Promise<void> {
  const severity = input.severity ?? (input.alertAdmins ? 'warning' : 'info');
  const line = { event: input.event, businessId: input.businessId, userId: input.userId, reference: input.reference, detail: input.detail };
  if (severity === 'info') console.log('[billing]', line);
  else console.error(`[billing:${severity}]`, line);

  await db`
    INSERT INTO billing_events (event, severity, business_id, user_id, amount_cents, reference, detail)
    VALUES (${input.event}, ${severity}, ${input.businessId || null}, ${input.userId || null},
            ${input.amountCents ?? null}, ${input.reference || null}, ${input.detail})
  `.catch((e) => console.error('[billing] event log write failed — run scripts/migrate-billing-events.mjs:', e.message));

  if (!input.alertAdmins) return;

  const title = input.alertTitle ?? 'Billing needs attention';
  await db`
    INSERT INTO notifications (user_id, type, title, content)
    SELECT id, ${`billing_${input.event}`}, ${title}, ${input.detail}
    FROM users WHERE role = 'admin'
  `.catch((e) => console.error('[billing] admin notification failed:', e.message));

  try {
    const admins = (await db`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`) as unknown as { email: string }[];
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <p style="font-size:16px;font-weight:bold;margin:0 0 12px">${escapeHtml(title)}</p>
        <p style="margin:0 0 12px">${escapeHtml(input.detail)}</p>
        <table style="font-size:13px;color:#444">
          <tr><td style="padding-right:12px">Event</td><td>${escapeHtml(input.event)}</td></tr>
          ${input.reference ? `<tr><td style="padding-right:12px">Reference</td><td>${escapeHtml(input.reference)}</td></tr>` : ''}
          ${input.amountCents != null ? `<tr><td style="padding-right:12px">Amount</td><td>R${(input.amountCents / 100).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding-right:12px">When</td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin:16px 0 0;color:#666">Full history: Admin → Payment Gateway → Billing log.</p>
      </div>`;
    await Promise.all(
      admins.map((a) =>
        sendWithin(sendRawEmail(a.email, `[VerifiedBizLink billing] ${title}`, html), 8000)
          .catch((e) => console.error('[billing] admin alert email failed for', a.email, e.message)),
      ),
    );
  } catch (e) {
    console.error('[billing] admin alert email failed:', e instanceof Error ? e.message : e);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
