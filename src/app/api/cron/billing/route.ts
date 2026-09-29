import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DOWNGRADE_TIER, GRACE_PERIOD_HOURS, RENEWAL_GRACE_HOURS, graceExpiresAt, graceHoursRemaining, formatRand, formatDate } from '@/lib/billing';
import { sendPaymentFailedEmail, appUrlFromRequest } from '@/lib/email';
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
 * Three jobs:
 *
 *  0. Catch renewals that were due and never charged, and open the grace
 *     window on them. This is what makes a recurring subscription verifiable
 *     rather than assumed: if PayFast stops billing, somebody finds out.
 *  1. Warn businesses inside the 72-hour grace window (once, at the halfway
 *     point) so a failed card is not discovered only after features vanish.
 *  2. Downgrade anyone whose grace window has closed, and anyone whose paid
 *     term ended with auto-renew switched off.
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
  const result = { overdue: 0, warned: 0, downgraded: 0, lapsed: 0, errors: 0, overdueSubscriptions: 0 };

  try {
    /* --- 0. A renewal that never charged ---------------------------------
     *
     * Runs before the warning step so an overdue renewal enters the same
     * 72-hour grace path as a declined card, rather than being a separate
     * silent state.
     *
     * The webhook advances next_billing_at on every successful charge; if a
     * cycle never lands, next_billing_at simply stays in the past. The
     * downgrade clauses below only ever matched auto_renew IS FALSE, so such
     * a business kept its paid tier for free indefinitely and nothing said so.
     *
     * Marking payment_failed_at is deliberately all this does: it opens the
     * window, the customer gets the existing warning email, and they keep
     * their features for 72 hours in case the charge is merely slow.
     *
     * Only businesses that actually have a subscription qualify. A plan put
     * on by hand — staff accounts, comped plans, anything granted in the
     * admin screens — has no PayFast token and no payment history, and carries
     * a next_billing_at only because the column has a default. An earlier
     * version without this condition dunned two such accounts for failing to
     * pay a subscription they never had (scripts/repair-false-overdue.mjs).
     */
    const overdue = (await db`
      UPDATE businesses
      SET payment_failed_at = NOW(),
          subscription_status = 'renewal_overdue',
          updated_at = NOW()
      WHERE auto_renew IS TRUE
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND next_billing_at IS NOT NULL
        AND next_billing_at <= NOW() - (${RENEWAL_GRACE_HOURS} * INTERVAL '1 hour')
        AND (payfast_token IS NOT NULL OR last_billed_at IS NOT NULL)
        AND payment_failed_at IS NULL
      RETURNING id, user_id, company_name, package_type, next_billing_at
    `.catch((e) => { console.error('Overdue renewal scan failed:', e); result.errors += 1; return []; })) as unknown as Row[];
    result.overdue = overdue.length;

    // Admins need to see this: an overdue renewal is usually a subscription
    // that does not exist at PayFast or a card that was declined, which no
    // customer will ever report.
    for (const row of overdue) {
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        SELECT id, 'renewal_overdue', 'A subscription renewal did not charge',
               ${`${String(row.company_name)} is on ${String(row.package_type)} and its renewal was due ${formatDate(row.next_billing_at as string)}, but no payment arrived. Check the subscription in the PayFast dashboard — they now have ${GRACE_PERIOD_HOURS} hours before downgrade.`}
        FROM users WHERE role = 'admin'
      `.catch((e) => console.error('Overdue notification failed:', e));
    }

    // --- 1. Warn, halfway through the window -------------------------------
    const warnAfterHours = Math.floor(GRACE_PERIOD_HOURS / 2);
    const atRisk = (await db`
      SELECT b.id, b.company_name, b.package_type, b.payment_failed_at,
             u.id AS user_id, u.email, u.full_name,
             t.name AS tier_name, t.price AS tier_price
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN tiers t ON t.key = b.package_type
      WHERE b.payment_failed_at IS NOT NULL
        AND b.package_type IS NOT NULL
        AND b.package_type <> ${DOWNGRADE_TIER}
        AND b.payment_failed_at < NOW() - (${warnAfterHours} * INTERVAL '1 hour')
        AND b.payment_failed_at > NOW() - (${GRACE_PERIOD_HOURS} * INTERVAL '1 hour')
        AND b.grace_warned_at IS NULL
      LIMIT 100
    `.catch(() => [])) as unknown as Row[];

    for (const row of atRisk) {
      try {
        const failedAt = new Date(row.payment_failed_at as string);
        await sendPaymentFailedEmail(
          String(row.email),
          String(row.full_name || '').split(' ')[0],
          String(row.tier_name || row.package_type),
          formatRand(Math.round((Number(row.tier_price) || 0) * 100)),
          graceHoursRemaining(failedAt, now),
          formatDate(graceExpiresAt(failedAt)),
          baseUrl,
        );
        await db`UPDATE businesses SET grace_warned_at = NOW() WHERE id = ${row.id}`;
        result.warned += 1;
      } catch (error) {
        console.error('Grace warning failed for', row.id, error);
        result.errors += 1;
      }
    }

    // --- 2a. Grace window closed -> downgrade ------------------------------
    const expired = (await db`
      UPDATE businesses
      SET downgraded_from = package_type,
          downgraded_at = NOW(),
          package_type = ${DOWNGRADE_TIER},
          subscription_status = 'downgraded_nonpayment',
          payment_failed_at = NULL,
          grace_warned_at = NULL,
          auto_renew = FALSE,
          updated_at = NOW()
      WHERE payment_failed_at IS NOT NULL
        AND package_type IS NOT NULL
        AND package_type <> ${DOWNGRADE_TIER}
        AND payment_failed_at <= NOW() - (${GRACE_PERIOD_HOURS} * INTERVAL '1 hour')
      RETURNING id, user_id, downgraded_from
    `.catch(() => [])) as unknown as Row[];
    result.downgraded = expired.length;

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
    `.catch(() => [])) as unknown as Row[];
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
