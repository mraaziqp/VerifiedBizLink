import crypto from 'crypto';
import db from '@/lib/db';
import { extractSerial, SERIAL_PATTERN } from '@/lib/certificate-serial';

/**
 * Verification certificates that can be checked rather than believed.
 *
 * A certificate is a printed claim about a business, handed to people who have
 * no reason to trust whoever handed it to them. Two separate questions have to
 * be answerable, and conflating them is how certificate systems fail:
 *
 *   Did WE issue this?      answered by the signature over a stored snapshot
 *   Is it still TRUE?       answered by looking the business up right now
 *
 * A genuine certificate for a business that has since lost its badge must read
 * as no longer valid, and a forged serial must fail even if the business named
 * on it really is verified. Checking only one of the two gets both wrong.
 */

type Row = Record<string, unknown>;

/**
 * No I/O/0/1 — serials get read aloud over the phone, copied off a printed
 * page, and typed by someone who cannot ask which character it was.
 */
const SERIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function signingSecret(): string {
  const dedicated = process.env.CERTIFICATE_SIGNING_SECRET?.trim();
  if (dedicated) return dedicated;

  // Falling back to the session secret keeps certificates working on a
  // deployment that has not set a dedicated one, rather than issuing
  // documents nobody can verify. Both are server-side secrets of the same
  // sensitivity, and neither is ever sent to a browser.
  const fallback = process.env.JWT_SECRET?.trim();
  if (fallback) return fallback;

  throw new Error(
    'No CERTIFICATE_SIGNING_SECRET or JWT_SECRET is set — certificates cannot be signed or verified.',
  );
}

/** Human-transcribable: VBL-2026-K7QM-4XPD */
export function generateSerial(now = new Date()): string {
  const block = (n: number) =>
    Array.from(crypto.randomBytes(n))
      .map((b) => SERIAL_ALPHABET[b % SERIAL_ALPHABET.length])
      .join('');
  return `VBL-${now.getFullYear()}-${block(4)}-${block(4)}`;
}

/** Accepts the serial in any case, with or without its dashes, or as a pasted verify link. */
export function normaliseSerial(input: string): string {
  return extractSerial(input) ?? String(input ?? '').trim().toUpperCase();
}

/** Postgres "relation does not exist": the certificates table was never migrated. */
function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === '42P01' || /relation "?certificates"? does not exist/i.test(String(e?.message ?? ''));
}

let schemaReady: Promise<void> | null = null;

/**
 * Creates the certificates table if a deployment never ran migration v14.
 *
 * Without it the first download on such a deployment failed with a bare 500,
 * which is the worst possible place to discover a missing migration. Mirrors
 * the definition in /api/setup/migrate; every statement is IF NOT EXISTS, and
 * it runs once per server instance.
 */
