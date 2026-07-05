import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

// GET all tiers
export async function GET() {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const tiers = await db`
      SELECT
        id, name, description, price_usd, price_zar,
        billing_interval, is_active, display_order,
        stripe_product_id, paypal_plan_id,
        created_at, updated_at
      FROM subscription_tiers
      ORDER BY display_order ASC
    `;

    return NextResponse.json(tiers);
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

// POST create new tier
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price_usd, price_zar, billing_interval, features, permissions, display_order } = body;

    if (!name || price_usd === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price_usd' },
        { status: 400 }
      );
    }

    const result = await db`
      INSERT INTO subscription_tiers
        (name, description, price_usd, price_zar, billing_interval, features, permissions, display_order, is_active)
      VALUES
        (${name}, ${description || null}, ${price_usd}, ${price_zar || 0}, ${billing_interval || 'monthly'},
         ${JSON.stringify(features || {})}, ${JSON.stringify(permissions || {})}, ${display_order || 0}, true)
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating tier:', error);
    return NextResponse.json({ error: 'Failed to create tier' }, { status: 500 });
  }
}
