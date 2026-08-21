import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/ads — returns active ads with optional slot filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slot = searchParams.get('slot');
    const limit = Number(searchParams.get('limit') || 10);

    // Check if ads are globally enabled
    const [setting] = await db`SELECT value FROM ad_settings WHERE key = 'ads_enabled' LIMIT 1`.catch(() => []);
    if (setting && setting.value === 'false') {
      return NextResponse.json({ ads: [] });
    }

    let ads;
    if (slot) {
      ads = await db`
        SELECT id, business_id, title, description, business_name, cta_text, cta_url, badge,
               is_boosted, slot_placement, image_url, impressions, clicks
        FROM ads
        WHERE is_active = true
          AND (status = 'active' OR status IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
          AND slot_placement = ${slot}
        ORDER BY is_boosted DESC, created_at DESC
        LIMIT ${limit}
      `;
    } else {
      ads = await db`
        SELECT id, business_id, title, description, business_name, cta_text, cta_url, badge,
               is_boosted, slot_placement, image_url, impressions, clicks
        FROM ads
        WHERE is_active = true
          AND (status = 'active' OR status IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY is_boosted DESC, created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ ads });
  } catch (err) {
    console.error('Public ads error:', err);
    return NextResponse.json({ ads: [] });
  }
}
