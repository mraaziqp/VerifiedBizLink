import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

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

    const connectedUserIds = connections.flatMap((c: any) => [
      c.requester_id === session.id ? c.receiver_id : c.requester_id,
    ]);

    // Recommend based on industry match (if user has a business)
    let recommendations = [];

    if (userBusiness[0]) {
      // Find businesses in similar industry
      const similarIndustry = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id
        FROM businesses
        WHERE industry = ${userBusiness[0].industry}
        AND status = 'verified'
        AND id != ${userBusiness[0].id}
        AND user_id NOT IN (${connectedUserIds.length > 0 ? connectedUserIds.join(',') : 'NULL'})
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;

      // Find high-trust businesses (any industry)
      const highTrust = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id
        FROM businesses
        WHERE status = 'verified'
        AND trust_score >= 90
        AND id != ${userBusiness[0].id}
        AND user_id NOT IN (${connectedUserIds.length > 0 ? connectedUserIds.join(',') : 'NULL'})
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;

      recommendations = [...similarIndustry, ...highTrust].slice(0, limit);
    } else {
      // For non-business users, recommend verified businesses
      recommendations = await db`
        SELECT
          id, company_name, industry, trust_score,
          connections_count, user_id
        FROM businesses
        WHERE status = 'verified'
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${limit}
      `;
    }

    // Get owner info for recommendations
    const recommendationsWithOwners = await Promise.all(
      recommendations.map(async (b: any) => {
        const owner = await db`
          SELECT full_name, headline
          FROM users
          WHERE id = ${b.user_id}
          LIMIT 1
        `;
        return {
          ...b,
          ownerName: owner[0]?.full_name,
          ownerHeadline: owner[0]?.headline,
        };
      })
    );

    return NextResponse.json({
      success: true,
      recommendations: recommendationsWithOwners,
      count: recommendationsWithOwners.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Recommendations error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', detail: errorMsg },
      { status: 500 }
    );
  }
}
