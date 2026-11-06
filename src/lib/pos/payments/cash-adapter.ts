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

export class CashPaymentAdapter implements PaymentAdapter {
  providerName = 'cash' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'cash';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const tender = req.tenderAmountCents ?? req.amountCents;

    if (tender < req.amountCents) {
      return {
        success: false,
        status: 'declined',
        provider: this.providerName,
        errorMessage: `Tendered amount (R${(tender / 100).toFixed(2)}) is less than total due (R${(req.amountCents / 100).toFixed(2)}).`,
      };
    }

    const change = tender - req.amountCents;
    const providerTxId = `cash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      success: true,
      status: 'approved',
      provider: this.providerName,
      providerTxId,
      changeAmountCents: change,
      deviceInstructions: change > 0 ? `Please give customer R${(change / 100).toFixed(2)} change.` : 'Exact amount tendered.',
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
      refundTxId: `cash_ref_${Date.now()}`,
    };
  }
}
