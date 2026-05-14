import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

/**
 * GET /api/ads/targeted
 *
 * Matching algorithm:
 *  1. Load user preferences (industries, province)
 *  2. Fetch all active ads
 *  3. Score each ad:
 *     +3  boosted ad
 *     +2  ad's target_industries intersects user's interests
 *     +2  ad's target_provinces includes user's province
 *     +1  catch-all (no targeting set — show to everyone)
 *  4. Return top 5 sorted by score desc
 */
export async function GET() {
  const session = await getSession();

  let userIndustries: string[] = [];
  let userProvince = '';

  if (session) {
    const prefs = await db`
      SELECT industries, province FROM user_preferences WHERE user_id = ${session.id} LIMIT 1
    `;
    if (prefs.length > 0) {
      userIndustries = Array.isArray(prefs[0].industries) ? prefs[0].industries : [];
      userProvince = prefs[0].province || '';
    }
  }

  const ads = await db`
    SELECT id, title, description, business_name, cta_text, cta_url, badge, is_boosted,
           target_industries, target_provinces
    FROM ads
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY is_boosted DESC, created_at DESC
    LIMIT 20
  `;

  const scored = ads.map((ad) => {
    let score = 0;
    if (ad.is_boosted) score += 3;

    const adIndustries: string[] = Array.isArray(ad.target_industries) ? ad.target_industries : [];
    const adProvinces: string[] = Array.isArray(ad.target_provinces) ? ad.target_provinces : [];

    // Industry match
    if (adIndustries.length === 0) {
      score += 1; // untargeted — show to everyone
    } else if (userIndustries.some((i) => adIndustries.includes(i))) {
      score += 2;
    }

    // Province match
    if (adProvinces.length === 0) {
      score += 1;
    } else if (userProvince && adProvinces.includes(userProvince)) {
      score += 2;
    }

    return { ...ad, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  const result = (scored as any[]).slice(0, 5).map(({ _score, target_industries, target_provinces, ...ad }) => ad);

  return NextResponse.json({ ads: result });
}


