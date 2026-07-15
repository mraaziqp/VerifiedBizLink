import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAdLimit, getEffectivePackage, ensureMonthlyAdCredits } from '@/lib/tiers';

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 90;

async function getOwnBusiness(userId: string) {
  const rows = await db`
    SELECT id, company_name, package_type, trial_package, trial_ends_at, ad_credits
    FROM businesses WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// GET /api/business/ads — the current user's own ads
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await getOwnBusiness(session.id);
  if (!biz) return NextResponse.json({ ads: [], limit: 0, active: 0, adCredits: 0 });

  await ensureMonthlyAdCredits(biz.id);
  // Lazily auto-pause any ad whose paid duration has run out — keeps the
  // is_active flag (shown to the owner as Active/Paused) honest without a
  // cron job. Public ad-serving already filters on expires_at separately.
  await db`
    UPDATE ads SET is_active = false
    WHERE business_id = ${biz.id} AND is_active = true
      AND expires_at IS NOT NULL AND expires_at < NOW()
  `;

  const [ads, [{ ad_credits: adCredits }]] = await Promise.all([
    db`
      SELECT id, title, description, cta_text, cta_url, badge, is_boosted, is_active, boost_expires_at,
             created_at, expires_at, duration_days, impressions, clicks
      FROM ads WHERE business_id = ${biz.id} ORDER BY created_at DESC
    `,
    db`SELECT ad_credits FROM businesses WHERE id = ${biz.id}`,
  ]);
  const limit = await getAdLimit(getEffectivePackage(biz));
  const active = ads.filter((a) => a.is_active).length;

  return NextResponse.json({ ads, limit, active, adCredits, packageType: biz.package_type });
}

// POST /api/business/ads — create a new sponsored listing
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await getOwnBusiness(session.id);
  if (!biz) {
    return NextResponse.json({ error: 'Create your business profile first' }, { status: 400 });
  }

  const limit = await getAdLimit(getEffectivePackage(biz));
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

  const { title, description, ctaText, ctaUrl, badge, durationDays } = await request.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }
  const duration = Number(durationDays);
  if (!Number.isInteger(duration) || duration < MIN_DURATION_DAYS || duration > MAX_DURATION_DAYS) {
    return NextResponse.json({ error: `Choose a duration between ${MIN_DURATION_DAYS} and ${MAX_DURATION_DAYS} days` }, { status: 400 });
  }

  await ensureMonthlyAdCredits(biz.id);

  // Atomically check-and-deduct in one statement — avoids a check-then-spend
  // race where two concurrent ad creations could both pass a separate check.
  const spent = await db`
    UPDATE businesses SET ad_credits = ad_credits - ${duration}
    WHERE id = ${biz.id} AND ad_credits >= ${duration}
    RETURNING ad_credits
  `;
  if (spent.length === 0) {
    const [{ ad_credits: remaining }] = await db`SELECT ad_credits FROM businesses WHERE id = ${biz.id}`;
    return NextResponse.json(
      { error: `Not enough ad credits — you have ${remaining}, this needs ${duration}. Buy more credits to cover a longer run.` },
      { status: 403 }
    );
  }

  const [ad] = await db`
    INSERT INTO ads (business_id, title, description, business_name, cta_text, cta_url, badge, is_active, duration_days, expires_at)
    VALUES (${biz.id}, ${title.trim()}, ${description.trim()}, ${biz.company_name}, ${ctaText || 'Learn More'}, ${ctaUrl || ''}, ${badge || null}, true, ${duration}, NOW() + make_interval(days => ${duration}))
    RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at, duration_days
  `;
  return NextResponse.json({ ad, adCredits: spent[0].ad_credits }, { status: 201 });
}
