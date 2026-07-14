import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Active-ad allowance per package — keep in sync with PACKAGES in
// /api/businesses/packages/route.ts.
const AD_LIMITS: Record<string, number> = {
  free: 0,
  standard: 1,
  premium: 5,
  premium_half: 3,
};

async function getOwnBusiness(userId: string) {
  const rows = await db`
    SELECT id, company_name, package_type FROM businesses WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// GET /api/business/ads — the current user's own ads
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await getOwnBusiness(session.id);
  if (!biz) return NextResponse.json({ ads: [], limit: 0, active: 0 });

  const ads = await db`
    SELECT id, title, description, cta_text, cta_url, badge, is_boosted, is_active, boost_expires_at,
           created_at, expires_at, impressions, clicks
    FROM ads WHERE business_id = ${biz.id} ORDER BY created_at DESC
  `;
  const limit = AD_LIMITS[biz.package_type] ?? 0;
  const active = ads.filter((a) => a.is_active).length;

  return NextResponse.json({ ads, limit, active, packageType: biz.package_type });
}

// POST /api/business/ads — create a new sponsored listing
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await getOwnBusiness(session.id);
  if (!biz) {
    return NextResponse.json({ error: 'Create your business profile first' }, { status: 400 });
  }

  const limit = AD_LIMITS[biz.package_type] ?? 0;
  if (limit === 0) {
    return NextResponse.json(
      { error: 'Sponsored listings require a paid plan. Upgrade on the Pricing page to create one.' },
      { status: 403 }
    );
  }

  const [{ count }] = await db`
    SELECT COUNT(*)::int AS count FROM ads WHERE business_id = ${biz.id} AND is_active = true
  `;
  if (count >= limit) {
    return NextResponse.json(
      { error: `Your plan allows ${limit} active ad${limit === 1 ? '' : 's'}. Pause or delete one first, or upgrade your plan.` },
      { status: 403 }
    );
  }

  const { title, description, ctaText, ctaUrl, badge } = await request.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }

  const [ad] = await db`
    INSERT INTO ads (business_id, title, description, business_name, cta_text, cta_url, badge, is_active)
    VALUES (${biz.id}, ${title.trim()}, ${description.trim()}, ${biz.company_name}, ${ctaText || 'Learn More'}, ${ctaUrl || ''}, ${badge || null}, true)
    RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at
  `;
  return NextResponse.json({ ad }, { status: 201 });
}
