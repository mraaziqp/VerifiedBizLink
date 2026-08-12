import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DOWNGRADE_TIER, GRACE_PERIOD_HOURS, graceExpiresAt, graceHoursRemaining, formatRand, formatDate } from '@/lib/billing';
import { sendPaymentFailedEmail, appUrlFromRequest } from '@/lib/email';

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
 * Scheduled daily (02:00) because Vercel's Hobby plan caps cron jobs at one
 * run per day. The logic is time-based rather than run-based, so a daily
 * cadence is safe: it downgrades anyone whose 72-hour window has *already*
 * closed, so the only effect is that a downgrade can land up to 24 hours
 * late — erring in the customer's favour. Move to hourly (`0 * * * *`) if
 * the account is upgraded to Pro, and nothing else needs to change.
 *
 * Two jobs:
 *
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
  const result = { warned: 0, downgraded: 0, lapsed: 0, errors: 0 };

  try {
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
        INSERT INTO notifications (user_id, title, content, link)
        VALUES (
          ${row.user_id},
          'Your account moved to the Free tier',
          ${'Your ' + String(row.downgraded_from || 'paid') + ' subscription has ended. Your business is still listed and nothing has been deleted — resubscribe any time to restore premium features.'},
          '/settings'
        )
      `.catch((e) => console.error('Downgrade notification failed:', e));
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Billing cron error:', error);
    return NextResponse.json({ error: 'Billing cron failed' }, { status: 500 });
  }
}
