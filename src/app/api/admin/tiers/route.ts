import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAllTiers, mapTierRow } from '@/lib/tiers';
import { STAFF_ROLES, FINANCE_ROLES, hasRole } from '@/lib/roles';

// GET /api/admin/tiers — all tiers including inactive ones (admin management view)
export async function GET() {
  const session = await getSession();
  if (!session || !hasRole(session.role, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [tiers, counts] = await Promise.all([
    getAllTiers(true),
    db`
      SELECT
        CASE
          WHEN trial_package IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW()
          THEN trial_package
          ELSE COALESCE(package_type, 'free')
        END AS effective_key,
        COUNT(*)::int AS business_count
      FROM businesses
      GROUP BY 1
    `.catch(() => []),
  ]);
  const countMap = new Map<string, number>();
  for (const row of counts as Array<{ effective_key: string; business_count: number }>) {
    countMap.set(String(row.effective_key), Number(row.business_count || 0));
  }
  return NextResponse.json({
    tiers: tiers.map((t) => ({ ...t, businessCount: countMap.get(t.key) ?? 0 })),
  });
}

// POST /api/admin/tiers — create a new tier
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session.role, FINANCE_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key, name, price, adLimit, monthlyAdCredits, features, note, sortOrder, isPurchasable } = await request.json();

  if (!key || typeof key !== 'string' || !/^[a-z0-9_]+$/.test(key)) {
    return NextResponse.json({ error: 'Key is required and must be lowercase letters, numbers, or underscores' }, { status: 400 });
  }
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (typeof price !== 'number' || price < 0) {
    return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
  }
  if (typeof adLimit !== 'number' || adLimit < 0) {
    return NextResponse.json({ error: 'Ad limit must be a non-negative number' }, { status: 400 });
  }
  if (typeof monthlyAdCredits !== 'number' || monthlyAdCredits < 0) {
    return NextResponse.json({ error: 'Monthly ad credits must be a non-negative number' }, { status: 400 });
  }

  const existing = await db`SELECT key FROM tiers WHERE key = ${key}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'A tier with this key already exists' }, { status: 409 });
  }

  const [tier] = await db`
    INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, note, sort_order, is_purchasable)
    VALUES (${key}, ${name}, ${price}, ${adLimit}, ${monthlyAdCredits}, ${JSON.stringify(features || [])}, ${note || null}, ${sortOrder ?? 99}, ${isPurchasable ?? true})
    RETURNING *
  `;

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session.id}, ${session.fullName}, ${'Created tier: ' + name}, 'tier', ${key})
  `.catch(() => {});

  return NextResponse.json({ tier: { ...mapTierRow(tier), businessCount: 0 } }, { status: 201 });
}
