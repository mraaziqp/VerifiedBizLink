import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/businesses/[id] — public business profile
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [biz] = await db`
      SELECT
        b.id,
        b.company_name,
        b.industry,
        b.reg_number,
        b.vat_number,
        b.status,
        b.trust_score,
        b.description,
        b.website,
        b.phone,
        b.address,
        b.verified_at,
        b.created_at,
        u.id         AS user_id,
        u.full_name  AS owner_name,
        u.headline,
        u.avatar_url,
        u.location,
        COALESCE(
          (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM business_reviews r WHERE r.business_id = b.id),
          0
        ) AS avg_rating,
        COALESCE(
          (SELECT COUNT(*) FROM business_reviews r WHERE r.business_id = b.id),
          0
        )::int AS review_count,
        COALESCE(
          (SELECT COUNT(*) FROM connections c
           WHERE (c.requester_id = b.user_id OR c.receiver_id = b.user_id)
           AND c.status = 'accepted'),
          0
        )::int AS connection_count
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ${id}
      LIMIT 1
    `;

    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({
      business: {
        id: biz.id,
        companyName: biz.company_name,
        industry: biz.industry,
        regNumber: biz.reg_number,
        vatNumber: biz.vat_number,
        status: biz.status,
        trustScore: biz.trust_score,
        description: biz.description,
        website: biz.website,
        phone: biz.phone,
        address: biz.address,
        verifiedAt: biz.verified_at,
        createdAt: biz.created_at,
        userId: biz.user_id,
        ownerName: biz.owner_name,
        headline: biz.headline,
        avatarUrl: biz.avatar_url,
        location: biz.location,
        avgRating: biz.avg_rating,
        reviewCount: biz.review_count,
        connectionCount: biz.connection_count,
      },
    });
  } catch (error) {
    console.error('GET business profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}
