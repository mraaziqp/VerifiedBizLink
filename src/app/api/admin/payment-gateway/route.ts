import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

// GET /api/admin/payment-gateway — real PayFast configuration status.
// This is the gateway VerifiedBizLink actually processes payments through
// (see /api/payfast/init and /api/payfast/notify) — read-only, since
// secrets belong in the hosting platform's env vars, not a web form.
export async function GET() {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const merchantIdSet = !!process.env.PAYFAST_MERCHANT_ID;
  const merchantKeySet = !!process.env.PAYFAST_MERCHANT_KEY;
  const passphraseSet = !!process.env.PAYFAST_PASSPHRASE;
  const url = process.env.PAYFAST_URL || 'https://www.payfast.co.za/eng/process';
  const isSandbox = url.includes('sandbox');

  return NextResponse.json({
    configured: merchantIdSet && merchantKeySet,
    merchantIdSet,
    merchantKeySet,
    passphraseSet,
    mode: isSandbox ? 'sandbox' : 'production',
    url,
  });
}
