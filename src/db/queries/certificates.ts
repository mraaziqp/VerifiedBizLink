import { extractSerial } from '@/lib/certificate-serial';
import { verifySerial } from '@/lib/certificates';

/**
 * Certificate lookup by the string someone typed or scanned.
 *
 * This used to run its own query against businesses.certificate_serial — a
 * column that does not exist in the live database — and never checked a
 * signature, so it could neither find a genuine certificate nor catch a
 * forged one. There is now ONE verification path: lib/certificates
 * verifySerial(), which reads the signed certificates table, checks the
 * HMAC and the business's live status, and is covered by tests. This module
 * keeps the original function names and result shape for callers.
 */

export interface VerifiedCertificateResult {
  valid: boolean;
  businessId: string;
  companyName: string;
  regNumber: string | null;
  status: string;
  trustScore: number;
  serial: string;
  verifiedAt: Date | null;
  formattedSerial: string;
  error?: string;
}

/**
 * Normalises any typed or pasted form to the canonical VBL-YYYY-XXXX-XXXX:
 * lower case, missing or extra dashes and spaces, or a full verify URL.
 * Returns '' when the input cannot be a certificate number.
 */
export function sanitizeCertificateString(input: string): string {
  return extractSerial(input) ?? '';
}

/**
 * Verifies a certificate string. Returns null only when the registry could
 * not be reached — never "invalid" for a database error, which would call a
 * genuine certificate fake.
 */
export async function verifyCertificateByString(rawInput: string): Promise<VerifiedCertificateResult | null> {
  const serial = sanitizeCertificateString(rawInput);
  const empty = {
    valid: false, businessId: '', companyName: '', regNumber: null, status: 'unverified',
    trustScore: 0, serial, verifiedAt: null, formattedSerial: serial,
  };
  if (!serial) return { ...empty, error: 'Not a certificate number (expected VBL-YYYY-XXXX-XXXX)' };

  try {
    const r = await verifySerial(serial);
    return {
      valid: r.outcome === 'valid',
      businessId: r.businessId ?? '',
      companyName: r.companyName ?? '',
      regNumber: r.regNumber,
      status: r.outcome === 'valid' ? 'verified' : (r.currentStatus ?? r.outcome),
      trustScore: 0,
      serial: r.serial,
      verifiedAt: r.verifiedSince ? new Date(r.verifiedSince) : null,
      formattedSerial: r.serial,
      ...(r.outcome === 'valid' ? {} : { error: r.message }),
    };
  } catch (error) {
    console.error('verifyCertificateByString: registry unavailable', error);
    return null;
  }
}
