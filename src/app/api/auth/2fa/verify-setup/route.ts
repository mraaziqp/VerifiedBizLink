import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { verifyTotpToken, generateBackupCodes, hashBackupCode } from '@/lib/twofactor';
import db from '@/lib/db';

// POST /api/auth/2fa/verify-setup — confirms the user actually scanned the
// QR from /api/auth/2fa/setup by submitting a live code from their
// authenticator app. Only on success does 2FA actually turn on.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await request.json();
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

  const rows = await db`SELECT two_factor_secret FROM users WHERE id = ${session.id}`;
  const secret = rows[0]?.two_factor_secret;
  if (!secret) {
    return NextResponse.json({ error: 'Call /api/auth/2fa/setup first' }, { status: 400 });
  }

  const valid = await verifyTotpToken(String(code).trim(), secret);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid code — check the time on your device and try again' }, { status: 401 });
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = backupCodes.map(hashBackupCode);

  await db`
    UPDATE users SET two_factor_enabled = true, two_factor_backup_codes = ${JSON.stringify(hashedCodes)}
    WHERE id = ${session.id}
  `;

  // Backup codes are only ever shown once, right here — the DB only ever stores hashes.
  return NextResponse.json({ success: true, backupCodes });
}
