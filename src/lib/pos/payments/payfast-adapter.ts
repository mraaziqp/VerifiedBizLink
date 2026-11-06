import {
  PaymentAdapter,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentMethodType,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
} from './types';
import { payfastEnv, payfastEncode, orderPayfastFields } from '@/lib/payfast';
import crypto from 'crypto';

export class PayFastPaymentAdapter implements PaymentAdapter {
  providerName = 'payfast' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'qr_online';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const merchantId = payfastEnv('PAYFAST_MERCHANT_ID') || '10000100';
    const merchantKey = payfastEnv('PAYFAST_MERCHANT_KEY') || '46f0cd694581a';
    const baseUrl = payfastEnv('PAYFAST_URL') || 'https://sandbox.payfast.co.za/eng/process';
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';

    const providerTxId = `pf_${Date.now()}_${req.saleId.substring(0, 8)}`;
    const returnUrl = `${siteUrl}/business/pos/terminal?saleId=${req.saleId}&status=success`;
    const cancelUrl = `${siteUrl}/business/pos/terminal?saleId=${req.saleId}&status=cancelled`;
    const notifyUrl = `${siteUrl}/api/payfast/notify`;

    const data: Record<string, string | number> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id: providerTxId,
      amount: (req.amountCents / 100).toFixed(2),
      item_name: `POS Sale #${req.saleId.slice(0, 6)}`,
      custom_str1: req.saleId,
      custom_str2: req.businessId,
      custom_str3: 'pos_checkout',
    };

    if (req.customerDetails?.email) {
      data.email_address = req.customerDetails.email;
    }

    const ordered = orderPayfastFields(data);
    const queryString = Object.entries(ordered)
      .map(([k, v]) => `${k}=${payfastEncode(v)}`)
      .join('&');

    const passphrase = payfastEnv('PAYFAST_PASSPHRASE');
    const signatureString = passphrase ? `${queryString}&passphrase=${payfastEncode(passphrase)}` : queryString;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const paymentActionUrl = `${baseUrl}?${queryString}&signature=${signature}`;

    return {
      success: true,
      status: 'pending',
      provider: this.providerName,
      providerTxId,
      paymentActionUrl,
      qrPayload: paymentActionUrl,
      deviceInstructions: 'Customer can scan the QR code to pay with Scan to Pay, Capitec Pay, or Card.',
    };
  }

  async verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    return {
      verified: true,
      status: 'approved',
      amountCents: 0,
      providerTxId: req.providerTxId,
    };
  }

  async refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    return {
      success: true,
      status: 'refunded',
      amountCents: req.amountCents,
      refundTxId: `pf_ref_${Date.now()}`,
    };
  }
}
