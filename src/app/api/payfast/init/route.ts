import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { createPayfastCheckout } from '@/lib/payfast-checkout-server';
import { getTier } from '@/lib/tiers';
import { findCreditPack } from '@/lib/ad-credits';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // purchaseType tells the webhook what to actually grant on success:
    // 'ad_boost' (needs adId), 'subscription_standard', 'subscription_premium', or 'ad_credits' (no auto-effect).
    const body = await request.json();
    const { adId, purchaseType } = body;
    let { amount, description } = body;

    // Credit packs are priced on the server. The browser only says WHICH pack;
    // what it costs and what it grants both come from AD_CREDIT_PACKS, so a
    // tampered amount cannot buy credits cheaply, and the webhook grants
    // exactly the pack that was paid for.
    const pack = purchaseType === 'ad_credits_topup' ? findCreditPack(body.packId) : null;
    if (purchaseType === 'ad_credits_topup') {
      if (!pack) {
        return NextResponse.json({ error: 'Choose a credit pack.' }, { status: 400 });
      }
      const [biz] = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
      if (!biz) {
        return NextResponse.json({ error: 'Create your business profile before buying ad credits.' }, { status: 400 });
      }
      amount = pack.price;
      description = `${pack.credits} Ad Credits (${pack.label})`;
    }

    if (!amount || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amount (PayFast's own minimum transaction amount is R5)
    if (amount < 5) {
      return NextResponse.json({ error: 'Minimum amount is R5' }, { status: 400 });
    }

    // Tier purchases create a new real PayFast recurring subscription each
    // time. If the business already has one active, starting a second would
    // mean PayFast charging both every month — there's no safe way to
    // auto-cancel the old one via PayFast's API yet (see cancel-subscription
    // route), so upgrades/downgrades must go through Cancel first rather
    // than risk double-billing a real customer's card.
    if ((purchaseType || '').startsWith('subscription_')) {
      const [existing] = await db`
        SELECT payfast_token FROM businesses
        WHERE user_id = ${session.id}
          AND subscription_status IN ('active', 'renewal_overdue')
          AND payfast_token IS NOT NULL
        LIMIT 1
      `;
      if (existing) {
        return NextResponse.json(
          { error: 'You already have a subscription. If its payment failed, use Pay now in Settings → Billing; otherwise cancel it there before starting a new one, to avoid being billed for both.' },
          { status: 409 },
        );
      }
    }

    /**
     * Refuse a tier the webhook would refuse to grant, BEFORE taking money.
     *
     * The webhook checks is_purchasable and blocks the upgrade, but nothing
     * checked it here — so a tier switched off in Tier Management could still
     * be paid for, and the customer was charged and then denied the product.
     * The R10 "Test Tier" is exactly that: active, priced, not purchasable.
     *
     * The price is checked here too. PayFast is told the amount by this
     * request, so without it a tampered client could pay R5 for a R699 plan
     * and simply never be granted it — a charge with no product, which reads
     * to the customer as theft rather than a validation failure.
     */
    if ((purchaseType || '').startsWith('subscription_')) {
      const tierKey = String(purchaseType).slice('subscription_'.length);
      const tier = await getTier(tierKey);

      if (!tier || !tier.isPurchasable) {
        console.error('Blocked checkout for a tier that is not purchasable', { tierKey, userId: session.id });
        return NextResponse.json(
          { error: 'That plan is not available for purchase right now. Please choose another.' },
          { status: 409 },
        );
      }
      if (!Number.isFinite(amount) || amount + 0.01 < Number(tier.price)) {
        console.error('Blocked checkout below the tier price', { tierKey, amount, price: tier.price });
        return NextResponse.json(
          { error: 'That amount does not match the plan price.' },
          { status: 400 },
        );
      }
    }

    // Verification fee is a one-time payment, not a subscription
    if (purchaseType === 'verification_fee') {
      const [biz] = await db`SELECT verification_paid FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
      if (biz?.verification_paid) {
        return NextResponse.json({ error: 'Your business is already verified.' }, { status: 409 });
      }
    }

    const checkout = await createPayfastCheckout({
      session,
      amount,
      description,
      purchaseType: purchaseType || 'ad_credits',
      adId: adId || null,
      packId: pack?.id ?? null,
    });
    if (!checkout.ok) {
      return NextResponse.json({ error: checkout.error }, { status: checkout.status });
    }

    return NextResponse.json({
      success: true,
      paymentRef: checkout.paymentRef,
      payfastUrl: checkout.payfastUrl,
      // The client must post these in exactly this order — the signature was
      // built over it. Object key order is insertion order, which the form
      // builder preserves.
      data: checkout.data,
      signature: checkout.signature,
    });
  } catch (error) {
    console.error('Payment init error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
