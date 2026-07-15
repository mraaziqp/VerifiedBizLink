import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAllTiers } from '@/lib/tiers';

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// GET /api/admin/tiers — all tiers including inactive ones (admin management view)
export async function GET() {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tiers = await getAllTiers(true);
  return NextResponse.json({ tiers });
}

// POST /api/admin/tiers — create a new tier
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key, name, price, adLimit, monthlyAdCredits, features, note, sortOrder } = await request.json();

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
    INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, note, sort_order)
    VALUES (${key}, ${name}, ${price}, ${adLimit}, ${monthlyAdCredits}, ${JSON.stringify(features || [])}, ${note || null}, ${sortOrder ?? 99})
    RETURNING *
  `;

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session.id}, ${session.fullName}, ${'Created tier: ' + name}, 'tier', ${key})
  `.catch(() => {});

  return NextResponse.json({ tier }, { status: 201 });
}
