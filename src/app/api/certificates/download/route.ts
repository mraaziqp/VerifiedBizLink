import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessName = searchParams.get('business');

    if (!businessName) {
      return NextResponse.json({ error: 'Business name required' }, { status: 400 });
    }

    const business = await db`
      SELECT id, company_name, verified_at
      FROM businesses
      WHERE company_name = ${businessName} AND status = 'verified'
      LIMIT 1
    `;

    if (!business || business.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const biz = business[0];
    const verifiedDate = new Date(biz.verified_at).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const certificateNumber = biz.id.slice(0, 8).toUpperCase();

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a2340;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="50" height="50">
      <circle cx="25" cy="25" r="1" fill="#F5A800" opacity="0.1"/>
    </pattern>
  </defs>

  <rect width="1200" height="800" fill="url(#bgGradient)"/>
  <rect width="1200" height="800" fill="url(#dots)"/>

  <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.5"/>
  <rect x="60" y="60" width="1080" height="680" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.3"/>

  <g fill="#F5A800" opacity="0.7">
    <circle cx="80" cy="80" r="8"/>
    <circle cx="1120" cy="80" r="8"/>
    <circle cx="80" cy="720" r="8"/>
    <circle cx="1120" cy="720" r="8"/>
  </g>

  <circle cx="600" cy="130" r="60" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.8"/>
  <circle cx="600" cy="130" r="55" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.5"/>
  <text x="600" y="140" font-size="60" font-weight="bold" text-anchor="middle" fill="#F5A800" opacity="0.8">✓</text>

  <text x="600" y="250" font-size="48" font-weight="bold" text-anchor="middle" fill="#F5A800">
    CERTIFICATE OF VERIFICATION
  </text>

  <text x="600" y="310" font-size="24" text-anchor="middle" fill="#FFFFFF" opacity="0.8">
    VerifiedBizLink Trust Badge
  </text>

  <line x1="200" y1="350" x2="1000" y2="350" stroke="#F5A800" stroke-width="2" opacity="0.6"/>

  <text x="600" y="430" font-size="36" font-weight="bold" text-anchor="middle" fill="#FFFFFF">
    ${biz.company_name}
  </text>

  <text x="600" y="520" font-size="18" text-anchor="middle" fill="#FFFFFF" opacity="0.9">
    This business has been verified on the VerifiedBizLink platform
  </text>
  <text x="600" y="555" font-size="18" text-anchor="middle" fill="#FFFFFF" opacity="0.9">
    Verification confirms CIPC and SARS compliance
  </text>

  <text x="300" y="660" font-size="16" text-anchor="middle" fill="#FFFFFF" opacity="0.7">
    Date: ${verifiedDate}
  </text>

  <text x="900" y="660" font-size="16" text-anchor="middle" fill="#FFFFFF" opacity="0.7">
    Cert #${certificateNumber}
  </text>

  <text x="600" y="750" font-size="14" text-anchor="middle" fill="#F5A800" opacity="0.8">
    www.verifiedbizlink.co.za
  </text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="${businessName.replace(/\s+/g, '-')}-certificate.svg"`,
      },
    });
  } catch (error) {
    console.error('Certificate download error:', error);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}
