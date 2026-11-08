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
 * A card payment taken on the merchant's own card machine (Yoco, a bank
 * speedpoint, SnapScan…). The merchant's provider settles the money straight
 * to the merchant; VerifiedBizLink only records the sale. The cashier
 * confirms the machine approved it and may type in the machine's reference.
 *
 * Reported as "card (own machine) — confirmed by merchant" everywhere, never
 * as a verified electronic payment.
 */
export class ExternalTerminalAdapter implements PaymentAdapter {
  providerName = 'external_terminal' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'card_external';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const reference = (req.externalReference || '').trim().slice(0, 64);
    return {
      success: true,
      status: 'approved',
      provider: this.providerName,
      providerTxId: reference || undefined,
      authCode: reference || undefined,
      rawResponse: { confirmedBy: 'merchant', reference: reference || null },
    };
  }

  async verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    return { verified: true, status: 'approved', amountCents: 0, providerTxId: req.providerTxId };
  }

  async refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    return {
      success: true,
      status: 'manual',
      amountCents: req.amountCents,
      instructions: `Refund R${(req.amountCents / 100).toFixed(2)} on your card machine — VerifiedBizLink cannot reach it.`,
    };
  }
}
