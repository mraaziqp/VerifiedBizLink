import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { type DbRow } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '6'), 20);

    // Get user's business if they have one
    const userBusiness = await db`
      SELECT id, industry, trust_score
      FROM businesses
      WHERE user_id = ${session.id}
      LIMIT 1
    `;

    // Get user's current connections
    const connections = await db`
      SELECT receiver_id, requester_id
      FROM connections
      WHERE (requester_id = ${session.id} OR receiver_id = ${session.id})
      AND status = 'accepted'
    `;

    const connectedUserIds = connections.flatMap((c) => [
      c.requester_id === session.id ? c.receiver_id : c.requester_id,
    ]);

    // Recommend based on industry match (if user has a business)
    let recommendations: DbRow[] = [];

    if (userBusiness[0]) {
      // Find businesses in similar industry
      const similarIndustry = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id, address, description
        FROM businesses
        WHERE industry = ${userBusiness[0].industry}
        AND status = 'verified'
        AND id != ${userBusiness[0].id}
        AND NOT (user_id = ANY(${connectedUserIds}::uuid[]))
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;

      // Find high-trust businesses (any industry)
      const highTrust = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id, address, description
        FROM businesses
        WHERE status = 'verified'
        AND trust_score >= 90
        AND id != ${userBusiness[0].id}
        AND NOT (user_id = ANY(${connectedUserIds}::uuid[]))
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;

      recommendations = [...similarIndustry, ...highTrust].slice(0, limit);
    } else {
      // For non-business users, recommend verified businesses
      recommendations = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id, address, description
        FROM businesses
        WHERE status = 'verified'
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${limit}
      `;
    }

    // Owner names in one query (was one query per business: N+1 round trips to Neon).
    const ownerIds = [...new Set(recommendations.map((b) => String(b.user_id)).filter(Boolean))];
    const owners = ownerIds.length
      ? await db`SELECT id, full_name, headline FROM users WHERE id = ANY(${ownerIds}::uuid[])`
      : [];
    const ownerById = new Map(owners.map((o) => [String(o.id), o]));
    const recommendationsWithOwners = recommendations.map((b) => {
      const owner = ownerById.get(String(b.user_id));
      return {
        ...b,
        verified: true, // every query above filters WHERE status = 'verified'
        ownerName: owner?.full_name,
        ownerHeadline: owner?.headline,
      };
    });

    return NextResponse.json({
      success: true,
      recommendations: recommendationsWithOwners,
      count: recommendationsWithOwners.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Recommendations error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', ...(process.env.NODE_ENV === 'production' ? {} : { detail: errorMsg }) },
      { status: 500 }
    );
  }
}
