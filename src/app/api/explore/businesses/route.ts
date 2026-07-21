import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface ExploreBusinessRow {
  id: string;
  company_name: string;
  industry: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  trust_score: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  created_at: string;
}

// GET /api/explore/businesses — get verified businesses for map/explore view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');

    const businesses = (
      industry && industry !== 'all'
        ? await db`
            SELECT
              id, company_name, industry, address, phone, website,
              trust_score, latitude, longitude, status, created_at
            FROM businesses
            WHERE status = 'verified' AND industry = ${industry}
            ORDER BY trust_score DESC, created_at DESC
            LIMIT 200
          `
        : await db`
            SELECT
              id, company_name, industry, address, phone, website,
              trust_score, latitude, longitude, status, created_at
            FROM businesses
            WHERE status = 'verified'
            ORDER BY trust_score DESC, created_at DESC
            LIMIT 200
          `
    ) as unknown as ExploreBusinessRow[];

    const mapped = businesses.map((b) => ({
      id: b.id,
      company_name: b.company_name,
      industry: b.industry || 'other',
      address: b.address || 'Address not provided',
      phone: b.phone,
      website: b.website,
      trust_score: b.trust_score || 0,
      // Real coordinates or nothing — silently pinning businesses with no
      // address geocoding to a fake Johannesburg fallback made them look
      // "far away" from anyone not near Joburg, which the client's radius
      // filter then used to hide them entirely (even from an exact name
      // search). The client now treats a missing location as "unknown
      // distance" instead of "definitely far away".
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
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
