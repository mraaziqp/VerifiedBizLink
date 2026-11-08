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
import { sandboxAllowed } from './config';

/**
 * Simulated card approvals for local development ONLY.
 *
 * Every method refuses to run unless sandboxAllowed() — which is always false
 * in a production build — so a sandbox approval can never be recorded as a
 * real payment, whatever a request asks for.
 */
export class SandboxPaymentAdapter implements PaymentAdapter {
  providerName = 'sandbox' as const;

  private guard() {
    if (!sandboxAllowed()) {
      throw new PaymentUnavailableError('The payment sandbox is not available in this environment.');
    }
  }

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'card_tap' || method === 'qr_online';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    this.guard();
    if (req.metadata?.simulateDecline === true || req.amountCents === 999999) {
      return {
        success: false,
        status: 'declined',
        provider: this.providerName,
        errorMessage: 'Card declined (sandbox simulation).',
      };
    }
    return {
      success: true,
      status: 'approved',
      provider: this.providerName,
      providerTxId: `snd_${req.saleId}`,
      authCode: 'SANDBOX',
      cardBrand: 'Sandbox Visa',
      cardLast4: '4242',
      deviceInstructions: 'SANDBOX — no money moved.',
      rawResponse: { sandbox: true },
    };
  }

  async verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    this.guard();
    return { verified: true, status: 'approved', amountCents: 0, providerTxId: req.providerTxId };
  }

  async refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    this.guard();
    return { success: true, status: 'refunded', amountCents: req.amountCents, refundTxId: `snd_ref_${req.saleId}_${Date.now()}` };
  }
}
