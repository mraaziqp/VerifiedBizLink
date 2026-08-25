import { NextRequest, NextResponse } from 'next/server';
import { verifySerial } from '@/lib/certificates';

/**
 * GET /api/verify/<serial> — public certificate check.
 *
 * Deliberately open. The whole point of a certificate is that someone who has
 * never heard of us, handed a printed page by a business they are deciding
 * whether to trust, can check it in the time it takes to scan a QR code. A
 * login wall would make the certificate worthless.
 *
 * It returns only what is already printed on the certificate plus its current
 * standing — no contact details, no owner, nothing that would make guessing
 * serials worth anyone's time.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serial: string }> },
) {
  try {
    const { serial } = await params;
    const result = await verifySerial(serial, { countScan: true });

    return NextResponse.json(result, {
      status: result.outcome === 'valid' ? 200 : 404,
      headers: {
        // Never cached. A revoked certificate that still reads "valid" from a
        // CDN is the exact failure this endpoint exists to prevent.
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Certificate verification error:', error);
    return NextResponse.json(
      { outcome: 'error', message: 'The certificate check is unavailable. Try again shortly.' },
      { status: 500 },
    );
  }
}
