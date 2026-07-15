import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// GET /api/admin/site-settings — current homepage appearance settings (admin view)
export async function GET() {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rows = await db`SELECT key, value FROM site_settings`;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({
    heroImageUrl: map.home_hero_image_url || '/hero-cape-town.jpg',
    heroOpacity: map.home_hero_opacity !== undefined ? parseFloat(map.home_hero_opacity) : 0.16,
  });
}

// PUT /api/admin/site-settings — update homepage hero image and/or opacity
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { heroImageUrl, heroOpacity } = await request.json();

  if (heroOpacity !== undefined && (typeof heroOpacity !== 'number' || heroOpacity < 0 || heroOpacity > 1)) {
    return NextResponse.json({ error: 'Opacity must be a number between 0 and 1' }, { status: 400 });
  }

  if (heroImageUrl !== undefined) {
    await db`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES ('home_hero_image_url', ${heroImageUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${heroImageUrl}, updated_at = NOW()
    `;
  }
  if (heroOpacity !== undefined) {
    await db`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES ('home_hero_opacity', ${String(heroOpacity)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${String(heroOpacity)}, updated_at = NOW()
    `;
  }

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session.id}, ${session.fullName}, 'Updated homepage appearance', 'site_settings', 'home_hero')
  `.catch(() => {});

  return NextResponse.json({ success: true });
}
