import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/ads
 * Admin endpoint to list, search, and monitor all ads platform-wide
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const slot = searchParams.get('slot');
    const search = searchParams.get('q')?.trim().toLowerCase();

    const ads = (await db`
      SELECT
        a.id, a.business_id, a.title, a.description, a.business_name,
        a.cta_text, a.cta_url, a.badge, a.is_boosted, a.is_active,
        a.boost_expires_at, a.created_at, a.expires_at, a.duration_days,
        a.impressions, a.clicks,
        COALESCE(a.slot_placement, 'feed_inline') AS slot_placement,
        a.image_url, a.media_type,
        COALESCE(a.credits_spent, 0) AS credits_spent,
        COALESCE(a.status, CASE WHEN a.is_active THEN 'active' ELSE 'paused' END) AS status,
        a.admin_notes,
        b.company_name, b.package_type, b.ad_credits,
        u.email AS owner_email, u.full_name AS owner_name
      FROM ads a
      JOIN businesses b ON b.id = a.business_id
      JOIN users u ON u.id = b.user_id
      ORDER BY a.created_at DESC
    `) as unknown as Row[];

    let filtered = ads;
    if (status && status !== 'all') {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (slot && slot !== 'all') {
      filtered = filtered.filter((a) => a.slot_placement === slot);
    }
    if (search) {
      filtered = filtered.filter((a) =>
        String(a.title || '').toLowerCase().includes(search) ||
        String(a.business_name || '').toLowerCase().includes(search) ||
        String(a.company_name || '').toLowerCase().includes(search) ||
        String(a.owner_email || '').toLowerCase().includes(search)
      );
    }

    const totals = {
      totalAds: ads.length,
      activeAds: ads.filter((a) => a.is_active && a.status === 'active').length,
      pausedAds: ads.filter((a) => !a.is_active || a.status === 'paused').length,
      totalImpressions: ads.reduce((sum, a) => sum + (Number(a.impressions) || 0), 0),
      totalClicks: ads.reduce((sum, a) => sum + (Number(a.clicks) || 0), 0),
      totalCreditsSpent: ads.reduce((sum, a) => sum + (Number(a.credits_spent) || 0), 0),
    };

    return NextResponse.json({ ads: filtered, totals });
  } catch (error) {
    console.error('Admin ads GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ads
 * Admin endpoint to update ad status, extend duration, or change placement
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, slotPlacement, extendDays, isBoosted, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ad ID required' }, { status: 400 });
    }

    const [ad] = await db`SELECT * FROM ads WHERE id = ${id} LIMIT 1`;
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const isActive = status === 'active';
    let expiresAt = ad.expires_at ? new Date(ad.expires_at) : new Date();

    if (extendDays && Number(extendDays) > 0) {
      const baseDate = expiresAt > new Date() ? expiresAt : new Date();
      baseDate.setDate(baseDate.getDate() + Number(extendDays));
      expiresAt = baseDate;
    }

    await db`
      UPDATE ads
      SET
        status = COALESCE(${status}, status),
        is_active = COALESCE(${isActive}, is_active),
        slot_placement = COALESCE(${slotPlacement}, slot_placement),
        is_boosted = COALESCE(${isBoosted}, is_boosted),
        admin_notes = COALESCE(${adminNotes}, admin_notes),
        expires_at = ${expiresAt.toISOString()}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, message: 'Ad updated successfully' });
  } catch (error) {
    console.error('Admin ads PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/ads
 * Delete an ad from the platform
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Ad ID required' }, { status: 400 });

    await db`DELETE FROM ads WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Ad deleted' });
  } catch (error) {
    console.error('Admin ads DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 });
  }
}
