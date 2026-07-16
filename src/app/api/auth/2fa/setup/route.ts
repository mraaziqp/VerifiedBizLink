import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateTotpSecret, getOtpAuthUri } from '@/lib/twofactor';
import db from '@/lib/db';

// POST /api/auth/2fa/setup — generates (and stores, but does not yet enable)
// a TOTP secret, returning a QR code the user scans with an authenticator
// app. 2FA only actually turns on once they prove they scanned it correctly
// via POST /api/auth/2fa/verify-setup.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = generateTotpSecret();
  await db`UPDATE users SET two_factor_secret = ${secret}, two_factor_enabled = false WHERE id = ${session.id}`;

  const otpauthUri = getOtpAuthUri(secret, session.email);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

  return NextResponse.json({ secret, otpauthUri, qrCodeUrl });
}
