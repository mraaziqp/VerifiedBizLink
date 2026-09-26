import { resolveMx } from 'dns/promises';
import db from '@/lib/db';

/**
 * Checks shared by every way of creating an account — the /api/auth/signup
 * route and the registerBasicUser server action — so the quick path is not
 * a weaker path.
 */

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

// Throwaway inbox providers: an account on one of these can never be
// recovered or contacted, which defeats the point of a trust network.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'throwawaymail.com',
  'getnada.com', 'maildrop.cc', 'fakeinbox.com', 'sharklasers.com', 'dispostable.com',
]);

const MX_LOOKUP_TIMEOUT_MS = 3000;

/**
 * True when the domain can plausibly receive mail. A DNS failure other than
 * "no such domain" counts as a pass: a slow resolver must not block signups.
 */
export async function isRegistrableEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MX lookup timed out')), MX_LOOKUP_TIMEOUT_MS),
      ),
    ]);
    return records.length > 0;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') return false;
    return true;
  }
}

let columnsReady: Promise<void> | null = null;

/**
 * The account-type columns the Drizzle schema declares on users. No migration
 * ever added them to the live table, so any insert naming them failed.
 * Additive and IF NOT EXISTS, run once per server instance.
 */
export function ensureUserTypeColumns(): Promise<void> {
  if (!columnsReady) {
    columnsReady = (async () => {
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer'`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT FALSE`;
    })().catch((error) => {
      columnsReady = null;
      throw error;
    });
  }
  return columnsReady;
}
