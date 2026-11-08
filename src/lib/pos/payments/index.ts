import { PaymentAdapter, PaymentMethodType, PaymentProviderType, PaymentUnavailableError } from './types';
import { CashPaymentAdapter } from './cash-adapter';
import { ExternalTerminalAdapter } from './external-terminal-adapter';
import { SandboxPaymentAdapter } from './sandbox-adapter';
import { SoftPosPaymentAdapter } from './softpos-adapter';
import { AppleTapToPayAdapter } from './apple-tap-to-pay-adapter';
import { PayFastPaymentAdapter } from './payfast-adapter';
import { isPaymentMethodEnabled, sandboxAllowed } from './config';

export * from './types';
export * from './config';

const cashAdapter = new CashPaymentAdapter();
const externalAdapter = new ExternalTerminalAdapter();
const sandboxAdapter = new SandboxPaymentAdapter();
const softPosAdapter = new SoftPosPaymentAdapter();
const appleTapToPayAdapter = new AppleTapToPayAdapter();
const payFastAdapter = new PayFastPaymentAdapter();

/** The adapter that processed an existing payment (for refunds). */
export function getPaymentAdapter(provider: PaymentProviderType | string): PaymentAdapter {
  switch (provider) {
    case 'cash':
      return cashAdapter;
    case 'external_terminal':
      return externalAdapter;
    case 'softpos_yoco':
    case 'softpos_realpay':
      return softPosAdapter;
    case 'apple_tap_to_pay':
      return appleTapToPayAdapter;
    case 'payfast':
      return payFastAdapter;
    case 'sandbox':
      return sandboxAdapter; // refuses outside development
    default:
      throw new PaymentUnavailableError(`Unknown payment provider "${provider}".`);
  }
}

/**
 * Picks the adapter for a new sale. The caller cannot ask for the sandbox:
 * it is chosen only when the environment allows it, and never in production.
 * There is no fallback — an unavailable method throws.
 */
export function resolveAdapterForMethod(
  method: PaymentMethodType,
  options?: { isIos?: boolean; isAndroid?: boolean },
): PaymentAdapter {
  if (!isPaymentMethodEnabled(method)) {
    throw new PaymentUnavailableError(`Payment method "${method}" is not available.`);
  }
  switch (method) {
    case 'cash':
      return cashAdapter;
    case 'card_external':
      return externalAdapter;
    case 'card_tap':
      if (sandboxAllowed()) return sandboxAdapter;
      return options?.isIos ? appleTapToPayAdapter : softPosAdapter;
    case 'qr_online':
      return payFastAdapter;
    default:
      throw new PaymentUnavailableError(`Payment method "${String(method)}" is not supported.`);
  }
}
