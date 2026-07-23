import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    const [verifiedBusinessesRow] = await db`
      SELECT COUNT(*)::int AS count
      FROM businesses
      WHERE status = 'verified'
    `;

    const [avgTrustScoreRow] = await db`
      SELECT COALESCE(ROUND(AVG(trust_score))::int, 0) AS score
      FROM businesses
      WHERE status = 'verified'
    `;

    const [activeConnectionsRow] = await db`
      SELECT COUNT(*)::int AS count
      FROM connections
      WHERE status = 'accepted'
    `;

    const [openSupportTicketsRow] = await db`
      SELECT COUNT(*)::int AS count
      FROM support_tickets
      WHERE status = 'open'
    `.catch(() => [{ count: 0 }]);

    const categories = await db`
      SELECT industry AS name, COUNT(*)::int AS count
      FROM businesses
      WHERE COALESCE(TRIM(industry), '') <> ''
      GROUP BY industry
      ORDER BY COUNT(*) DESC, industry ASC
      LIMIT 20
    `;

    const businesses = session
      ? await db`
          SELECT
            b.id          AS business_id,
            u.id          AS user_id,
            COALESCE(u.full_name, '') AS full_name,
            COALESCE(u.headline, '') AS headline,
            COALESCE(u.avatar_url, '') AS avatar_url,
            COALESCE(b.company_name, '') AS company_name,
            COALESCE(b.industry, '') AS industry,
            COALESCE(b.trust_score, 0)::int AS trust_score,
            COUNT(DISTINCT c.id)::int AS connection_count,
            COALESCE(
              (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM business_reviews r WHERE r.business_id = b.id),
              0
            ) AS avg_rating,
            COALESCE(
              (SELECT COUNT(*)::int FROM business_reviews r WHERE r.business_id = b.id),
              0
            )::int AS review_count
          FROM businesses b
          JOIN users u ON u.id = b.user_id
          LEFT JOIN connections c
            ON (c.requester_id = b.user_id OR c.receiver_id = b.user_id)
           AND c.status = 'accepted'
          WHERE b.status = 'verified'
            AND b.user_id <> ${session.id}
          GROUP BY
            b.id, u.id, u.full_name, u.headline, u.avatar_url,
            b.company_name, b.industry, b.trust_score, b.created_at
          ORDER BY b.trust_score DESC NULLS LAST, COUNT(DISTINCT c.id) DESC, b.created_at DESC
          LIMIT 12
        `
      : await db`
          SELECT
            b.id          AS business_id,
            u.id          AS user_id,
            COALESCE(u.full_name, '') AS full_name,
            COALESCE(u.headline, '') AS headline,
            COALESCE(u.avatar_url, '') AS avatar_url,
            COALESCE(b.company_name, '') AS company_name,
            COALESCE(b.industry, '') AS industry,
            COALESCE(b.trust_score, 0)::int AS trust_score,
            COUNT(DISTINCT c.id)::int AS connection_count,
            COALESCE(
              (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM business_reviews r WHERE r.business_id = b.id),
              0
            ) AS avg_rating,
            COALESCE(
              (SELECT COUNT(*)::int FROM business_reviews r WHERE r.business_id = b.id),
              0
            )::int AS review_count
          FROM businesses b
          JOIN users u ON u.id = b.user_id
          LEFT JOIN connections c
            ON (c.requester_id = b.user_id OR c.receiver_id = b.user_id)
           AND c.status = 'accepted'
          WHERE b.status = 'verified'
          GROUP BY
            b.id, u.id, u.full_name, u.headline, u.avatar_url,
            b.company_name, b.industry, b.trust_score, b.created_at
          ORDER BY b.trust_score DESC NULLS LAST, COUNT(DISTINCT c.id) DESC, b.created_at DESC
          LIMIT 12
        `;

    return NextResponse.json({
      stats: {
        verifiedBusinesses: verifiedBusinessesRow?.count ?? 0,
        avgTrustScore: avgTrustScoreRow?.score ?? 0,
        activeConnections: activeConnectionsRow?.count ?? 0,
        openSupportTickets: openSupportTicketsRow?.count ?? 0,
      },
      categories: categories.map((row) => ({
        name: row.name,
        count: row.count,
      })),
      businesses: businesses.map((row) => ({
        businessId: row.business_id,
        userId: row.user_id,
        displayName: row.company_name || row.full_name,
        headline: row.headline,
        companyName: row.company_name,
        industry: row.industry,
        trustScore: row.trust_score,
        connectionCount: row.connection_count,
        avatarUrl: row.avatar_url,
        avgRating: row.avg_rating,
        reviewCount: row.review_count,
        // Both queries above are already scoped to WHERE b.status = 'verified',
        // but the client shouldn't have to trust that implicitly — the gold
        // checkmark badge checks this field explicitly.
        isVerified: true,
      })),
    });
  } catch (error) {
    console.error("Home overview GET error:", error);
    return NextResponse.json({ error: "Failed to fetch home overview" }, { status: 500 });
  }
}