export function ensureCertificatesTable(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS certificates (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          serial          TEXT NOT NULL UNIQUE,
          business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          company_name    TEXT NOT NULL,
          reg_number      TEXT,
          badge_source    TEXT,
          signature       TEXT NOT NULL,
          issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          issued_by       UUID,
          revoked_at      TIMESTAMPTZ,
          revoke_reason   TEXT,
          verify_count    INTEGER NOT NULL DEFAULT 0,
          last_verified_at TIMESTAMPTZ
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS certificates_business_idx ON certificates (business_id)`;
      await db`
        CREATE UNIQUE INDEX IF NOT EXISTS certificates_one_active_idx
        ON certificates (business_id) WHERE revoked_at IS NULL
      `;
    })().catch((error) => {
      // Let the next request try again instead of caching the failure.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export interface CertificatePayload {
  serial: string;
  businessId: string;
  companyName: string;
  regNumber: string | null;
  issuedAt: string;
}

/**
 * Separates the signed fields.
 *
 * It must be a character that cannot occur in a company name, registration
 * number or date, or ("AB", "C") and ("A", "BC") would produce the same string
 * and two different businesses could share one signature. A space will not do:
 * company names are full of them.
 *
 * Written as an escape rather than typed literally, because an invisible
 * control character in source is precisely what an editor or a copy-paste
 * silently eats — and if this ever changed, every certificate already issued
 * would stop verifying at once.
 */
const SEPARATOR = '\u001F';

/** The exact bytes that get signed. */
function canonical(p: CertificatePayload): string {
  return [
    p.serial,
    p.businessId,
    p.companyName.trim(),
    (p.regNumber ?? '').trim(),
    p.issuedAt,
  ].join(SEPARATOR);
}

export function signCertificate(payload: CertificatePayload): string {
  return crypto.createHmac('sha256', signingSecret()).update(canonical(payload)).digest('hex');
}

/**
 * Every secret a genuine certificate may have been signed with: the current
 * one first, then JWT_SECRET. Until CERTIFICATE_SIGNING_SECRET reached the
 * Amplify runtime, certificates were signed with the JWT_SECRET fallback;
 * accepting it keeps those valid after the dedicated secret is switched on.
 */
function verificationSecrets(): string[] {
  const secrets = [signingSecret(), process.env.JWT_SECRET?.trim()].filter((s): s is string => Boolean(s));
  return [...new Set(secrets)];
}

/** Constant-time, so a wrong signature cannot be found one character at a time. */
export function signatureMatches(payload: CertificatePayload, signature: string): boolean {
  const b = Buffer.from(String(signature ?? ''), 'utf8');
  let ok = false;
  for (const secret of verificationSecrets()) {
    const a = Buffer.from(crypto.createHmac('sha256', secret).update(canonical(payload)).digest('hex'), 'utf8');
    // No early exit: every candidate is compared, so timing doesn't reveal which key matched.
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}

/**
 * A short code printed on the certificate beside the serial.
 *
 * The serial says which certificate; this says the serial was not swapped onto
 * a different document. Someone comparing a printed page against the website
 * can check eight characters by eye without scanning anything.
 */
export function shortCheckCode(signature: string): string {
  return signature.slice(0, 8).toUpperCase().replace(/(.{4})(.{4})/, '$1-$2');
}

export type VerificationOutcome =
  | 'valid'
  | 'not_found'
  | 'revoked'
  | 'no_longer_verified'
  | 'tampered';

export interface VerificationResult {
  outcome: VerificationOutcome;
  serial: string;
  companyName: string | null;
  regNumber: string | null;
  issuedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  /** The business's status right now, which may differ from issue time. */
  currentStatus: string | null;
  businessId: string | null;
  verifiedSince: string | null;
  checkCode: string | null;
  message: string;
}

const MESSAGES: Record<VerificationOutcome, string> = {
  valid: 'This certificate is genuine and the business is verified.',
  not_found: 'No certificate with this number has ever been issued.',
  revoked: 'This certificate was withdrawn and is no longer valid.',
  no_longer_verified: 'This certificate was genuine, but the business is no longer verified.',
  tampered: 'This certificate does not match what was issued. Treat it as forged.',
};

function result(outcome: VerificationOutcome, serial: string, extra: Partial<VerificationResult> = {}): VerificationResult {
  return {
    outcome,
    serial,
    companyName: null,
    regNumber: null,
    issuedAt: null,
    revokedAt: null,
    revokeReason: null,
    currentStatus: null,
    businessId: null,
    verifiedSince: null,
    checkCode: null,
    message: MESSAGES[outcome],
    ...extra,
  };
}

/**
 * Checks a serial. Public — this is what a QR scan lands on, so it must be
 * answerable by someone with no account.
 *
 * `countScan` records that a check happened. It is off for internal callers so
 * an admin previewing a certificate does not inflate a business's numbers.
 */
export async function verifySerial(input: string, { countScan = false } = {}): Promise<VerificationResult> {
  const serial = normaliseSerial(input);
  if (!SERIAL_PATTERN.test(serial)) {
    return result('not_found', serial);
  }

  // A failed query must NOT read as "not found". That told whoever was
  // holding a genuine certificate that it had never been issued — i.e. that it
  // was fake — whenever the database had a blip. Callers turn a throw into
  // "the check is unavailable, try again". Only a missing table is a true
  // "nothing has ever been issued".
  let rows: Row[];
  try {
    rows = (await db`
      SELECT c.serial, c.business_id, c.company_name, c.reg_number, c.signature,
             c.issued_at, c.revoked_at, c.revoke_reason,
             b.status AS current_status, b.verified_at, b.company_name AS current_name
      FROM certificates c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.serial = ${serial}
      LIMIT 1
    `) as unknown as Row[];
  } catch (error) {
    if (isMissingTable(error)) return result('not_found', serial);
    throw error;
  }

  if (rows.length === 0) return result('not_found', serial);
  const c = rows[0];

  const payload: CertificatePayload = {
    serial: String(c.serial),
    businessId: String(c.business_id),
    companyName: String(c.company_name ?? ''),
    regNumber: (c.reg_number as string) ?? null,
    issuedAt: new Date(c.issued_at as string).toISOString(),
  };

  const common = {
    companyName: String(c.company_name ?? ''),
    regNumber: (c.reg_number as string) ?? null,
    issuedAt: new Date(c.issued_at as string).toISOString(),
    revokedAt: c.revoked_at ? new Date(c.revoked_at as string).toISOString() : null,
    revokeReason: (c.revoke_reason as string) ?? null,
    currentStatus: (c.current_status as string) ?? null,
    businessId: String(c.business_id),
    verifiedSince: c.verified_at ? new Date(c.verified_at as string).toISOString() : null,
    checkCode: shortCheckCode(String(c.signature)),
  };

  // Checked before anything else: a row whose signature does not match its own
  // contents means the database was edited around the application.
  if (!signatureMatches(payload, String(c.signature))) {
    return result('tampered', serial, common);
  }

  if (c.revoked_at) return result('revoked', serial, common);
  if (c.current_status !== 'verified') return result('no_longer_verified', serial, common);

  if (countScan) {
    await db`
      UPDATE certificates
      SET verify_count = verify_count + 1, last_verified_at = NOW()
      WHERE serial = ${serial}
    `.catch(() => {});
  }

  return result('valid', serial, common);
}

export interface IssueResult {
  serial: string;
  checkCode: string;
  issuedAt: string;
  reissued: boolean;
}

/**
 * Issues a certificate, replacing any live one for that business.
 *
 * Reissuing revokes the previous serial rather than leaving both valid: if a
 * business renames and prints a new certificate, the old page bearing the old
 * name must stop verifying, or the rename achieved nothing.
 */
export async function issueCertificate(
  businessId: string,
  issuedBy?: string | null,
): Promise<IssueResult> {
  const rows = (await db`
    SELECT id, company_name, reg_number, status, badge_source
    FROM businesses WHERE id = ${businessId} LIMIT 1
  `) as unknown as Row[];

  if (rows.length === 0) throw new Error('No such business');
  const biz = rows[0];
  if (biz.status !== 'verified') {
    throw new Error('Only a verified business can be issued a certificate');
  }

  await ensureCertificatesTable();

  // Not swallowed: treating a failed read as "no live certificate" would skip
  // the revoke below and leave the old serial valid alongside the new one.
  const [existing] = (await db`
    SELECT serial FROM certificates WHERE business_id = ${businessId} AND revoked_at IS NULL LIMIT 1
  `) as unknown as Row[];

  if (existing) {
    await db`
      UPDATE certificates
      SET revoked_at = NOW(), revoke_reason = 'Replaced by a newly issued certificate'
      WHERE serial = ${existing.serial}
    `;
  }

  const issuedAtDate = new Date();
  const issuedAt = issuedAtDate.toISOString();

  // Retried rather than assumed unique: the column has a unique index, and a
  // collision must not surface to a user as a failed download.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const serial = generateSerial(issuedAtDate);
    const payload: CertificatePayload = {
      serial,
      businessId: String(biz.id),
      companyName: String(biz.company_name ?? ''),
      regNumber: (biz.reg_number as string) || null,
      issuedAt,
    };
    const signature = signCertificate(payload);

    const inserted = (await db`
      INSERT INTO certificates (
        serial, business_id, company_name, reg_number, badge_source,
        signature, issued_at, issued_by
      ) VALUES (
        ${serial}, ${payload.businessId}, ${payload.companyName}, ${payload.regNumber},
        ${(biz.badge_source as string) ?? null}, ${signature}, ${issuedAt}, ${issuedBy ?? null}
      )
      ON CONFLICT (serial) DO NOTHING
      RETURNING serial
    `) as unknown as Row[];

    if (inserted.length > 0) {
      return {
        serial,
        checkCode: shortCheckCode(signature),
        issuedAt,
        reissued: Boolean(existing),
      };
    }
  }

  throw new Error('Could not allocate a unique certificate serial');
}

/**
 * Withdraws every live certificate for a business.
 *
 * Called when a business stops being verified. The verification check would
 * catch it anyway through the live status lookup, but recording the withdrawal
 * gives the holder a reason and a date instead of a bare failure.
 */
export async function revokeCertificatesFor(businessId: string, reason: string): Promise<number> {
  const rows = (await db`
    UPDATE certificates
    SET revoked_at = NOW(), revoke_reason = ${reason.slice(0, 300)}
    WHERE business_id = ${businessId} AND revoked_at IS NULL
    RETURNING serial
  `.catch(() => [])) as unknown as Row[];
  return rows.length;
}

export function certificateVerifyUrl(baseUrl: string, serial: string): string {
  return `${baseUrl.replace(/\/$/, '')}/verify/${encodeURIComponent(serial)}`;
}
