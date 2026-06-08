import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')?.trim();
    const type = request.nextUrl.searchParams.get('type') || 'all'; // all, business, user
    const industry = request.nextUrl.searchParams.get('industry');
    const minScore = parseInt(request.nextUrl.searchParams.get('minScore') || '0');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 100);

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    const searchTerm = `%${query}%`;

    let results: any = { businesses: [], users: [] };

    // Search businesses
    if (type === 'all' || type === 'business') {
      const businesses = await db`
        SELECT
          id, company_name, industry, description, trust_score,
          status, verified_at, connections_count, website
        FROM businesses
        WHERE (company_name ILIKE ${searchTerm}
           OR description ILIKE ${searchTerm}
           OR industry ILIKE ${searchTerm})
        AND status = 'verified'
        AND trust_score >= ${minScore}
        ORDER BY trust_score DESC, connections_count DESC
        LIMIT ${limit}
      `;
      results.businesses = businesses;
    }

    // Search users (only verified business owners)
    if (type === 'all' || type === 'user') {
      const users = await db`
        SELECT
          u.id, u.full_name, u.headline, u.avatar_url,
          u.vetting_score, b.company_name, b.status
        FROM users u
        LEFT JOIN businesses b ON u.id = b.user_id
        WHERE (u.full_name ILIKE ${searchTerm}
           OR u.headline ILIKE ${searchTerm}
           OR b.company_name ILIKE ${searchTerm})
        AND (b.status = 'verified' OR b.id IS NULL)
        ORDER BY u.vetting_score DESC, u.connections_count DESC
        LIMIT ${limit}
      `;
      results.users = users;
    }

    // Filter by industry if specified
    if (industry) {
      results.businesses = results.businesses.filter(
        (b: any) => b.industry?.toLowerCase().includes(industry.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.businesses.length + results.users.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Search error:', errorMsg);
    return NextResponse.json(
      { error: 'Search failed', detail: errorMsg },
      { status: 500 }
    );
  }
}
