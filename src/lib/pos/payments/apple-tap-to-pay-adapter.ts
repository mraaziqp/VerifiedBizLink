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
 * Tap to Pay on iPhone. STATUS: AWAITING_APPROVAL.
 *
 * Needs Apple's ProximityReader entitlement AND a payment service provider
 * that supports Tap to Pay on iPhone in South Africa, with each merchant
 * onboarded as that provider's merchant. The previous "production" branch
 * invented an approval and auth code without any card being read. Until a
 * provider integration exists every call refuses.
 */
export class AppleTapToPayAdapter implements PaymentAdapter {
  providerName = 'apple_tap_to_pay' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'card_tap';
  }

  private unavailable(): never {
    throw new PaymentUnavailableError('Tap to Pay on iPhone is not available yet. Use your own card machine and choose "Card (own machine)".');
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
