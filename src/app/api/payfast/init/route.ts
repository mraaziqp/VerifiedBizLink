import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import crypto from 'crypto';

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

    const paymentRef = `VBL-${Date.now()}-${session.id.substring(0, 8)}`;
    const amountCents = Math.round(amount * 100);

    await db`
      INSERT INTO payments (user_id, amount, status, reference, description, ad_id)
      VALUES (${session.id}, ${amountCents}, 'pending', ${paymentRef}, ${description}, ${adId || null})
    `.catch(err => console.log('Payment record creation note:', err.message));

    // Payfast API credentials (from environment)
    const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '';
    const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '';
    const PAYFAST_URL = process.env.PAYFAST_URL || 'https://www.payfast.co.za/eng/process';
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';

    // Tier purchases are real monthly subscriptions — PayFast bills the
    // customer's card automatically every month until cancelled. Ad boosts
    // and ad-credit top-ups stay one-time (a boost/top-up isn't a recurring
    // commitment).
    const isSubscription = (purchaseType || '').startsWith('subscription_');

    // Build Payfast data
    const payfastData = {
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
      item_description: `VerifiedBizLink Ad Campaign - ${description}`,
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
    };

    // Create signature matching Payfast guidelines (RFC 3986 style, spaces to +)
    let dataString = Object.keys(payfastData)
      .sort()
      .map(key => {
        const val = (payfastData as any)[key];
        const encodedVal = encodeURIComponent(val)
          .replace(/%20/g, '+')
          .replace(/!/g, '%21')
          .replace(/'/g, '%27')
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29')
          .replace(/\*/g, '%2A');
        return `${key}=${encodedVal}`;
      })
      .join('&');

    if (process.env.PAYFAST_PASSPHRASE) {
      const encodedPass = encodeURIComponent(process.env.PAYFAST_PASSPHRASE)
        .replace(/%20/g, '+')
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
      dataString += `&passphrase=${encodedPass}`;
    }

    const signature = crypto
      .createHash('md5')
      .update(dataString)
      .digest('hex');

    return NextResponse.json({
      success: true,
      paymentRef,
      payfastUrl: PAYFAST_URL,
      data: payfastData,
      signature,
    });
  } catch (error: any) {
    console.error('Payment init error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
