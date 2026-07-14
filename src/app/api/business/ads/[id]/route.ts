import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { AD_LIMITS, getEffectivePackage } from '@/lib/tiers';

async function findOwnedAd(userId: string, adId: string) {
  const rows = await db`
    SELECT a.id, a.is_active, b.id AS business_id, b.package_type, b.trial_package, b.trial_ends_at
    FROM ads a
    JOIN businesses b ON b.id = a.business_id
    WHERE a.id = ${adId} AND b.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// PATCH /api/business/ads/[id] — toggle active/paused, or edit fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await findOwnedAd(session.id, id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();

  if (typeof body.isActive === 'boolean') {
    if (body.isActive && !existing.is_active) {
      const limit = AD_LIMITS[getEffectivePackage(existing)] ?? 0;
      const [{ count }] = await db`
        SELECT COUNT(*)::int AS count FROM ads
        WHERE business_id = ${existing.business_id} AND is_active = true AND id != ${id}
      `;
      if (count >= limit) {
        return NextResponse.json(
          { error: `Your plan allows ${limit} active ad${limit === 1 ? '' : 's'}. Pause another one first.` },
          { status: 403 }
        );
      }
    }
    const [ad] = await db`
      UPDATE ads SET is_active = ${body.isActive} WHERE id = ${id}
      RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at
    `;
    return NextResponse.json({ ad });
  }

  const { title, description, ctaText, ctaUrl, badge } = body;
  const [ad] = await db`
    UPDATE ads SET
      title = COALESCE(NULLIF(${title ?? null}, ''), title),
      description = COALESCE(NULLIF(${description ?? null}, ''), description),
      cta_text = COALESCE(${ctaText ?? null}, cta_text),
      cta_url = COALESCE(${ctaUrl ?? null}, cta_url),
      badge = COALESCE(${badge ?? null}, badge)
    WHERE id = ${id}
    RETURNING id, title, description, cta_text, cta_url, badge, is_boosted, is_active, created_at, expires_at
  `;
  return NextResponse.json({ ad });
}

// DELETE /api/business/ads/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await findOwnedAd(session.id, id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db`DELETE FROM ads WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
