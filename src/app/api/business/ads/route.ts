import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAdLimit, getEffectivePackage } from '@/lib/tiers';
import { AD_TEXT_LIMITS, cleanAdImage, cleanAdLink, getAdSettings, isAdSlot, type AdSlot } from '@/lib/ads';
import { AD_CREDIT_PACKS, changeCredits, creditHistory, ensureMonthlyAdCredits } from '@/lib/ad-credits';

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 90;

// Rates come from ad_settings via getAdSettings, so the price the admin sets
// is the price actually charged — and, since GET returns them, the price the
// page shows.

/**
 * The caller's own business. Staff get no fallback: this used to hand a
 * staff account without a business the most recently created business, so
 * an admin opening Ad Manager saw — and could spend — a stranger's credits.
 * Staff manage other businesses' ads from Admin → Ads.
 */
async function getOwnBusiness(userId: string) {
  const rows = await db`
    SELECT id, company_name, package_type, trial_package, trial_ends_at, ad_credits
    FROM businesses WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// GET /api/business/ads — the current user's own ads, balance, prices and history
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const biz = await getOwnBusiness(session.id);
    const settings = await getAdSettings();
    if (!biz) {
      return NextResponse.json({
        ads: [], limit: 0, active: 0, adCredits: 0, hasBusiness: false,
        rates: settings.rates, packs: AD_CREDIT_PACKS, history: [], adsEnabled: settings.enabled,
      });
    }

    await ensureMonthlyAdCredits(biz.id);
    // Close out ads whose paid run has ended.
    await db`
      UPDATE ads SET is_active = false, status = 'completed'
      WHERE business_id = ${biz.id} AND is_active = true
        AND expires_at IS NOT NULL AND expires_at < NOW()
    `;

    const [ads, [balanceRow], history] = await Promise.all([
      db`
        SELECT id, title, description, cta_text, cta_url, badge, is_boosted, is_active, boost_expires_at,
               created_at, expires_at, duration_days, impressions, clicks,
               COALESCE(slot_placement, 'feed_inline') AS slot_placement,
               image_url, media_type, COALESCE(credits_spent, 0) AS credits_spent,
               COALESCE(status, 'active') AS status
        FROM ads WHERE business_id = ${biz.id} ORDER BY created_at DESC
      `,
      db`SELECT COALESCE(ad_credits, 0) AS ad_credits FROM businesses WHERE id = ${biz.id}`,
      creditHistory(biz.id, 25),
    ]);
    const limit = await getAdLimit(getEffectivePackage(biz));
    const active = ads.filter((a) => a.is_active).length;

    return NextResponse.json({
      ads, limit, active, hasBusiness: true,
      adCredits: Number(balanceRow?.ad_credits ?? 0),
      packageType: biz.package_type,
      rates: settings.rates,
      adsEnabled: settings.enabled,
      packs: AD_CREDIT_PACKS,
      history,
    });
  } catch (error) {
    console.error('Business ads GET error:', error);
    return NextResponse.json({ error: 'Could not load your ads' }, { status: 500 });
  }
}

// POST /api/business/ads — create a new sponsored listing, paid in credits
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const biz = await getOwnBusiness(session.id);
    if (!biz) {
      return NextResponse.json({ error: 'Create your business profile first' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    if (title.length > AD_TEXT_LIMITS.title || description.length > AD_TEXT_LIMITS.description) {
      return NextResponse.json(
        { error: `Keep the title under ${AD_TEXT_LIMITS.title} characters and the description under ${AD_TEXT_LIMITS.description}.` },
        { status: 400 },
      );
    }
    const ctaUrl = cleanAdLink(body.ctaUrl);
    if (ctaUrl === null) {
      return NextResponse.json({ error: 'The button link must be a website address (https://…) or a page on VerifiedBizLink.' }, { status: 400 });
    }
    const imageUrl = cleanAdImage(body.imageUrl);
    if (imageUrl === null) {
      return NextResponse.json({ error: 'That image could not be used. Upload the image again.' }, { status: 400 });
    }
    const ctaText = String(body.ctaText ?? '').trim().slice(0, AD_TEXT_LIMITS.ctaText) || 'Learn More';
    const badge = String(body.badge ?? '').trim().slice(0, AD_TEXT_LIMITS.badge) || null;

    const duration = Number(body.durationDays);
    if (!Number.isInteger(duration) || duration < MIN_DURATION_DAYS || duration > MAX_DURATION_DAYS) {
      return NextResponse.json({ error: `Choose a duration between ${MIN_DURATION_DAYS} and ${MAX_DURATION_DAYS} days` }, { status: 400 });
    }

    const limit = await getAdLimit(getEffectivePackage(biz));
    const [{ count }] = await db`
      SELECT COUNT(*)::int AS count FROM ads WHERE business_id = ${biz.id} AND is_active = true
    `;
    // A limit of 0 means the plan sets no cap; credits are the constraint.
    if (limit > 0 && count >= limit) {
      return NextResponse.json(
        { error: `Your plan allows ${limit} active ad${limit === 1 ? '' : 's'}. Pause or delete one first, or upgrade your plan.` },
        { status: 403 },
      );
    }

    const adSettings = await getAdSettings();
    if (!adSettings.enabled) {
      return NextResponse.json(
        { error: 'Advertising is switched off at the moment. Your credits are safe — try again later.' },
        { status: 503 },
      );
    }

    const slot: AdSlot = isAdSlot(body.slotPlacement) ? body.slotPlacement : 'feed_inline';
    const costPerDay = adSettings.rates[slot];
    const totalCost = duration * costPerDay;

    await ensureMonthlyAdCredits(biz.id);

    // The ad's id is chosen first so the charge, the ad and any refund all
    // point at the same thing in the credit history.
    const adId = crypto.randomUUID();
    const charge = await changeCredits({
      businessId: biz.id,
      delta: -totalCost,
      kind: 'ad_spend',
      note: `"${title.slice(0, 60)}" — ${duration} day${duration === 1 ? '' : 's'} × ${costPerDay} credits`,
      reference: `ad:${adId}`,
      actorId: session.id,
    });
    if (!charge.applied) {
      return NextResponse.json(
        { error: `Not enough ad credits — you have ${charge.balance ?? 0}, this placement needs ${totalCost} (${costPerDay} credits/day × ${duration} days). Buy more credits to launch.` },
        { status: 402 },
      );
    }

    try {
      const [ad] = await db`
        INSERT INTO ads (
          id, business_id, title, description, business_name, cta_text, cta_url, badge,
          is_active, duration_days, expires_at, slot_placement, image_url, credits_spent, status
        )
        VALUES (
          ${adId}, ${biz.id}, ${title}, ${description}, ${biz.company_name},
          ${ctaText}, ${ctaUrl}, ${badge},
          true, ${duration}, NOW() + make_interval(days => ${duration}),
          ${slot}, ${imageUrl || null}, ${totalCost}, 'active'
        )
        RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at, duration_days, slot_placement, image_url, credits_spent, status
      `;
      return NextResponse.json({ ad, adCredits: charge.balance }, { status: 201 });
    } catch (error) {
      // The charge went through but the ad did not: give the credits back.
      console.error('Ad insert failed after charging; refunding', error);
      const refund = await changeCredits({
        businessId: biz.id,
        delta: totalCost,
        kind: 'refund',
        note: 'Ad could not be created — credits returned',
        reference: `ad-refund:${adId}`,
      }).catch((e) => { console.error('Refund failed', e); return null; });
      return NextResponse.json(
        { error: 'Your ad could not be created. Your credits were not used.', adCredits: refund?.balance },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Business ads POST error:', error);
    return NextResponse.json({ error: 'Could not create your ad' }, { status: 500 });
  }
}
