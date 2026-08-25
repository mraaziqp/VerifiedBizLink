/**
 * Issued certificates, so a printed certificate can be checked against
 * something real.
 *
 * The old certificate was an SVG generated on demand with a "certificate
 * number" that was just the first eight characters of the business UUID. No
 * record was kept that it had ever been issued, nothing was signed, and the
 * download endpoint took a company NAME with no authentication — so anyone
 * could pull a certificate for any verified business, and anyone with a text
 * editor could change the company name on one and reprint it.
 *
 * A certificate is now a record: a serial, a snapshot of what was true when it
 * was issued, and an HMAC over that snapshot. The serial is what the QR code
 * and the printed code point at, and it can be revoked.
 *
 * Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

await db`
  CREATE TABLE IF NOT EXISTS certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial          TEXT NOT NULL UNIQUE,
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

    -- Snapshot of what was certified. Kept on the row rather than joined at
    -- read time: a certificate attests to what was true when it was issued,
    -- so a later rename must not silently rewrite a printed document.
    company_name    TEXT NOT NULL,
    reg_number      TEXT,
    badge_source    TEXT,

    signature       TEXT NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_by       UUID,

    revoked_at      TIMESTAMPTZ,
    revoke_reason   TEXT,

    -- Scanning is the signal that somebody is checking up on a business.
    verify_count    INTEGER NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ
  )
`;
console.log('certificates table ready');

await db`CREATE INDEX IF NOT EXISTS certificates_business_idx ON certificates (business_id)`;
await db`CREATE INDEX IF NOT EXISTS certificates_serial_idx ON certificates (serial)`;
// One live certificate per business; reissuing revokes the previous one.
await db`
  CREATE UNIQUE INDEX IF NOT EXISTS certificates_one_active_idx
  ON certificates (business_id) WHERE revoked_at IS NULL
`;
console.log('indexes ready');

const [{ n }] = await db`SELECT COUNT(*)::int n FROM certificates`;
console.log(`existing certificates: ${n}`);

const [{ v }] = await db`SELECT COUNT(*)::int v FROM businesses WHERE status = 'verified'`;
console.log(`verified businesses eligible for one: ${v}`);
console.log('\nCertificates are issued on demand, not backfilled — issuing one');
console.log('signs a snapshot, and that should happen when a person asks for it.');
