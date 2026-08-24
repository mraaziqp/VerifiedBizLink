import crypto from 'crypto';

/**
 * PayFast signature generation.
 *
 * PayFast rebuilds the signature from the parameters exactly as it received
 * them, in the order it received them, and compares. Two rules decide whether
 * that comparison succeeds, and breaking either produces the same unhelpful
 * "Generated signature does not match submitted signature" 400:
 *
 *   1. ORDER. The string is built in the order the fields are submitted —
 *      NOT alphabetically. Sorting the keys while the form posts them in
 *      declaration order is the classic way to get a 400 on every payment.
 *
 *   2. BLANKS. Only non-blank variables are included. An empty custom_str1
 *      must be left out of the form and out of the signature, not sent as
 *      an empty string.
 *
 * The encoding must match PHP's urlencode(), which is what PayFast uses:
 * spaces become '+', and !'()*~ are escaped — none of which
 * encodeURIComponent does on its own.
 */

/**
 * Reads a PayFast setting, stripping the invisible damage env values pick up.
 *
 * A byte-order mark or a trailing newline in front of a passphrase is
 * impossible to see in a console and changes the MD5 completely, so every
 * payment is rejected with "Generated signature does not match" and nothing
 * about the error points at the cause. This deployment has had exactly that
 * happen to a secret before, so the values are cleaned on the way in.
 */
export function payfastEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) return '';
  return raw.replace(/[\uFEFF\u200B-\u200D]/g, '').trim();
}

/** True when a value carried characters that would have broken signing. */
export function payfastEnvWasDirty(name: string): boolean {
  const raw = process.env[name];
  if (!raw) return false;
  return raw !== raw.replace(/[\uFEFF\u200B-\u200D]/g, '').trim();
}

/** PHP urlencode() equivalent. */
export function payfastEncode(value: unknown): string {
  return encodeURIComponent(String(value ?? ''))
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E');
}

/**
 * The order PayFast documents for the payment form. The checkout form must
 * post its fields in this order and the signature must be built in the same
 * order, so both come from this one list.
 */
export const PAYFAST_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles',
] as const;

/** Drops blank values and returns the fields in PayFast's documented order. */
export function orderPayfastFields(
  data: Record<string, string | number | undefined | null>,
): Record<string, string> {
  const ordered: Record<string, string> = {};
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str === '') continue; // blanks are excluded, not sent empty
    ordered[key] = str;
  }
  return ordered;
}

/**
 * Signs an already-ordered set of fields.
 *
 * Pass entries straight from the request when validating an incoming ITN, so
 * the original POST order is preserved — re-ordering a received notification
 * would compare a string PayFast never generated.
 */
export function signPayfast(
  entries: Iterable<[string, string]>,
  passphrase?: string,
  options: { includeBlanks?: boolean } = {},
): string {
  const { includeBlanks = false } = options;
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (key === 'signature') continue;
    const str = String(value ?? '').trim();
    if (str === '' && !includeBlanks) continue;
    parts.push(`${key}=${payfastEncode(str)}`);
  }

  let dataString = parts.join('&');
  if (passphrase) {
    dataString += `&passphrase=${payfastEncode(passphrase)}`;
  }

  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * Verifies the signature on an incoming ITN.
 *
 * PayFast is asymmetric here, and getting it backwards is silent. The
 * checkout form must EXCLUDE blank variables; the ITN validation they
 * document INCLUDES every posted variable except the signature, empty ones
 * as "key=". A real notification carries around a dozen empty fields
 * (custom_str4, custom_int1-5, name_last, token …), so signing it the way
 * the outgoing form is signed can never match — every genuine payment gets
 * a 403 and the customer's money sits in PayFast with nothing updated.
 *
 * Both variants are computed with the secret passphrase, so accepting
 * either tolerates PayFast's ambiguity without weakening anything: an
 * attacker still cannot produce either without the passphrase.
 */
export function verifyItnSignature(
  entries: Iterable<[string, string]>,
  received: string,
  passphrase?: string,
): { valid: boolean; variant: 'with-blanks' | 'without-blanks' | null } {
  const all = [...entries];
  const supplied = String(received ?? '').trim().toLowerCase();
  if (!supplied) return { valid: false, variant: null };

  const withBlanks = signPayfast(all, passphrase, { includeBlanks: true });
  if (withBlanks === supplied) return { valid: true, variant: 'with-blanks' };

  const withoutBlanks = signPayfast(all, passphrase, { includeBlanks: false });
  if (withoutBlanks === supplied) return { valid: true, variant: 'without-blanks' };

  return { valid: false, variant: null };
}
