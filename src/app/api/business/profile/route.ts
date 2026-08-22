import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAdLimit, getEffectivePackage } from '@/lib/tiers';
import { isStaff } from '@/lib/roles';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const staffUser = isStaff(session?.role);
    if (!session || (session.role !== 'business' && !staffUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetBizId = searchParams.get('bizId');

    let business: Row[] = [];
    let allBusinessesList: Row[] = [];

    if (staffUser) {
      allBusinessesList = (await db`
        SELECT id, company_name, status, package_type, user_id
        FROM businesses
        ORDER BY company_name ASC
      `) as unknown as Row[];

      if (targetBizId) {
        business = (await db`
          SELECT
            id, user_id, company_name, description, industry, status, trust_score,
            logo_url, website, phone, address, package_type, trial_package, trial_ends_at, created_at, social_links,
            cover_image_url, tagline, highlights,
            (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
          FROM businesses
          WHERE id = ${targetBizId}
          LIMIT 1
        `) as unknown as Row[];
      } else {
        // Check if admin has their own business record
        business = (await db`
          SELECT
            id, user_id, company_name, description, industry, status, trust_score,
            logo_url, website, phone, address, package_type, trial_package, trial_ends_at, created_at, social_links,
            cover_image_url, tagline, highlights,
            (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
          FROM businesses
          WHERE user_id = ${session.id}
          LIMIT 1
        `) as unknown as Row[];

        // If admin has no personal business, automatically inspect the first real business
        if (business.length === 0 && allBusinessesList.length > 0) {
          const firstId = allBusinessesList[0].id;
          business = (await db`
            SELECT
              id, user_id, company_name, description, industry, status, trust_score,
              logo_url, website, phone, address, package_type, trial_package, trial_ends_at, created_at, social_links,
              cover_image_url, tagline, highlights,
              (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
            FROM businesses
            WHERE id = ${firstId}
            LIMIT 1
          `) as unknown as Row[];
        }
      }
    } else {
      // Normal business user
      business = (await db`
        SELECT
          id, user_id, company_name, description, industry, status, trust_score,
          logo_url, website, phone, address, package_type, trial_package, trial_ends_at, created_at, social_links,
          cover_image_url, tagline, highlights,
          (SELECT COUNT(*) FROM documents WHERE business_id = businesses.id) as doc_count
        FROM businesses
        WHERE user_id = ${session.id}
        LIMIT 1
      `) as unknown as Row[];
    }

    if (business.length === 0) {
      return NextResponse.json({ business: null, stats: null, adminBusinesses: allBusinessesList });
    }

    const biz = business[0];

    const [totalViews, weekViews, prevWeekViews, monthViews, connections, galleryCount, activeAds, reviews] = await Promise.all([
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id as string}`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id as string} AND created_at > NOW() - INTERVAL '7 days'`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id as string} AND created_at > NOW() - INTERVAL '14 days' AND created_at <= NOW() - INTERVAL '7 days'`,
      db`SELECT COUNT(*)::int AS n FROM business_profile_views WHERE business_id = ${biz.id as string} AND created_at > NOW() - INTERVAL '30 days'`,
      db`SELECT COUNT(*)::int AS n FROM connections WHERE (requester_id = ${biz.user_id as string} OR receiver_id = ${biz.user_id as string}) AND status = 'accepted'`,
      db`SELECT COUNT(*)::int AS n FROM business_gallery WHERE business_id = ${biz.id as string}`,
      db`SELECT COUNT(*)::int AS n FROM ads WHERE business_id = ${biz.id as string} AND is_active = true`,
      db`SELECT COUNT(*)::int AS n FROM business_reviews WHERE business_id = ${biz.id as string}`.catch(() => [{ n: 0 }]),
    ]);

    const prevN = (prevWeekViews[0] as unknown as { n: number }).n;
    const weekN = (weekViews[0] as unknown as { n: number }).n;
    const weekChangePct = prevN > 0 ? Math.round(((weekN - prevN) / prevN) * 100) : null;

    const stats = {
      views: (totalViews[0] as unknown as { n: number }).n,
      week_views: weekN,
      week_change_pct: weekChangePct,
      month_views: (monthViews[0] as unknown as { n: number }).n,
      connections: (connections[0] as unknown as { n: number }).n,
      reviews: (reviews[0] as unknown as { n: number }).n,
      verified: biz.status === 'verified',
      ads_active: (activeAds[0] as unknown as { n: number }).n,
      ads_limit: await getAdLimit(getEffectivePackage(biz as any)),
      profile_completion: Math.round(
        (biz.company_name ? 15 : 0) +
        (biz.description ? 15 : 0) +
        (biz.phone || biz.address ? 15 : 0) +
        (biz.website ? 15 : 0) +
        ((biz.doc_count as number) > 0 ? 20 : 0) +
        ((galleryCount[0] as unknown as { n: number }).n >= 5 ? 20 : 0)
      ),
      gallery_count: (galleryCount[0] as unknown as { n: number }).n,
    };

    return NextResponse.json({
      business: biz,
      stats,
      adminBusinesses: staffUser ? allBusinessesList : undefined,
    });
  } catch (error) {
    console.error('Business profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const staffUser = isStaff(session?.role);
    if (!session || (session.role !== 'business' && !staffUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id, company_name, description, industry, website, phone, address, logo_url, social_links,
      cover_image_url, tagline, highlights,
    } = body;

    if (highlights !== undefined && (!Array.isArray(highlights) || highlights.length > 6)) {
      return NextResponse.json({ error: 'Highlights must be an array of at most 6 items' }, { status: 400 });
    }
    if (tagline !== undefined && typeof tagline === 'string' && tagline.length > 100) {
      return NextResponse.json({ error: 'Tagline must be 100 characters or fewer' }, { status: 400 });
    }
    const cappedHighlights = highlights?.map((h: unknown) => String(h).slice(0, 80));

    let updated: Row[] = [];
    if (staffUser && id) {
      updated = (await db`
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
          highlights = COALESCE(${cappedHighlights ? JSON.stringify(cappedHighlights) : null}, highlights),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `) as unknown as Row[];
    } else {
      updated = (await db`
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
          highlights = COALESCE(${cappedHighlights ? JSON.stringify(cappedHighlights) : null}, highlights),
          updated_at = NOW()
        WHERE user_id = ${session.id}
        RETURNING *
      `) as unknown as Row[];
    }

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business: updated[0] });
  } catch (error) {
    console.error('Business profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}
