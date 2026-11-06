import { PaymentAdapter, PaymentMethodType, PaymentProviderType } from './types';
import { CashPaymentAdapter } from './cash-adapter';
import { SandboxPaymentAdapter } from './sandbox-adapter';
import { SoftPosPaymentAdapter } from './softpos-adapter';
import { AppleTapToPayAdapter } from './apple-tap-to-pay-adapter';
import { PayFastPaymentAdapter } from './payfast-adapter';

export * from './types';

const cashAdapter = new CashPaymentAdapter();
const sandboxAdapter = new SandboxPaymentAdapter();
const softPosAdapter = new SoftPosPaymentAdapter();
const appleTapToPayAdapter = new AppleTapToPayAdapter();
const payFastAdapter = new PayFastPaymentAdapter();

export function getPaymentAdapter(provider: PaymentProviderType): PaymentAdapter {
  switch (provider) {
    case 'cash':
      return cashAdapter;
    case 'softpos_yoco':
    case 'softpos_realpay':
      return softPosAdapter;
    case 'apple_tap_to_pay':
      return appleTapToPayAdapter;
    case 'payfast':
      return payFastAdapter;
    case 'sandbox':
    default:
      return sandboxAdapter;
  }
}

export function resolveAdapterForMethod(
  method: PaymentMethodType,
  options?: { isIos?: boolean; isAndroid?: boolean; useSandbox?: boolean }
): PaymentAdapter {
  if (method === 'cash') {
    return cashAdapter;
  }

  if (options?.useSandbox) {
    return sandboxAdapter;
  }

  if (method === 'card_tap') {
    if (options?.isIos) {
      return appleTapToPayAdapter;
    }
    if (options?.isAndroid) {
      return softPosAdapter;
    }
    // Web desktop/browser simulation or sandbox fallback
    return sandboxAdapter;
  }

  if (method === 'qr_online') {
    return payFastAdapter;
  }

  return sandboxAdapter;
}
