import {
  PaymentAdapter,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentMethodType,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentUnavailableError,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
} from './types';
import { payfastEnv, orderPayfastFields, signPayfast } from '@/lib/payfast';
import { platformCollectionApproved, sandboxAllowed } from './config';

/**
 * PayFast payment link / QR for a till sale. STATUS: gated (Decision Gate 1).
 *
 * This collects into VerifiedBizLink's own PayFast merchant account. Taking a
 * merchant's sale money into the platform's account and paying it out later
 * is a regulated activity in South Africa, so the method only exists when
 * POS_PLATFORM_COLLECTION_APPROVED is set (after written provider approval),
 * or against the PayFast sandbox in development.
 *
 * A sale paid this way is completed ONLY by a validated PayFast ITN
 * (/api/payfast/notify, custom_str3 = 'pos_checkout'). The redirect back to
 * the till proves nothing and is never used to mark anything paid.
 */
export class PayFastPaymentAdapter implements PaymentAdapter {
  providerName = 'payfast' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'qr_online';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const usingSandbox = sandboxAllowed() && !platformCollectionApproved();
    if (!platformCollectionApproved() && !usingSandbox) {
      throw new PaymentUnavailableError('QR / payment-link sales are not enabled yet.');
    }

    const merchantId = payfastEnv('PAYFAST_MERCHANT_ID');
    const merchantKey = payfastEnv('PAYFAST_MERCHANT_KEY');
    const baseUrl = payfastEnv('PAYFAST_URL');
    if (!merchantId || !merchantKey || !baseUrl) {
      throw new PaymentUnavailableError('PayFast is not configured (PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY / PAYFAST_URL).');
    }
    if (usingSandbox && !baseUrl.includes('sandbox')) {
      throw new PaymentUnavailableError('Refusing to use a live PayFast URL from the development sandbox.');
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';
    const mPaymentId = `POS-${req.saleId}`;

    const data = orderPayfastFields({
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/business/pos/terminal?saleId=${req.saleId}`,
      cancel_url: `${siteUrl}/business/pos/terminal?saleId=${req.saleId}&cancelled=1`,
      notify_url: `${siteUrl}/api/payfast/notify`,
      email_address: req.customerDetails?.email || undefined,
      m_payment_id: mPaymentId,
      amount: (req.amountCents / 100).toFixed(2),
      item_name: `POS sale ${req.saleId.slice(0, 8)}`,
      custom_str1: req.saleId,
      custom_str2: req.businessId,
      custom_str3: 'pos_checkout',
    });
    const signature = signPayfast(Object.entries(data), payfastEnv('PAYFAST_PASSPHRASE'));
    const query = new URLSearchParams({ ...data, signature }).toString();
    const paymentActionUrl = `${baseUrl}?${query}`;

    return {
      success: true,
      status: 'pending',
      provider: this.providerName,
      providerTxId: mPaymentId,
      paymentActionUrl,
      qrPayload: paymentActionUrl,
      deviceInstructions: 'Ask the customer to scan the QR code. The sale completes when PayFast confirms the payment.',
    };
  }

  async verify(_req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    throw new PaymentUnavailableError('PayFast POS payments are confirmed only by a validated ITN.');
  }

  async refund(_req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    // The money sits in VerifiedBizLink's PayFast account, so only the
    // platform can return it, from the PayFast dashboard.
    throw new PaymentUnavailableError('QR / payment-link sales are refunded by VerifiedBizLink support from the PayFast dashboard. Contact support with the receipt number.');
  }
}
