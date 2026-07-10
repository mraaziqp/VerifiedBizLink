import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * PUT: Update API key (e.g., deactivate)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { active } = body;

    if (active === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: active' },
        { status: 400 }
      );
    }

    const result = await db`
      UPDATE api_keys
      SET active = ${active}
      WHERE id = ${id}
      RETURNING id, name, app_name, active, updated_at
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      key: result[0]
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('API key update error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to update API key', detail: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db`
      DELETE FROM api_keys
      WHERE id = ${id}
      RETURNING id, name, app_name
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key "${result[0].name}" has been revoked`
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('API key deletion error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to revoke API key', detail: errorMsg },
      { status: 500 }
    );
  }
}
