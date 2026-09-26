import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSession } from '@/lib/auth';
import { isBuildName, signedDownloadUrl } from '@/lib/app-builds';

export const dynamic = 'force-dynamic';

const LINK_SECONDS = 600;

/**
 * GET /api/admin/app-builds/link?name=<apk>[&redirect=1]
 * A 10-minute download link for one build — as JSON with a QR code (scan it
 * with the phone you're testing on), or as a redirect straight to the file.
 * Admins only; the bucket itself stays private.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const name = request.nextUrl.searchParams.get('name');
  if (!isBuildName(name)) {
    return NextResponse.json({ error: 'Unknown build' }, { status: 400 });
  }
  const url = await signedDownloadUrl(name, LINK_SECONDS).catch(() => null);
  if (!url) return NextResponse.json({ error: 'That build could not be found.' }, { status: 404 });

  if (request.nextUrl.searchParams.get('redirect') === '1') {
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  }
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 280, errorCorrectionLevel: 'M' });
  return NextResponse.json({ url, qr, expiresInSecs: LINK_SECONDS }, { headers: { 'Cache-Control': 'no-store' } });
}
