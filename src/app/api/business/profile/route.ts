import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];
const AD_LIMITS: Record<string, number> = { free: 0, standard: 1, premium: 5, premium_half: 3 };

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const isStaff = !!session && STAFF_ROLES.includes(session.role);
    if (!session || (session.role !== 'business' && !isStaff)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const business = await db`
      SELECT
        id, user_id, company_name, description, industry, status, trust_score,
        logo_url, website, phone, address, package_type, created_at, social_links,
        cover_image_url, tagline, highlights,
        (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
      FROM businesses
      WHERE user_id = ${session.id}
      LIMIT 1
    `;

    // Staff without their own business (the normal case) still gets a valid
    // response — the dashboard shows a "create your business" empty state.
    if (business.length === 0) {
      return NextResponse.json({ business: null, stats: null });
    }

    const biz = business[0];

    const [totalViews, weekViews, prevWeekViews, monthViews, connections, galleryCount, activeAds, reviews] = await Promise.all([
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id}`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id} AND created_at > NOW() - INTERVAL '7 days'`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id} AND created_at > NOW() - INTERVAL '14 days' AND created_at <= NOW() - INTERVAL '7 days'`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id} AND created_at > NOW() - INTERVAL '30 days'`,
      db`SELECT COUNT(*)::int AS n FROM connections WHERE (requester_id = ${session.id} OR receiver_id = ${session.id}) AND status = 'accepted'`,
      db`SELECT COUNT(*)::int AS n FROM business_gallery WHERE business_id = ${biz.id}`,
      db`SELECT COUNT(*)::int AS n FROM ads WHERE business_id = ${biz.id} AND is_active = true`,
      db`SELECT COUNT(*)::int AS n FROM business_reviews WHERE business_id = ${biz.id}`.catch(() => [{ n: 0 }]),
    ]);

    // null when there's no prior-week baseline to compare against (avoids a
    // misleading "+100%" from e.g. 0 -> 1 view)
    const weekChangePct = prevWeekViews[0].n > 0
      ? Math.round(((weekViews[0].n - prevWeekViews[0].n) / prevWeekViews[0].n) * 100)
      : null;

    const stats = {
      views: totalViews[0].n,
      week_views: weekViews[0].n,
      week_change_pct: weekChangePct,
      month_views: monthViews[0].n,
      connections: connections[0].n,
      reviews: reviews[0].n,
      verified: biz.status === 'verified',
      ads_active: activeAds[0].n,
      ads_limit: AD_LIMITS[biz.package_type] ?? 0,
      profile_completion: Math.round(
        (biz.company_name ? 15 : 0) +
        (biz.description ? 15 : 0) +
        (biz.phone || biz.address ? 15 : 0) +
        (biz.website ? 15 : 0) +
        (biz.doc_count > 0 ? 20 : 0) +
        (galleryCount[0].n >= 5 ? 20 : 0)
      ),
      gallery_count: galleryCount[0].n,
    };

    return NextResponse.json({ business: biz, stats });
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
    const {
      company_name, description, industry, website, phone, address, logo_url, social_links,
      cover_image_url, tagline, highlights,
    } = body;

    const updated = await db`
      UPDATE businesses
      SET
        company_name = COALESCE(${company_name}, company_name),
        description = COALESCE(${description}, description),
        industry = COALESCE(${industry}, industry),
        website = COALESCE(${website}, website),
        phone = COALESCE(${phone}, phone),
        address = COALESCE(${address}, address),
        logo_url = COALESCE(${logo_url}, logo_url),
        social_links = COALESCE(${social_links ? JSON.stringify(social_links) : null}, social_links),
        cover_image_url = COALESCE(${cover_image_url}, cover_image_url),
        tagline = COALESCE(${tagline}, tagline),
        highlights = COALESCE(${highlights ? JSON.stringify(highlights) : null}, highlights),
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
