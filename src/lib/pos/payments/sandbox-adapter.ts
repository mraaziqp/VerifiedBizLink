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

/**
 * Sandbox Simulator Adapter for Contactless Card / SoftPOS / Apple Tap to Pay.
 * Simulates real NFC card tapping, EMV tokenization, approval, decline scenarios,
 * and card brand recognition without charging real money or requiring live merchant accounts.
 */
export class SandboxPaymentAdapter implements PaymentAdapter {
  providerName = 'sandbox' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'card_tap' || method === 'qr_online';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    // If testing decline, amount ending in 99 cents can be used or simulated
    const isTestDecline = req.metadata?.simulateDecline === true || req.amountCents === 999999;

    if (isTestDecline) {
      return {
        success: false,
        status: 'declined',
        provider: this.providerName,
        errorMessage: 'Card declined by issuing bank (Sandbox test simulation: Insufficient funds or invalid PIN).',
      };
    }

    const providerTxId = `snd_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const brands = ['Visa Contactless', 'Mastercard PayPass', 'Apple Pay (Visa)', 'Google Wallet (Mastercard)'];
    const chosenBrand = brands[Math.floor(Math.random() * brands.length)];
    const last4 = (Math.floor(1000 + Math.random() * 9000)).toString();

    return {
      success: true,
      status: 'approved',
      provider: this.providerName,
      providerTxId,
      authCode,
      cardBrand: chosenBrand,
      cardLast4: last4,
      deviceInstructions: 'Contactless card read successful. Payment authorized.',
      rawResponse: {
        emvKernel: 'VerifiedBizLink_SoftPOS_Sandbox_v1',
        aid: 'A0000000031010',
        tvr: '0000008000',
        tsi: 'E800',
        cryptogram: '9F260840A81283B47E2B01',
        cvm: 'No CVM Required (Under floor limit)',
      },
    };
  }

  async verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    return {
      verified: true,
      status: 'approved',
      amountCents: 0,
      authCode: 'AUTH999',
      cardBrand: 'Visa Contactless',
      cardLast4: '4242',
      providerTxId: req.providerTxId,
    };
  }

  async refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    return {
      success: true,
      status: 'refunded',
      amountCents: req.amountCents,
      refundTxId: `snd_ref_${Date.now()}`,
    };
  }
}
