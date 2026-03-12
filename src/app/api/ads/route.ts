import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/ads — returns active ads
export async function GET() {
  try {
    const ads = await db`
      SELECT id, title, description, business_name, cta_text, cta_url, badge, is_boosted
      FROM ads
      WHERE is_active = true
      ORDER BY is_boosted DESC, created_at DESC
      LIMIT 10
    `;
    return NextResponse.json({ ads });
  } catch {
    return NextResponse.json({ ads: [] });
  }
}
