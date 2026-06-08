import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET user's current subscription
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subscription = await db`
      SELECT
        us.id,
        us.user_id,
        us.tier_id,
        st.name as tier_name,
        st.price_usd,
        st.price_zar,
        us.status,
        us.started_at,
        us.renews_at,
        us.cancelled_at,
        us.ends_at,
        us.permission_overrides,
        us.created_at,
        us.updated_at
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.id
      WHERE us.user_id = ${id} AND us.status = 'active'
      ORDER BY us.started_at DESC
      LIMIT 1
    `;

    if (subscription.length === 0) {
      return NextResponse.json(
        { message: 'No active subscription found', subscription: null },
        { status: 200 }
      );
    }

    return NextResponse.json(subscription[0]);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// POST create or update subscription
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tier_id, status = 'active', renews_at, permission_overrides } = body;

    if (!tier_id) {
      return NextResponse.json(
        { error: 'Missing required field: tier_id' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db`SELECT id FROM users WHERE id = ${id}`;
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if tier exists
    const tier = await db`SELECT id FROM subscription_tiers WHERE id = ${tier_id}`;
    if (tier.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Deactivate existing subscriptions
    await db`
      UPDATE user_subscriptions
      SET status = 'replaced'
      WHERE user_id = ${id} AND status = 'active'
    `;

    // Create new subscription
    const result = await db`
      INSERT INTO user_subscriptions
        (user_id, tier_id, status, started_at, renews_at, permission_overrides)
      VALUES
        (${id}, ${tier_id}, ${status}, NOW(), ${renews_at || null}, ${JSON.stringify(permission_overrides || {})})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

// PUT update subscription status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { subscription_id, status, permission_overrides } = body;

    if (!subscription_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: subscription_id, status' },
        { status: 400 }
      );
    }

    const result = await db`
      UPDATE user_subscriptions
      SET status = ${status}, permission_overrides = ${JSON.stringify(permission_overrides || {})}
      WHERE id = ${subscription_id} AND user_id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
