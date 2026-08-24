import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { orderPayfastFields, signPayfast, payfastEnv, payfastEnvWasDirty } from '@/lib/payfast';
import { getTier } from '@/lib/tiers';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // purchaseType tells the webhook what to actually grant on success:
    // 'ad_boost' (needs adId), 'subscription_standard', 'subscription_premium', or 'ad_credits' (no auto-effect).
    const { amount, description, adId, purchaseType } = await request.json();

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
        WHERE user_id = ${session.id} AND subscription_status = 'active' AND payfast_token IS NOT NULL
        LIMIT 1
      `;
      if (existing) {
        return NextResponse.json(
          { error: 'You already have an active subscription. Please cancel it in Settings → Billing before starting a new one, to avoid being billed for both.' },
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

    const paymentRef = `VBL-${Date.now()}-${session.id.substring(0, 8)}`;
    const amountCents = Math.round(amount * 100);

    // purchase_type is stored, not just sent to PayFast in custom_str3. If a
    // notification is ever lost, this is the only record of what the money was
    // meant to buy — without it a paid customer cannot be given their tier
    // afterwards without someone guessing.
    await db`
      INSERT INTO payments (user_id, amount, status, reference, description, ad_id, purchase_type)
      VALUES (${session.id}, ${amountCents}, 'pending', ${paymentRef}, ${description}, ${adId || null},
              ${purchaseType || 'ad_credits'})
    `.catch(err => console.log('Payment record creation note:', err.message));

    // Payfast API credentials (from environment)
    const PAYFAST_MERCHANT_ID = payfastEnv('PAYFAST_MERCHANT_ID');
    const PAYFAST_MERCHANT_KEY = payfastEnv('PAYFAST_MERCHANT_KEY');
    const PAYFAST_URL = payfastEnv('PAYFAST_URL') || 'https://www.payfast.co.za/eng/process';
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
      console.error('PayFast is not configured — merchant id or key is missing.');
      return NextResponse.json(
        { error: 'Payments are not configured yet. Please contact support.' },
        { status: 503 },
      );
    }

    // A passphrase that arrived with a byte-order mark signs a string PayFast
    // cannot reproduce, and the only symptom is a 400 on the payment page
    // with nothing in our logs. Say so here instead.
    for (const key of ['PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_PASSPHRASE'] as const) {
      if (payfastEnvWasDirty(key)) {
        console.warn(`${key} contained whitespace or an invisible character — cleaned before signing. Fix it at source.`);
      }
    }

    // Tier purchases are real monthly subscriptions — PayFast bills the
    // customer's card automatically every month until cancelled. Ad boosts
    // and ad-credit top-ups stay one-time (a boost/top-up isn't a recurring
    // commitment).
    const isSubscription = (purchaseType || '').startsWith('subscription_');

    // item_description is only meaningful for ad campaigns — calling a tier
    // subscription "Ad Campaign" is what the customer sees on the PayFast
    // page and on their bank statement.
    const itemDescription = adId
      ? `VerifiedBizLink Ad Campaign - ${description}`
      : `VerifiedBizLink - ${description}`;

    /**
     * Ordered and stripped of blanks by orderPayfastFields. Both matter:
     * PayFast rebuilds the signature from the fields in the order they are
     * posted and skips blank ones, so a sorted string or an empty
     * custom_str1 produces "Generated signature does not match submitted
     * signature" on every single payment.
     */
    const payfastData = orderPayfastFields({
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${APP_URL}/ads/payment-success?ref=${encodeURIComponent(paymentRef)}`,
      cancel_url: `${APP_URL}/ads/payment-cancel?ref=${encodeURIComponent(paymentRef)}`,
      notify_url: `${APP_URL}/api/payfast/notify`,
      name_first: session.fullName?.split(' ')[0] || 'User',
      name_last: session.fullName?.split(' ')[1] || 'Account',
      email_address: session.email,
      m_payment_id: paymentRef,
      amount: amount.toFixed(2),
      item_name: description,
      item_description: itemDescription,
      custom_str1: adId || '',
      custom_str2: session.id,
      custom_str3: purchaseType || 'ad_credits',
      ...(isSubscription
        ? {
            subscription_type: '1',
            billing_date: new Date().toISOString().slice(0, 10),
            recurring_amount: amount.toFixed(2),
            frequency: '3', // PayFast frequency code: 3 = monthly
            cycles: '0', // 0 = bill indefinitely until cancelled
          }
        : {}),
    });

    const signature = signPayfast(
      Object.entries(payfastData),
      payfastEnv('PAYFAST_PASSPHRASE'),
    );

    return NextResponse.json({
      success: true,
      paymentRef,
      payfastUrl: PAYFAST_URL,
      // The client must post these in exactly this order — the signature was
      // built over it. Object key order is insertion order, which the form
      // builder preserves.
      data: payfastData,
      signature,
    });
  } catch (error) {
    console.error('Payment init error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
