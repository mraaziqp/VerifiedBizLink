import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payfastData: Record<string, any> = {};

    // Convert FormData to object
    formData.forEach((value, key) => {
      payfastData[key] = value;
    });

    // Verify signature
    const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '';
    const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '';

    // Create signature for verification matching Payfast signature guidelines (RFC 3986, spaces to +)
    let dataString = Object.keys(payfastData)
      .filter(key => key !== 'signature')
      .sort()
      .map(key => {
        const val = payfastData[key];
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

    const expectedSignature = crypto
      .createHash('md5')
      .update(dataString)
      .digest('hex');

    const receivedSignature = payfastData.signature as string;

    // Verify signature matches
    if (receivedSignature !== expectedSignature) {
      console.error('Invalid Payfast signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Verify merchant ID
    if (payfastData.merchant_id !== PAYFAST_MERCHANT_ID) {
      console.error('Invalid merchant ID');
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 403 });
    }

    // Update payment status based on payment_status
    const paymentStatus = payfastData.payment_status as string;
    const paymentRef = payfastData.m_payment_id as string;

    let dbStatus = 'pending';
    if (paymentStatus === 'COMPLETE') {
      dbStatus = 'completed';
    } else if (paymentStatus === 'FAILED') {
      dbStatus = 'failed';
    } else if (paymentStatus === 'PENDING') {
      dbStatus = 'pending';
    }

    // Update payment record
    await db`
      UPDATE payments
      SET status = ${dbStatus}, payfast_reference = ${payfastData.pf_payment_id || null}, updated_at = NOW()
      WHERE reference = ${paymentRef}
    `.catch(err => console.log('Payment update note:', err.message));

    // If payment successful, grant whatever was actually purchased
    if (dbStatus === 'completed') {
      const userId = payfastData.custom_str2 as string;
      const adId = payfastData.custom_str1 as string;
      const purchaseType = (payfastData.custom_str3 as string) || 'ad_credits';
      let grantMessage = `Your payment of R${payfastData.amount_gross} has been received`;

      if (purchaseType === 'ad_boost' && adId) {
        await db`
          UPDATE ads
          SET is_boosted = TRUE, is_active = TRUE, boost_expires_at = NOW() + INTERVAL '7 days'
          WHERE id = ${adId}
            AND business_id IN (SELECT id FROM businesses WHERE user_id = ${userId})
        `.catch(err => console.log('Ad update note:', err.message));
        grantMessage = 'Your ad has been boosted for 7 days — it will get priority placement.';
      } else if (purchaseType === 'subscription_standard' || purchaseType === 'subscription_premium') {
        const tier = purchaseType === 'subscription_premium' ? 'premium' : 'standard';
        await db`
          UPDATE businesses
          SET package_type = ${tier}, updated_at = NOW()
          WHERE user_id = ${userId}
        `.catch(err => console.log('Subscription upgrade note:', err.message));
        grantMessage = `Your business has been upgraded to the ${tier === 'premium' ? 'Premium' : 'Verified'} plan.`;
      }

      // Create notification
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${userId}, 'payment_success', 'Payment Successful', ${grantMessage})
      `.catch(err => console.log('Notification note:', err.message));
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Payfast webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
