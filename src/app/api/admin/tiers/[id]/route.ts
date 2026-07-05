import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

// GET single tier with features
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tier = await db`
      SELECT
        id, name, description, price_usd, price_zar,
        billing_interval, is_active, display_order,
        stripe_product_id, paypal_plan_id,
        features, permissions,
        created_at, updated_at
      FROM subscription_tiers
      WHERE id = ${id}
    `;

    if (tier.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    const features = await db`
      SELECT id, feature_name, feature_description, is_enabled, monthly_limit
      FROM tier_features
      WHERE tier_id = ${id}
      ORDER BY feature_name ASC
    `;

    return NextResponse.json({
      ...tier[0],
      features,
    });
  } catch (error) {
    console.error('Error fetching tier:', error);
    return NextResponse.json({ error: 'Failed to fetch tier' }, { status: 500 });
  }
}

// PUT update tier
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, price_usd, price_zar, billing_interval, is_active, display_order, features, permissions } = body;

    // Check if tier exists
    const existing = await db`SELECT id FROM subscription_tiers WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    const result = await db`
      UPDATE subscription_tiers
      SET
        name = ${name},
        description = ${description || null},
        price_usd = ${price_usd},
        price_zar = ${price_zar || 0},
        billing_interval = ${billing_interval || 'monthly'},
        is_active = ${is_active !== undefined ? is_active : true},
        display_order = ${display_order || 0},
        features = ${JSON.stringify(features || {})},
        permissions = ${JSON.stringify(permissions || {})},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating tier:', error);
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}

// DELETE tier
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db`SELECT id FROM subscription_tiers WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    await db`DELETE FROM subscription_tiers WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tier:', error);
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
  }
}
