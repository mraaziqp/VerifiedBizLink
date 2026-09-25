import { eq, or, ilike, sql } from 'drizzle-orm';
import { db } from '../index';
import { businesses } from '../schema';

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
 * Normalizes input string to canonical certificate format: VBL-YYYY-XXXX-XXXX
 */
export function sanitizeCertificateString(input: string): string {
  if (!input) return '';
  const bare = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Format: VBL + 4 digit year + 4 characters + 4 characters
  const m1 = bare.match(/^VBL(\d{4})([A-Z0-9]{4})([A-Z0-9]{4})$/);
  if (m1) {
    return `VBL-${m1[1]}-${m1[2]}-${m1[3]}`;
  }

  // Format: VBL + 4 digit year + 4 characters
  const m2 = bare.match(/^VBL(\d{4})([A-Z0-9]{4})$/);
  if (m2) {
    return `VBL-${m2[1]}-${m2[2]}`;
  }

  // Fallback with dashes if already starts with VBL
  if (bare.startsWith('VBL') && bare.length > 7) {
    return `VBL-${bare.slice(3, 7)}-${bare.slice(7, 11)}${bare.length > 11 ? `-${bare.slice(11, 15)}` : ''}`;
  }

  return bare;
}

/**
 * Strict Drizzle ORM query to verify a certificate by serial or certificate code string.
 * Supports exact string matching as well as normalized sanitization.
 */
export async function verifyCertificateByString(rawInput: string): Promise<VerifiedCertificateResult | null> {
  if (!rawInput || !rawInput.trim()) return null;

  const sanitized = sanitizeCertificateString(rawInput);
  const trimmed = rawInput.trim();

  try {
    const records = await db
      .select({
        id: businesses.id,
        companyName: businesses.companyName,
        regNumber: businesses.regNumber,
        status: businesses.status,
        trustScore: businesses.trustScore,
        certificateSerial: businesses.certificateSerial,
        verifiedAt: businesses.verifiedAt,
      })
      .from(businesses)
      .where(
        or(
          eq(businesses.certificateSerial, trimmed),
          eq(businesses.certificateSerial, sanitized),
          ilike(businesses.certificateSerial, `%${sanitized}%`),
          eq(sql`REPLACE(UPPER(${businesses.certificateSerial}), '-', '')`, sanitized.replace(/-/g, ''))
        )
      )
      .limit(1);

    if (!records || records.length === 0) {
      return {
        valid: false,
        businessId: '',
        companyName: '',
        regNumber: null,
        status: 'unverified',
        trustScore: 0,
        serial: sanitized,
        verifiedAt: null,
        formattedSerial: sanitized,
        error: 'Certificate not found in registry',
      };
    }

    const b = records[0];
    const isVerified = b.status === 'verified';

    return {
      valid: isVerified,
      businessId: b.id,
      companyName: b.companyName,
      regNumber: b.regNumber,
      status: b.status || 'unregistered',
      trustScore: b.trustScore || 0,
      serial: b.certificateSerial || sanitized,
      verifiedAt: b.verifiedAt,
      formattedSerial: b.certificateSerial || sanitized,
    };
  } catch (error) {
    console.error('verifyCertificateByString error:', error);
    return null;
  }
}
