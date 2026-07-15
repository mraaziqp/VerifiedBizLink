import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// [id] here is the tier's `key` (e.g. 'standard'), not a UUID — tiers are
// keyed by a short slug since that's what businesses.package_type stores.

// GET /api/admin/tiers/[id] — single tier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const [tier] = await db`SELECT * FROM tiers WHERE key = ${id}`;
  if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
  return NextResponse.json({ tier });
}

// PUT /api/admin/tiers/[id] — update a tier's price, limits, features, or active state
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db`SELECT key FROM tiers WHERE key = ${id}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, price, adLimit, monthlyAdCredits, features, note, sortOrder, isActive } = body;

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
  }
  if (adLimit !== undefined && (typeof adLimit !== 'number' || adLimit < 0)) {
    return NextResponse.json({ error: 'Ad limit must be a non-negative number' }, { status: 400 });
  }
  if (monthlyAdCredits !== undefined && (typeof monthlyAdCredits !== 'number' || monthlyAdCredits < 0)) {
    return NextResponse.json({ error: 'Monthly ad credits must be a non-negative number' }, { status: 400 });
  }

  const [tier] = await db`
    UPDATE tiers SET
      name = COALESCE(${name}, name),
      price = COALESCE(${price}, price),
      ad_limit = COALESCE(${adLimit}, ad_limit),
      monthly_ad_credits = COALESCE(${monthlyAdCredits}, monthly_ad_credits),
      features = COALESCE(${features ? JSON.stringify(features) : null}, features),
      note = COALESCE(${note}, note),
      sort_order = COALESCE(${sortOrder}, sort_order),
      is_active = COALESCE(${isActive}, is_active),
      updated_at = NOW()
    WHERE key = ${id}
    RETURNING *
  `;

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session.id}, ${session.fullName}, ${'Updated tier: ' + tier.name}, 'tier', ${id})
  `.catch(() => {});

  return NextResponse.json({ tier });
}

// DELETE /api/admin/tiers/[id] — soft-delete (deactivate) a tier.
// Never hard-deletes: businesses may still have package_type set to this
// key, and hard-deleting would break their ad-limit/price lookups.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [businessCount] = await db`SELECT COUNT(*)::int AS n FROM businesses WHERE package_type = ${id}`;

  const [tier] = await db`
    UPDATE tiers SET is_active = false, updated_at = NOW()
    WHERE key = ${id}
    RETURNING *
  `;
  if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session.id}, ${session.fullName}, ${'Deactivated tier: ' + tier.name}, 'tier', ${id})
  `.catch(() => {});

  return NextResponse.json({
    success: true,
    tier,
    warning: businessCount.n > 0
      ? `${businessCount.n} business${businessCount.n === 1 ? ' is' : 'es are'} currently on this tier. They'll keep their existing ad limit/price until moved to another tier.`
      : null,
  });
}
