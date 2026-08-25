import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { issueCertificate, certificateVerifyUrl, shortCheckCode } from '@/lib/certificates';
import { renderCertificateSvg } from '@/lib/certificate-svg';
import { appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/certificates/download — the business's own certificate.
 *
 * This used to take a company NAME from the query string with no session check
 * at all, so anybody could fetch a certificate for any verified business by
 * typing its name. It now serves the certificate belonging to the caller, or
 * one an admin explicitly asks for by business id.
 *
 * Issuing happens here rather than on a separate button: a business that has
 * never had one gets a live certificate the first time they download, and
 * everyone else gets the one already on record. Reissuing is deliberate and
 * costs the old serial its validity, so it is not done on every download.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedBusinessId = request.nextUrl.searchParams.get('businessId');
    const reissue = request.nextUrl.searchParams.get('reissue') === 'true';

    let businessId: string;
    if (requestedBusinessId) {
      // Only staff may name a business other than their own.
      if (!isStaff(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      businessId = requestedBusinessId;
    } else {
      const owned = (await db`
        SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      if (owned.length === 0) {
        return NextResponse.json({ error: 'You do not have a business profile' }, { status: 404 });
      }
      businessId = String(owned[0].id);
    }

    const rows = (await db`
      SELECT id, company_name, reg_number, status, verified_at
      FROM businesses WHERE id = ${businessId} LIMIT 1
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const biz = rows[0];

    if (biz.status !== 'verified') {
      return NextResponse.json(
        { error: 'A certificate is only issued once your business is verified.' },
        { status: 409 },
      );
    }

    // Reuse the live certificate if there is one, so downloading twice does
    // not quietly invalidate the copy already hanging on a wall.
    const existing = (await db`
      SELECT serial, signature, issued_at, company_name
      FROM certificates
      WHERE business_id = ${businessId} AND revoked_at IS NULL
      LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    let serial: string;
    let checkCode: string;
    let issuedAt: Date;

    // A rename makes the printed name wrong, so the certificate is reissued
    // rather than served with a name that no longer matches the business.
    const nameChanged =
      existing.length > 0 && String(existing[0].company_name) !== String(biz.company_name);

    if (existing.length === 0 || reissue || nameChanged) {
      const issued = await issueCertificate(businessId, session.id);
      serial = issued.serial;
      checkCode = issued.checkCode;
      issuedAt = new Date(issued.issuedAt);
    } else {
      serial = String(existing[0].serial);
      checkCode = shortCheckCode(String(existing[0].signature));
      issuedAt = new Date(existing[0].issued_at as string);
    }

    const baseUrl = appUrlFromRequest(request);
    const svg = await renderCertificateSvg({
      companyName: String(biz.company_name ?? ''),
      regNumber: (biz.reg_number as string) || null,
      serial,
      checkCode,
      issuedAt,
      verifiedSince: biz.verified_at ? new Date(biz.verified_at as string) : null,
      verifyUrl: certificateVerifyUrl(baseUrl, serial),
    });

    const filename = String(biz.company_name ?? 'certificate')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}-${serial}.svg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Certificate download error:', error);
    return NextResponse.json({ error: 'Failed to generate the certificate' }, { status: 500 });
  }
}
