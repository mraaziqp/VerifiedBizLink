import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DOWNGRADE_TIER, GRACE_PERIOD_HOURS, GRACE_PERIOD_DAYS, RENEWAL_GRACE_HOURS, FINAL_NOTICE_HOURS, formatDate } from '@/lib/billing';
import { appUrlFromRequest } from '@/lib/email';
import { sendFailureNotice } from '@/lib/billing-notices';
import { logBillingEvent } from '@/lib/billing-events';
import { scanOverdueSubscriptions } from '@/db/queries/subscriptions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * GET /api/cron/billing — the subscription lifecycle sweep.
 *
 * Run hourly by .github/workflows/scheduled-jobs.yml. The app is hosted on
 * AWS Amplify, which ignores vercel.json and has no scheduler, so until that
 * workflow existed this sweep never ran in production at all. The logic is
 * time-based rather than run-based, so a missed run only makes a decision
 * late, never wrong.
 *
 * Jobs, in order:
 *
 *  0. Catch renewals that were due and never charged, and open the 5-day
 *     grace window on them. This is what makes a recurring subscription
 *     verifiable rather than assumed: if PayFast stops billing, somebody
 *     finds out.
 *  1. Email every business whose payment failed and has not been told yet —
 *     Pay now / Choose a different plan / Cancel — and again a day before
 *     the plan expires. A send that fails is retried on the next run.
 *  2. Downgrade anyone whose grace window has closed, and anyone whose paid
 *     term ended with auto-renew switched off.
 *
 * Every step is written to billing_events, and anything needing a person is
 * sent to admins in-app and by email.
 *
 * Downgrade means package_type -> 'free'. It never deletes a business, a
 * profile, a document or a gallery image: the rule is that a lapsed customer
 * stays listed with restricted features, and is only removed on request.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = appUrlFromRequest(request);
  const now = new Date();
  const result = { overdue: 0, noticed: 0, finalNoticed: 0, downgraded: 0, lapsed: 0, errors: 0, overdueSubscriptions: 0 };

  try {
    /* --- 0. A renewal that never charged ---------------------------------
     *
     * The webhook advances next_billing_at on every successful charge; if a
     * cycle never lands, next_billing_at simply stays in the past. PayFast
     * does not reliably notify on a declined subscription charge, so this is
     * how a failed renewal is found at all — JL Industrial's renewal on
     * 26 September 2026 never charged and nothing anywhere said so.
     *
     * Waits RENEWAL_GRACE_HOURS past the due date first, because PayFast
     * settles after the billing date and money may already be on its way.
     *
     * Only businesses that actually have a subscription qualify. A plan put
     * on by hand has no PayFast token and no payment history, and carries a
     * next_billing_at only because the column has a default.
     */
    const overdue = (await db`
      UPDATE businesses
      SET payment_failed_at = NOW(),
          payment_failed_notified_at = NULL,
          grace_warned_at = NULL,
          payment_failed_reason = 'renewal_not_charged',
          subscription_status = 'renewal_overdue',
          updated_at = NOW()
      WHERE auto_renew IS TRUE
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND next_billing_at IS NOT NULL
        AND next_billing_at <= NOW() - (${RENEWAL_GRACE_HOURS} * INTERVAL '1 hour')
        AND (payfast_token IS NOT NULL OR last_billed_at IS NOT NULL)
        AND payment_failed_at IS NULL
      RETURNING id, user_id, company_name, package_type, next_billing_at, payfast_token
    `.catch((e) => { console.error('Overdue renewal scan failed:', e); result.errors += 1; return []; })) as unknown as Row[];
    result.overdue = overdue.length;

    for (const row of overdue) {
      await logBillingEvent({
        event: 'renewal_overdue',
        severity: 'critical',
        businessId: String(row.id),
        userId: String(row.user_id),
        reference: row.payfast_token ? String(row.payfast_token) : null,
        detail: `${String(row.company_name)} (${String(row.package_type)}) was due to renew on ${formatDate(row.next_billing_at as string)} but PayFast has not charged it. The customer is being emailed a Pay now link and has ${GRACE_PERIOD_DAYS} days before the plan expires. Check subscription ${String(row.payfast_token ?? '(no token)')} in the PayFast dashboard.`,
        alertAdmins: true,
        alertTitle: `Renewal did not charge: ${String(row.company_name)}`,
      });
    }

    // --- 1a. First notice: every failure not yet emailed ------------------
    const needNotice = (await db`
      SELECT id FROM businesses
      WHERE payment_failed_at IS NOT NULL
        AND payment_failed_notified_at IS NULL
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND payment_failed_at > NOW() - (${GRACE_PERIOD_HOURS} * INTERVAL '1 hour')
      LIMIT 100
    `.catch((e) => { console.error('Notice scan failed:', e); result.errors += 1; return []; })) as unknown as Row[];

    for (const row of needNotice) {
      if (await sendFailureNotice(String(row.id), { baseUrl })) result.noticed += 1;
      else result.errors += 1;
    }

    // --- 1b. Final reminder, a day before the plan expires ----------------
    const needFinal = (await db`
      SELECT id FROM businesses
      WHERE payment_failed_at IS NOT NULL
        AND payment_failed_notified_at IS NOT NULL
        AND grace_warned_at IS NULL
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND payment_failed_at <= NOW() - (${GRACE_PERIOD_HOURS - FINAL_NOTICE_HOURS} * INTERVAL '1 hour')
        AND payment_failed_at > NOW() - (${GRACE_PERIOD_HOURS} * INTERVAL '1 hour')
      LIMIT 100
    `.catch((e) => { console.error('Final notice scan failed:', e); result.errors += 1; return []; })) as unknown as Row[];

    for (const row of needFinal) {
      if (await sendFailureNotice(String(row.id), { final: true, baseUrl })) result.finalNoticed += 1;
      else result.errors += 1;
    }

    // --- 2a. Grace window closed -> downgrade ------------------------------
    const expired = (await db`
      UPDATE businesses
      SET downgraded_from = package_type,
          downgraded_at = NOW(),
          package_type = ${DOWNGRADE_TIER},
          subscription_status = 'downgraded_nonpayment',
          payment_failed_at = NULL,
          payment_failed_notified_at = NULL,
          grace_warned_at = NULL,
          auto_renew = FALSE,
          updated_at = NOW()
      WHERE payment_failed_at IS NOT NULL
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND payment_failed_at <= NOW() - (${GRACE_PERIOD_HOURS} * INTERVAL '1 hour')
      RETURNING id, user_id, company_name, downgraded_from, payfast_token
    `.catch((e) => { console.error('Downgrade step failed:', e); result.errors += 1; return []; })) as unknown as Row[];
    result.downgraded = expired.length;

    for (const row of expired) {
      await logBillingEvent({
        event: 'downgraded_nonpayment',
        severity: 'warning',
        businessId: String(row.id),
        userId: String(row.user_id),
        reference: row.payfast_token ? String(row.payfast_token) : null,
        detail: `${String(row.company_name)} was moved from ${String(row.downgraded_from)} to Free after ${GRACE_PERIOD_DAYS} days without payment.${row.payfast_token ? ` Make sure PayFast subscription ${String(row.payfast_token)} is cancelled so it cannot charge later.` : ''}`,
        alertAdmins: true,
        alertTitle: `Subscription expired for non-payment: ${String(row.company_name)}`,
      });
    }

    // --- 2b. Term ended with auto-renew off -> lapse to free ---------------
    const lapsed = (await db`
      UPDATE businesses
      SET downgraded_from = package_type,
          downgraded_at = NOW(),
          package_type = ${DOWNGRADE_TIER},
          subscription_status = 'cancelled',
          updated_at = NOW()
      WHERE auto_renew IS FALSE
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND next_billing_at IS NOT NULL
        AND next_billing_at <= NOW()
      RETURNING id, user_id, downgraded_from
    `.catch((e) => { console.error('Lapse step failed:', e); result.errors += 1; return []; })) as unknown as Row[];
    result.lapsed = lapsed.length;

    // In-app notification rather than email: non-essential alerts are kept
    // off the mail channel to stay inside the 100k/month limit.
    for (const row of [...expired, ...lapsed]) {
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (
          ${row.user_id},
          'subscription_ended',
          'Your account moved to the Free tier',
          ${'Your ' + String(row.downgraded_from || 'paid') + ' subscription has ended. Your business is still listed and nothing has been deleted — resubscribe any time to restore premium features.'}
        )
      `.catch((e) => console.error('Downgrade notification failed:', e));
    }

    // 3. Admin-assigned subscriptions (user_subscriptions) whose renewal date
    //    has passed while still active/unpaid. Reported, not acted on: these
    //    are set by hand in the admin panel, so a person decides what happens.
    //    One notification per admin per run, only when there is something new.
    try {
      const overdue = await scanOverdueSubscriptions(now);
      result.overdueSubscriptions = overdue.length;
      if (overdue.length > 0) {
        const names = overdue.slice(0, 5).map((o) => o.userName || o.userEmail).join(', ');
        await db`
          INSERT INTO notifications (user_id, type, title, content)
          SELECT id, 'billing_overdue', 'Subscriptions past their renewal date',
                 ${`${overdue.length} subscription${overdue.length === 1 ? ' is' : 's are'} past the renewal date: ${names}${overdue.length > 5 ? '…' : ''}. Review them in Admin → Users.`}
          FROM users WHERE role = 'admin'
        `.catch((e) => console.error('Overdue notification failed:', e));
      }
    } catch {
      result.errors += 1;
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Billing cron error:', error);
    return NextResponse.json({ error: 'Billing cron failed' }, { status: 500 });
  }
}
