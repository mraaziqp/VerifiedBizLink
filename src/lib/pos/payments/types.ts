/**
 * How a sale is paid.
 *
 * - cash           Notes and coins at the till.
 * - card_external  Card paid on the merchant's OWN card machine (Yoco, bank
 *                  speedpoint, …). The money never touches VerifiedBizLink;
 *                  the till records the sale and the machine's reference.
 * - card_tap       Tap on the phone itself (SoftPOS / Tap to Pay on iPhone).
 *                  AWAITING_APPROVAL: needs a provider contract.
 * - qr_online      A PayFast payment link / QR. Today that would land in
 *                  VerifiedBizLink's own PayFast account, so it is disabled
 *                  until a provider-approved settlement arrangement exists
 *                  (Decision Gate 1).
 */
export type PaymentMethodType = 'cash' | 'card_external' | 'card_tap' | 'qr_online';

export const ALL_PAYMENT_METHODS: PaymentMethodType[] = ['cash', 'card_external', 'card_tap', 'qr_online'];

export type PaymentProviderType =
  | 'cash'
  | 'external_terminal'
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
  externalReference?: string; // For card_external
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
  status: 'refunded' | 'failed' | 'manual';
  /** Shown to the cashier, e.g. "Refund R50 on your card machine". */
  instructions?: string;
  errorMessage?: string;
}

export interface PaymentAdapter {
  providerName: PaymentProviderType;
  supportsMethod(method: PaymentMethodType): boolean;
  initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;
  verify(req: PaymentVerifyRequest): Promise<PaymentVerifyResponse>;
  refund(req: PaymentRefundRequest): Promise<PaymentRefundResponse>;
}

/**
 * Thrown when a payment path is not available in this environment: not
 * configured, awaiting provider approval, or a sandbox in production. Never
 * caught and turned into a success.
 */
export class PaymentUnavailableError extends Error {
  readonly code = 'PAYMENT_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'PaymentUnavailableError';
  }
}
