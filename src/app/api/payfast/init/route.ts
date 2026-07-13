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

    const { amount, description, adId } = await request.json();

    if (!amount || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amount (PayFast's own minimum transaction amount is R5)
    if (amount < 5) {
      return NextResponse.json({ error: 'Minimum amount is R5' }, { status: 400 });
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

    // Build Payfast data
    const payfastData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${APP_URL}/ads/payment-success`,
      cancel_url: `${APP_URL}/ads/payment-cancel`,
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
