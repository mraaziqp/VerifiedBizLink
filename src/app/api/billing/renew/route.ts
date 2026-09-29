import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { DOWNGRADE_TIER } from '@/lib/billing';
import { createPayfastCheckout } from '@/lib/payfast-checkout-server';
import { resumeAmountCents } from '@/lib/billing-notices';
import { logBillingEvent } from '@/lib/billing-events';

type Row = Record<string, unknown>;

/**
 * POST /api/billing/renew — "Pay now" after a subscription payment failed.
 *
 * Starts a fresh monthly PayFast subscription for the plan the customer is
 * already on, at the price they were already paying, so they re-enter a
 * working card and are billed from today. The old, failing subscription is
 * cancelled at PayFast by the webhook once the new charge succeeds — not
 * here, so abandoning this checkout never costs the customer the
 * subscription they still have.
 *
 * Also offered after a downgrade for non-payment, to restore the plan they
 * lost.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please log in to pay.' }, { status: 401 });

  const rows = (await db`
    SELECT b.id, b.company_name, b.package_type, b.downgraded_from, b.subscription_status,
           b.payment_failed_at, b.payfast_token
    FROM businesses b
    WHERE b.user_id = ${session.id}
    LIMIT 1
  `) as unknown as Row[];
  const biz = rows[0];
  if (!biz) return NextResponse.json({ error: 'No business profile found.' }, { status: 404 });

  const inGrace = Boolean(biz.payment_failed_at) && biz.package_type && biz.package_type !== DOWNGRADE_TIER;
  const lapsed = biz.subscription_status === 'downgraded_nonpayment' && Boolean(biz.downgraded_from);
  const tierKey = inGrace ? String(biz.package_type) : lapsed ? String(biz.downgraded_from) : null;

  if (!tierKey) {
    return NextResponse.json(
      { error: 'Your subscription is up to date — there is nothing to pay right now.' },
      { status: 409 },
    );
  }

  const [tier] = (await db`SELECT name FROM tiers WHERE key = ${tierKey} LIMIT 1`.catch(() => [])) as unknown as { name: string }[];
  const tierName = tier?.name || tierKey;
  const amountCents = await resumeAmountCents(session.id, tierKey);
  if (amountCents < 500) {
    await logBillingEvent({
      event: 'payment_unapplied',
      severity: 'warning',
      businessId: String(biz.id),
      userId: session.id,
      detail: `${String(biz.company_name)} tried to Pay now for ${tierName}, but no price could be found for it (last payment or tier price). They could not pay — set a price or help them manually.`,
      alertAdmins: true,
      alertTitle: 'A customer could not use Pay now',
    });
    return NextResponse.json({ error: 'We could not work out the price for your plan. Our team has been notified and will contact you.' }, { status: 409 });
  }
  const amount = amountCents / 100;

  const checkout = await createPayfastCheckout({
    session,
    amount,
    description: `${tierName} Subscription (R${amount.toFixed(2)}/month)`,
    purchaseType: `subscription_${tierKey}`,
    resume: true,
  });
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.status });
  }

  await logBillingEvent({
    event: 'pay_now_started',
    businessId: String(biz.id),
    userId: session.id,
    amountCents,
    reference: checkout.paymentRef,
    detail: `${String(biz.company_name)} opened Pay now for ${tierName} (R${amount.toFixed(2)}) ${inGrace ? 'during the grace period' : 'after being downgraded'}.`,
  });

  return NextResponse.json({
    success: true,
    paymentRef: checkout.paymentRef,
    payfastUrl: checkout.payfastUrl,
    data: checkout.data,
    signature: checkout.signature,
  });
}
