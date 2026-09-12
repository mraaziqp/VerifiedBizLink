import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAdSettings, isAdSlot, type AdSlot } from '@/lib/ads';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/ads/targeted?placement=top_banner
 *
 * The endpoint that actually puts ads on the page. It used to ignore almost
 * everything an advertiser paid for and an admin configured:
 *
 *   slot_placement    ignored, so an ad bought for the feed appeared in the
 *                     banner and the other way round — advertisers paid
 *                     15 credits a day for a spotlight and got a feed slot
 *   status            ignored, so an ad awaiting review could already run
 *   ads_enabled       ignored, so the kill switch switched nothing off
 *   boost_expires_at  ignored, so a seven-day boost outranked everything
 *                     for ever
 *   per-slot caps     ignored, so top_banner_max and sidebar_spotlight_max
 *                     did nothing
 *
 * The sibling /api/ads honoured most of these; this one, which the banner
 * actually calls, did not. Both now apply the same rules.
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await getAdSettings();
    if (!settings.enabled) return NextResponse.json({ ads: [] });

    const requested = request.nextUrl.searchParams.get('placement');
    const placement: AdSlot | null = isAdSlot(requested) ? requested : null;

    const session = await getSession();

    let userIndustries: string[] = [];
    let userProvince = '';
    if (session) {
      const prefs = (await db`
        SELECT industries, province FROM user_preferences WHERE user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      if (prefs.length > 0) {
        userIndustries = Array.isArray(prefs[0].industries) ? (prefs[0].industries as string[]) : [];
        userProvince = (prefs[0].province as string) || '';
      }
    }

    /**
     * A boost that has run out is treated as unboosted here rather than being
     * cleared by a scheduled job. The database is the record of what was
     * bought; the query decides what is live right now, so an ad cannot keep
     * outranking everything because a cron did not run.
     */
    const ads = (await db`
      SELECT id, title, description, business_name, cta_text, cta_url, badge,
             slot_placement, image_url, media_type,
             (is_boosted = true AND (boost_expires_at IS NULL OR boost_expires_at > NOW())) AS boost_live,
             target_industries, target_provinces
      FROM ads
      WHERE is_active = true
        AND (status = 'active' OR status IS NULL)
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (${placement}::text IS NULL OR slot_placement = ${placement})
      ORDER BY created_at DESC
      LIMIT 50
    `.catch((e) => { console.error('Targeted ads query failed:', e.message); return []; })) as unknown as Row[];

    const scored = ads.map((ad) => {
      let score = 0;
      if (ad.boost_live === true) score += 3;

      const adIndustries = Array.isArray(ad.target_industries) ? (ad.target_industries as string[]) : [];
      const adProvinces = Array.isArray(ad.target_provinces) ? (ad.target_provinces as string[]) : [];

      if (adIndustries.length === 0) score += 1; // untargeted — everyone sees it
      else if (userIndustries.some((i) => adIndustries.includes(i))) score += 2;

      if (adProvinces.length === 0) score += 1;
      else if (userProvince && adProvinces.includes(userProvince)) score += 2;

      return { ad, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // How many of this placement may appear at once. Without a placement the
    // caller gets the smallest cap, so a page that has not said where it is
    // showing ads cannot quietly exceed every limit at once.
    const cap = placement
      ? settings.caps[placement]
      : Math.min(...Object.values(settings.caps));

    const result = scored.slice(0, Math.max(1, cap)).map(({ ad }) => ({
      id: ad.id,
      title: ad.title,
      description: ad.description,
      business_name: ad.business_name,
      cta_text: ad.cta_text,
      cta_url: ad.cta_url,
      badge: ad.badge,
      is_boosted: ad.boost_live === true,
      slot_placement: ad.slot_placement,
      image_url: ad.image_url,
      media_type: ad.media_type,
    }));

    return NextResponse.json(
      { ads: result, placement },
      // Ads change as campaigns start, run out of credits or are paused.
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Targeted ads error:', error);
    // An advertising failure must never take a page down with it.
    return NextResponse.json({ ads: [] });
  }
}
