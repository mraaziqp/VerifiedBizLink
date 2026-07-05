import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

// GET all features for a tier
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
    const features = await db`
      SELECT
        id,
        tier_id,
        feature_name,
        feature_description,
        is_enabled,
        monthly_limit,
        created_at
      FROM tier_features
      WHERE tier_id = ${id}
      ORDER BY feature_name ASC
    `;

    return NextResponse.json(features);
  } catch (error) {
    console.error('Error fetching tier features:', error);
    return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
  }
}

// POST add feature to tier
export async function POST(
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
    const { feature_name, feature_description, is_enabled = true, monthly_limit } = body;

    if (!feature_name) {
      return NextResponse.json(
        { error: 'Missing required field: feature_name' },
        { status: 400 }
      );
    }

    // Check if tier exists
    const tier = await db`SELECT id FROM subscription_tiers WHERE id = ${id}`;
    if (tier.length === 0) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    const result = await db`
      INSERT INTO tier_features
        (tier_id, feature_name, feature_description, is_enabled, monthly_limit)
      VALUES
        (${id}, ${feature_name}, ${feature_description || null}, ${is_enabled}, ${monthly_limit || null})
      ON CONFLICT (tier_id, feature_name) DO UPDATE
      SET is_enabled = ${is_enabled}, feature_description = ${feature_description || null}
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error adding feature:', error);
    return NextResponse.json({ error: 'Failed to add feature' }, { status: 500 });
  }
}

// PUT update feature
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
    const { feature_id, is_enabled, monthly_limit, feature_description } = body;

    if (!feature_id) {
      return NextResponse.json(
        { error: 'Missing required field: feature_id' },
        { status: 400 }
      );
    }

    const result = await db`
      UPDATE tier_features
      SET
        is_enabled = ${is_enabled},
        monthly_limit = ${monthly_limit || null},
        feature_description = ${feature_description || null}
      WHERE id = ${feature_id} AND tier_id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json({ error: 'Failed to update feature' }, { status: 500 });
  }
}

// DELETE remove feature from tier
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
    const { searchParams } = new URL(req.url);
    const feature_id = searchParams.get('feature_id');

    if (!feature_id) {
      return NextResponse.json(
        { error: 'Missing required query param: feature_id' },
        { status: 400 }
      );
    }

    const result = await db`
      DELETE FROM tier_features
      WHERE id = ${feature_id} AND tier_id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json({ error: 'Failed to delete feature' }, { status: 500 });
  }
}
