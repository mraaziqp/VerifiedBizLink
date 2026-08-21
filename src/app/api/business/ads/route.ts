import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAdLimit, getEffectivePackage, ensureMonthlyAdCredits } from '@/lib/tiers';

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 90;

const SLOT_RATES: Record<string, number> = {
  feed_inline: 5,
  top_banner: 10,
  sidebar_spotlight: 15,
};

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
  // Auto-pause expired ads
  await db`
    UPDATE ads SET is_active = false, status = 'completed'
    WHERE business_id = ${biz.id} AND is_active = true
      AND expires_at IS NOT NULL AND expires_at < NOW()
  `;

  const [ads, [{ ad_credits: adCredits }]] = await Promise.all([
    db`
      SELECT id, title, description, cta_text, cta_url, badge, is_boosted, is_active, boost_expires_at,
             created_at, expires_at, duration_days, impressions, clicks,
             COALESCE(slot_placement, 'feed_inline') AS slot_placement,
             image_url, media_type, COALESCE(credits_spent, 0) AS credits_spent,
             COALESCE(status, 'active') AS status
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
  if (limit === 0 && biz.package_type === 'free') {
    // Allow free tier to run ads if they purchase / have ad credits
  }

  const [{ count }] = await db`
    SELECT COUNT(*)::int AS count FROM ads WHERE business_id = ${biz.id} AND is_active = true
  `;
  if (limit > 0 && count >= limit) {
    return NextResponse.json(
      { error: `Your plan allows ${limit} active ad${limit === 1 ? '' : 's'}. Pause or delete one first, or upgrade your plan.` },
      { status: 403 }
    );
  }

  const { title, description, ctaText, ctaUrl, badge, durationDays, slotPlacement, imageUrl } = await request.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }
  const duration = Number(durationDays);
  if (!Number.isInteger(duration) || duration < MIN_DURATION_DAYS || duration > MAX_DURATION_DAYS) {
    return NextResponse.json({ error: `Choose a duration between ${MIN_DURATION_DAYS} and ${MAX_DURATION_DAYS} days` }, { status: 400 });
  }

  const slot = slotPlacement && SLOT_RATES[slotPlacement] ? slotPlacement : 'feed_inline';
  const costPerDay = SLOT_RATES[slot] || 5;
  const totalCost = duration * costPerDay;

  await ensureMonthlyAdCredits(biz.id);

  // Atomically check-and-deduct credits
  const spent = await db`
    UPDATE businesses SET ad_credits = ad_credits - ${totalCost}
    WHERE id = ${biz.id} AND ad_credits >= ${totalCost}
    RETURNING ad_credits
  `;
  if (spent.length === 0) {
    const [{ ad_credits: remaining }] = await db`SELECT ad_credits FROM businesses WHERE id = ${biz.id}`;
    return NextResponse.json(
      { error: `Not enough ad credits — you have ${remaining}, this placement requires ${totalCost} credits (${costPerDay} credits/day × ${duration} days). Buy more credits to launch.` },
      { status: 403 }
    );
  }

  const [ad] = await db`
    INSERT INTO ads (
      business_id, title, description, business_name, cta_text, cta_url, badge,
      is_active, duration_days, expires_at, slot_placement, image_url, credits_spent, status
    )
    VALUES (
      ${biz.id}, ${title.trim()}, ${description.trim()}, ${biz.company_name},
      ${ctaText || 'Learn More'}, ${ctaUrl || ''}, ${badge || null},
      true, ${duration}, NOW() + make_interval(days => ${duration}),
      ${slot}, ${imageUrl || null}, ${totalCost}, 'active'
    )
    RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at, duration_days, slot_placement, image_url, credits_spent, status
  `;
  return NextResponse.json({ ad, adCredits: spent[0].ad_credits }, { status: 201 });
}
