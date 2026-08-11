import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import {
  DEFAULT_INTERVALS, subscriptionTerms, graceHoursRemaining, graceExpiresAt,
  DOWNGRADE_TIER,
} from '@/lib/billing';

type Row = Record<string, unknown>;

/**
 * GET /api/billing/subscription — everything the billing screen renders:
 * current tier, renewal state, the exact cancellation wording, available
 * terms, and the customer's invoice history.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT
        b.id, b.company_name, b.package_type, b.auto_renew, b.billing_interval_months,
        b.next_billing_at, b.payment_failed_at, b.cancelled_at, b.subscription_status,
        b.downgraded_from, b.downgraded_at,
        t.name AS tier_name, t.price AS tier_price
      FROM businesses b
      LEFT JOIN tiers t ON t.key = b.package_type
      WHERE b.user_id = ${session.id}
      LIMIT 1
    `) as unknown as Row[];

    const biz = rows[0] ?? null;

    const intervals = (await db`
      SELECT months, label, discount_percent
      FROM tier_durations WHERE is_active IS TRUE ORDER BY sort_order ASC
    `.catch(() => [])) as unknown as Row[];

    const invoices = (await db`
      SELECT invoice_number, tier_name, description, amount_cents, currency,
             interval_months, issued_at, next_billing_at, status
      FROM invoices WHERE user_id = ${session.id}
      ORDER BY issued_at DESC LIMIT 50
    `.catch(() => [])) as unknown as Row[];

    // tiers.price is stored in rand; everything customer-facing is cents.
    const renewalCents = Math.round((Number(biz?.tier_price) || 0) * 100);
    const failedAt = (biz?.payment_failed_at as string) ?? null;

    return NextResponse.json({
      subscription: biz
        ? {
            businessId: biz.id,
            companyName: biz.company_name,
            tierKey: biz.package_type || DOWNGRADE_TIER,
            tierName: biz.tier_name || 'Free',
            renewalPriceCents: renewalCents,
            autoRenew: biz.auto_renew !== false,
            intervalMonths: Number(biz.billing_interval_months) || 1,
            nextBillingAt: biz.next_billing_at ?? null,
            cancelledAt: biz.cancelled_at ?? null,
            status: biz.subscription_status || 'active',
            // Non-null only while a failed payment is inside its 72h window.
            paymentFailedAt: failedAt,
            graceHoursRemaining: graceHoursRemaining(failedAt),
            graceEndsAt: failedAt ? graceExpiresAt(new Date(failedAt)).toISOString() : null,
            downgradedFrom: biz.downgraded_from ?? null,
            downgradedAt: biz.downgraded_at ?? null,
            terms: subscriptionTerms(renewalCents, (biz.next_billing_at as string) ?? null),
          }
        : null,
      intervals: intervals.length
        ? intervals.map((i) => ({
            months: Number(i.months),
            label: i.label,
            discountPercent: Number(i.discount_percent) || 0,
          }))
        : DEFAULT_INTERVALS,
      invoices: invoices.map((i) => ({
        invoiceNumber: i.invoice_number,
        tierName: i.tier_name,
        description: i.description,
        amountCents: Number(i.amount_cents) || 0,
        currency: i.currency || 'ZAR',
        intervalMonths: Number(i.interval_months) || 1,
        issuedAt: i.issued_at,
        nextBillingAt: i.next_billing_at,
        status: i.status,
      })),
    });
  } catch (error) {
    console.error('Billing subscription read error:', error);
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 });
  }
}

/**
 * PATCH /api/billing/subscription — the one-tap auto-renew toggle.
 *
 * Turning auto-renew off is NOT a cancellation: the customer keeps everything
 * they paid for until the period they already bought runs out. That is what
 * the terms promise, so it is what the code does.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { autoRenew, reason } = await request.json();
    if (typeof autoRenew !== 'boolean') {
      return NextResponse.json({ error: 'autoRenew must be true or false' }, { status: 400 });
    }

    const rows = (await db`
      UPDATE businesses
      SET auto_renew = ${autoRenew},
          cancelled_at = ${autoRenew ? null : new Date().toISOString()},
          cancellation_reason = ${autoRenew ? null : (typeof reason === 'string' ? reason.slice(0, 500) : null)},
          updated_at = NOW()
      WHERE user_id = ${session.id}
      RETURNING id, package_type, next_billing_at
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No business profile found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      autoRenew,
      // Stated explicitly so the UI never has to guess what happens next.
      activeUntil: rows[0].next_billing_at ?? null,
      message: autoRenew
        ? 'Auto-renew is on. Your subscription will continue until you cancel.'
        : 'Auto-renew is off. You keep every paid feature until your current term ends, then move to the Free tier. Nothing is deleted.',
    });
  } catch (error) {
    console.error('Billing subscription update error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
