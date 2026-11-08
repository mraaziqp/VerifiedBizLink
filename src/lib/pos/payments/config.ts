import type { PaymentMethodType } from './types';

/**
 * Which payment paths this deployment may use. Server-side only — the
 * browser is told the result, it never chooses.
 *
 * POS_ALLOW_SANDBOX
 *   Simulated card approvals for local development. Ignored completely when
 *   NODE_ENV is 'production': there is no way to reach the sandbox in a
 *   production build, whatever the request or the environment says.
 *
 * POS_PLATFORM_COLLECTION_APPROVED   (Decision Gate 1)
 *   Allows POS payments to be collected into VerifiedBizLink's PayFast
 *   account. Leave unset until PayFast has approved, in writing, a settlement
 *   arrangement for collecting on behalf of independent merchants. Until then
 *   merchants take card payments on their own machines (card_external).
 *
 * POS_SOFTPOS_ENABLED
 *   Tap-on-phone. No provider integration exists yet; enabling it only makes
 *   the method visible, and the adapter refuses every charge until one is
 *   built against a signed provider contract.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function sandboxAllowed(): boolean {
  return !isProduction() && process.env.POS_ALLOW_SANDBOX === 'true';
}

export function platformCollectionApproved(): boolean {
  return process.env.POS_PLATFORM_COLLECTION_APPROVED === 'true';
}

export function softPosEnabled(): boolean {
  return process.env.POS_SOFTPOS_ENABLED === 'true';
}

export interface PaymentMethodAvailability {
  method: PaymentMethodType;
  enabled: boolean;
  label: string;
  /** Why a method is off, for the settings screen. */
  status: 'live' | 'sandbox' | 'awaiting_approval';
  note?: string;
}

export function paymentMethodAvailability(): PaymentMethodAvailability[] {
  const sandbox = sandboxAllowed();
  return [
    { method: 'cash', enabled: true, label: 'Cash', status: 'live' },
    {
      method: 'card_external',
      enabled: true,
      label: 'Card (own machine)',
      status: 'live',
      note: 'Charge the card on your own card machine, then record it here.',
    },
    // No live tap-on-phone integration exists, so outside the dev sandbox
    // this stays off even when POS_SOFTPOS_ENABLED is set.
    sandbox
      ? { method: 'card_tap', enabled: true, label: 'Tap on phone', status: 'sandbox' }
      : { method: 'card_tap', enabled: false, label: 'Tap on phone', status: 'awaiting_approval', note: softPosEnabled() ? 'Enabled by configuration, but no provider integration is built yet.' : 'Coming soon — awaiting a payment-provider agreement.' },
    platformCollectionApproved() || sandbox
      ? { method: 'qr_online', enabled: true, label: 'QR / payment link', status: platformCollectionApproved() ? 'live' : 'sandbox' }
      : { method: 'qr_online', enabled: false, label: 'QR / payment link', status: 'awaiting_approval', note: 'Coming soon — awaiting a payment-provider settlement agreement.' },
  ];
}

export function isPaymentMethodEnabled(method: PaymentMethodType): boolean {
  return paymentMethodAvailability().some((m) => m.method === method && m.enabled);
}
