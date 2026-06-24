import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'business') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const business = await db`
      SELECT
        id, user_id, company_name, description, industry, status, trust_score,
        avatar_url, website, phone, address, created_at,
        (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
      FROM businesses
      WHERE user_id = ${session.id}
      LIMIT 1
    `;

    if (business.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const stats = {
      views: Math.floor(Math.random() * 500) + 50,
      contacts: Math.floor(Math.random() * 30) + 5,
      reviews: Math.floor(Math.random() * 50) + 10,
      verified: business[0].status === 'verified',
    };

    return NextResponse.json({
      business: business[0],
      stats,
    });
  } catch (error) {
    console.error('Business profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'business') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { company_name, description, industry, website, phone, address, avatar_url } = body;

    const updated = await db`
      UPDATE businesses
      SET
        company_name = COALESCE(${company_name}, company_name),
        description = COALESCE(${description}, description),
        industry = COALESCE(${industry}, industry),
        website = COALESCE(${website}, website),
        phone = COALESCE(${phone}, phone),
        address = COALESCE(${address}, address),
        avatar_url = COALESCE(${avatar_url}, avatar_url),
        updated_at = NOW()
      WHERE user_id = ${session.id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business: updated[0] });
  } catch (error) {
    console.error('Business profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}
