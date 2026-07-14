import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/explore/businesses — get verified businesses for map/explore view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');

    let businesses: any[];

    if (industry && industry !== 'all') {
      businesses = await db`
        SELECT
          id, company_name, industry, address, phone, website,
          trust_score, latitude, longitude, status, created_at
        FROM businesses
        WHERE status = 'verified' AND industry = ${industry}
        ORDER BY trust_score DESC, created_at DESC
        LIMIT 200
      `;
    } else {
      businesses = await db`
        SELECT
          id, company_name, industry, address, phone, website,
          trust_score, latitude, longitude, status, created_at
        FROM businesses
        WHERE status = 'verified'
        ORDER BY trust_score DESC, created_at DESC
        LIMIT 200
      `;
    }

    const mapped = businesses.map((b: any) => ({
      id: b.id,
      company_name: b.company_name,
      industry: b.industry || 'other',
      address: b.address || 'Address not provided',
      phone: b.phone,
      website: b.website,
      trust_score: b.trust_score || 0,
      latitude: b.latitude || -26.2023,
      longitude: b.longitude || 28.0436,
      status: b.status || 'verified',
    }));

    return NextResponse.json({ businesses: mapped });
  } catch (error) {
    console.error('Explore businesses error:', error);
    // Never fabricate "verified" businesses with fake trust scores as a
    // fallback — that's actively misleading on a page whose entire point is
    // showing which businesses are genuinely verified. Surface the failure
    // instead so the client can show a real error state.
    return NextResponse.json({ businesses: [], error: 'Failed to load businesses' }, { status: 503 });
  }
}
