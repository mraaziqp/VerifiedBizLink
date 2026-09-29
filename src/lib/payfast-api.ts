import crypto from 'crypto';
import { payfastEnv, payfastEncode } from '@/lib/payfast';

/**
 * PayFast's server API (api.payfast.co.za), for managing a subscription
 * after checkout.
 *
 * The signature here is not the checkout signature: every header and body
 * parameter plus the passphrase is sorted alphabetically, url-encoded the
 * PHP way, and MD5'd. Sandbox uses the live host with ?testing=true.
 *
 * Nothing here claims success unless PayFast says so. A cancellation we
 * could not confirm is reported as a failure, so the caller can ask a person
 * to do it in the PayFast dashboard — a customer charged twice while being
 * told they were not is the outcome this exists to prevent.
 */
function apiSignature(params: Record<string, string>): string {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${payfastEncode(String(params[k]).trim())}`)
    .join('&');
  return crypto.createHash('md5').update(str).digest('hex');
}

export interface PayfastApiResult {
  ok: boolean;
  status: number;
  detail: string;
}

async function callApi(method: 'GET' | 'PUT', path: string): Promise<PayfastApiResult> {
  const merchantId = payfastEnv('PAYFAST_MERCHANT_ID');
  const passphrase = payfastEnv('PAYFAST_PASSPHRASE');
  if (!merchantId || !passphrase) {
    return { ok: false, status: 0, detail: 'PAYFAST_MERCHANT_ID or PAYFAST_PASSPHRASE is not configured' };
  }

  const sandbox = payfastEnv('PAYFAST_URL').includes('sandbox');
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  const headers = { 'merchant-id': merchantId, version: 'v1', timestamp };
  const signature = apiSignature({ ...headers, passphrase });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`https://api.payfast.co.za${path}${sandbox ? '?testing=true' : ''}`, {
      method,
      headers: { ...headers, signature },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const text = (await res.text()).slice(0, 500);
    let code: number | null = null;
    try { code = Number(JSON.parse(text)?.code) || null; } catch { /* not JSON */ }
    const ok = res.ok && (code === null || code === 200);
    return { ok, status: res.status, detail: text };
  } catch (err) {
    return { ok: false, status: 0, detail: err instanceof Error ? err.message : String(err) };
  }
}

/** Cancels a PayFast subscription so it can never charge again. */
export function cancelPayfastSubscription(token: string): Promise<PayfastApiResult> {
  return callApi('PUT', `/subscriptions/${encodeURIComponent(token)}/cancel`);
}

/** Reads a subscription's state at PayFast (status, next run date, amount). */
export function fetchPayfastSubscription(token: string): Promise<PayfastApiResult> {
  return callApi('GET', `/subscriptions/${encodeURIComponent(token)}/fetch`);
}
