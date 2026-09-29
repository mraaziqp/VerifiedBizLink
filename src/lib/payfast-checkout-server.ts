import db from '@/lib/db';
import { orderPayfastFields, signPayfast, payfastEnv, payfastEnvWasDirty } from '@/lib/payfast';

export interface CheckoutSession {
  id: string;
  email: string;
  fullName?: string | null;
}

export interface CreateCheckoutInput {
  session: CheckoutSession;
  /** Rand, already validated/priced by the caller. */
  amount: number;
  description: string;
  purchaseType: string;
  adId?: string | null;
  packId?: string | null;
  /** Marks a Pay now after a failed renewal (custom_str5 = 'resume'). */
  resume?: boolean;
}

export type CreateCheckoutResult =
  | { ok: true; paymentRef: string; payfastUrl: string; data: Record<string, string>; signature: string }
  | { ok: false; status: number; error: string };

/**
 * Records the pending payment and builds the signed PayFast form.
 *
 * Shared by /api/payfast/init and /api/billing/renew so there is exactly one
 * place that decides field order and signing — PayFast rejects the whole
 * payment with an unhelpful signature error if two copies ever drift.
 */
export async function createPayfastCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const { session, amount, description, purchaseType, adId = null, packId = null, resume = false } = input;

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

  const PAYFAST_MERCHANT_ID = payfastEnv('PAYFAST_MERCHANT_ID');
  const PAYFAST_MERCHANT_KEY = payfastEnv('PAYFAST_MERCHANT_KEY');
  const PAYFAST_URL = payfastEnv('PAYFAST_URL') || 'https://www.payfast.co.za/eng/process';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';

  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    console.error('PayFast is not configured — merchant id or key is missing.');
    return { ok: false, status: 503, error: 'Payments are not configured yet. Please contact support.' };
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
  const isSubscription = purchaseType.startsWith('subscription_');

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
  const data = orderPayfastFields({
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
    custom_str4: packId || undefined,
    custom_str5: resume ? 'resume' : undefined,
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

  const signature = signPayfast(Object.entries(data), payfastEnv('PAYFAST_PASSPHRASE'));

  return { ok: true, paymentRef, payfastUrl: PAYFAST_URL, data, signature };
}
