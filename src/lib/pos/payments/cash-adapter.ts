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

/** Cash at the till. The cashier is the payment processor. */
export class CashPaymentAdapter implements PaymentAdapter {
  providerName = 'cash' as const;

  supportsMethod(method: PaymentMethodType): boolean {
    return method === 'cash';
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const tender = req.tenderAmountCents ?? req.amountCents;

    if (!Number.isInteger(tender) || tender < req.amountCents) {
      return {
        success: false,
        status: 'declined',
        provider: this.providerName,
        errorMessage: `Tendered amount (R${(tender / 100).toFixed(2)}) is less than total due (R${(req.amountCents / 100).toFixed(2)}).`,
      };
    }

    const change = tender - req.amountCents;
    return {
      success: true,
      status: 'approved',
      provider: this.providerName,
      providerTxId: `cash_${req.saleId}`,
      changeAmountCents: change,
      deviceInstructions: change > 0 ? `Give the customer R${(change / 100).toFixed(2)} change.` : 'Exact amount tendered.',
    };
  }

  async verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    // A cash sale is confirmed by the cashier at the moment of sale.
    return { verified: true, status: 'approved', amountCents: 0, providerTxId: req.providerTxId };
  }

  async refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    return {
      success: true,
      status: 'manual',
      amountCents: req.amountCents,
      refundTxId: `cash_ref_${req.saleId}_${Date.now()}`,
      instructions: `Give the customer R${(req.amountCents / 100).toFixed(2)} back from the cash drawer.`,
    };
  }
}
