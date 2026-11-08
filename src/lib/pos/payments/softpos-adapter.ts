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

/**
 * Tap-on-phone for Android (SoftPOS). STATUS: AWAITING_APPROVAL.
 *
 * The previous version returned simulated approvals whenever keys were
 * missing, and otherwise called a card-charge API with no card token, which
 * would have charged VerifiedBizLink's own account. A real SoftPOS needs:
 *   1. a signed contract with a certified SoftPOS provider in which each
 *      merchant is onboarded (KYC) as the provider's sub-merchant, so money
 *      settles to the merchant, not to VerifiedBizLink;
 *   2. the provider's native SDK inside the Capacitor Android app (the card
 *      read happens on-device, never in this server);
 *   3. a server-side verify call / signed webhook from that provider.
 * Until then every call refuses.
 */
export class SoftPosPaymentAdapter implements PaymentAdapter {
  providerName = 'softpos_yoco' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'card_tap';
  }

  private unavailable(): never {
    throw new PaymentUnavailableError('Tap on phone is not available yet. Use your own card machine and choose "Card (own machine)".');
  }

  async initiate(_req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    this.unavailable();
  }

  async verify(_req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    this.unavailable();
  }

  async refund(_req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    this.unavailable();
  }
}
