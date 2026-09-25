import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAdLimit, getEffectivePackage } from '@/lib/tiers';
import { AD_TEXT_LIMITS, cleanAdLink } from '@/lib/ads';

async function findOwnedAd(userId: string, adId: string) {
  const rows = await db`
    SELECT a.id, a.is_active, a.expires_at, b.id AS business_id, b.package_type, b.trial_package, b.trial_ends_at
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
      if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This ad's paid run has ended. Create a new ad to keep advertising." },
          { status: 403 }
        );
      }
      const limit = await getAdLimit(getEffectivePackage(existing));
      const [{ count }] = await db`
        SELECT COUNT(*)::int AS count FROM ads
        WHERE business_id = ${existing.business_id} AND is_active = true AND id != ${id}
      `;
      // 0 = the plan sets no cap, same rule as creating an ad. Treating it as
      // "zero allowed" meant a free-plan ad, once paused, could never resume.
      if (limit > 0 && count >= limit) {
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

  const title = body.title === undefined ? null : String(body.title).trim();
  const description = body.description === undefined ? null : String(body.description).trim();
  if ((title && title.length > AD_TEXT_LIMITS.title) || (description && description.length > AD_TEXT_LIMITS.description)) {
    return NextResponse.json(
      { error: `Keep the title under ${AD_TEXT_LIMITS.title} characters and the description under ${AD_TEXT_LIMITS.description}.` },
      { status: 400 },
    );
  }
  const ctaUrl = body.ctaUrl === undefined ? null : cleanAdLink(body.ctaUrl);
  if (body.ctaUrl !== undefined && ctaUrl === null) {
    return NextResponse.json({ error: 'The button link must be a website address (https://…) or a page on VerifiedBizLink.' }, { status: 400 });
  }
  const ctaText = body.ctaText === undefined ? null : String(body.ctaText).trim().slice(0, AD_TEXT_LIMITS.ctaText);
  const badge = body.badge === undefined ? null : String(body.badge).trim().slice(0, AD_TEXT_LIMITS.badge);
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
