import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const DEMO_BUSINESSES = [
  {
    id: 'demo-1',
    company_name: 'Tech Innovations SA',
    industry: 'technology',
    address: '123 Innovation Drive, Johannesburg, South Africa',
    phone: '+27 11 123 4567',
    website: 'https://techinnovations.co.za',
    trust_score: 98,
    latitude: -26.2023,
    longitude: 28.0436,
    status: 'verified' as const,
  },
  {
    id: 'demo-2',
    company_name: 'Premier Services Ltd',
    industry: 'services',
    address: '456 Service Avenue, Cape Town, South Africa',
    phone: '+27 21 456 7890',
    website: 'https://premierservices.co.za',
    trust_score: 95,
    latitude: -33.9249,
    longitude: 18.4241,
    status: 'verified' as const,
  },
  {
    id: 'demo-3',
    company_name: 'Retail Masters Co',
    industry: 'retail',
    address: '789 Commerce Street, Durban, South Africa',
    phone: '+27 31 789 0123',
    website: 'https://retailmasters.co.za',
    trust_score: 92,
    latitude: -29.8587,
    longitude: 31.0277,
    status: 'verified' as const,
  },
];

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
    return NextResponse.json({ businesses: DEMO_BUSINESSES });
  }
}
