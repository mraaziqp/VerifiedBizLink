/**
 * Starts a PayFast checkout from the browser.
 *
 * Every purchase surface used to build this form itself — four copies of the
 * same loop. That matters more than ordinary duplication here: PayFast
 * rebuilds the signature from the fields IN THE ORDER THEY ARE POSTED, so a
 * copy that iterates differently, adds a field, or reorders anything breaks
 * every payment through that one page with a 400 that says only "Generated
 * signature does not match submitted signature".
 *
 * The server returns the fields already ordered and signed. This posts them
 * in exactly that order and nothing else.
 */
export interface CheckoutRequest {
  amount: number;
  description: string;
  purchaseType: string;
  adId?: string | null;
}

export interface CheckoutFailure {
  ok: false;
  error: string;
}

/**
 * Resolves only on failure — a success navigates away from the page, so
 * callers should leave their loading state on and let the redirect happen.
 */
export async function startPayfastCheckout(
  payload: CheckoutRequest,
): Promise<CheckoutFailure> {
  let data: {
    payfastUrl?: string;
    data?: Record<string, string>;
    signature?: string;
    error?: string;
  };

  try {
    const res = await fetch('/api/payfast/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Could not start the payment.' };
    }
  } catch {
    return { ok: false, error: 'Could not reach the payment server.' };
  }

  if (!data.payfastUrl || !data.data || !data.signature) {
    return { ok: false, error: 'The payment gateway returned an incomplete response.' };
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.payfastUrl;

  // Object key order is insertion order, and the server built the signature
  // over exactly this sequence. Do not sort, filter or add to it.
  for (const [name, value] of Object.entries(data.data)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }

  const signature = document.createElement('input');
  signature.type = 'hidden';
  signature.name = 'signature';
  signature.value = data.signature;
  form.appendChild(signature);

  document.body.appendChild(form);
  form.submit();

  return { ok: false, error: '' }; // unreachable in practice; the page navigates
}
