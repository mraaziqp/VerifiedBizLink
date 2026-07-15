import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/site-settings — public read of homepage appearance settings
export async function GET() {
  try {
    const rows = await db`SELECT key, value FROM site_settings WHERE key IN ('home_hero_image_url', 'home_hero_opacity')`;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      heroImageUrl: map.home_hero_image_url || '/hero-cape-town.jpg',
      heroOpacity: map.home_hero_opacity !== undefined ? parseFloat(map.home_hero_opacity) : 0.16,
    });
  } catch (error) {
    console.error('Site settings GET error:', error);
    return NextResponse.json({ heroImageUrl: '/hero-cape-town.jpg', heroOpacity: 0.16 });
  }
}
