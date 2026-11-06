export type PaymentMethodType = 'cash' | 'card_tap' | 'qr_online';

export type PaymentProviderType =
  | 'cash'
  | 'softpos_yoco'
  | 'softpos_realpay'
  | 'apple_tap_to_pay'
  | 'payfast'
  | 'sandbox';

export interface PaymentInitiateRequest {
  saleId: string;
  businessId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethodType;
  tenderAmountCents?: number; // For cash
  idempotencyKey: string;
  customerDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PaymentInitiateResponse {
  success: boolean;
  status: 'approved' | 'pending' | 'requires_action' | 'declined' | 'failed';
  provider: PaymentProviderType;
  providerTxId?: string;
  authCode?: string;
  changeAmountCents?: number;
  cardLast4?: string;
  cardBrand?: string;
  paymentActionUrl?: string; // e.g. for QR / PayFast link
  qrPayload?: string;
  deviceInstructions?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentVerifyRequest {
  saleId: string;
  businessId: string;
  providerTxId: string;
  provider: PaymentProviderType;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  status: 'approved' | 'declined' | 'failed';
  amountCents: number;
  authCode?: string;
  cardLast4?: string;
  cardBrand?: string;
  providerTxId: string;
  errorMessage?: string;
}

export interface PaymentRefundRequest {
  saleId: string;
  businessId: string;
  paymentId: string;
  amountCents: number;
  reason: string;
  actorUserId?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundTxId?: string;
  amountCents: number;
  status: 'refunded' | 'failed';
  errorMessage?: string;
}

export interface PaymentAdapter {
  providerName: PaymentProviderType;
  supportsMethod(method: PaymentMethodType): boolean;
  initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;
  verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse>;
  refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse>;
}
