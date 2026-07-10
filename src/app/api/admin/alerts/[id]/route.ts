import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * PUT: Update alert status (acknowledge, resolve)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, acknowledgedBy, resolvedBy, suggestedFix } = body;

    let updateFields: string[] = [];
    let updateValues: any[] = [];

    if (status) {
      updateFields.push(`status = $${updateFields.length + 1}`);
      updateValues.push(status);
    }

    if (status === 'acknowledged' && acknowledgedBy) {
      updateFields.push(`acknowledged_by = $${updateFields.length + 1}`);
      updateValues.push(acknowledgedBy);
      updateFields.push(`acknowledged_at = NOW()`);
    }

    if (status === 'resolved' && resolvedBy) {
      updateFields.push(`resolved_by = $${updateFields.length + 1}`);
      updateValues.push(resolvedBy);
      updateFields.push(`resolved_at = NOW()`);
    }

    if (suggestedFix) {
      updateFields.push(`agent_suggested_fix = $${updateFields.length + 1}`);
      updateValues.push(suggestedFix);
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const query = `
      UPDATE alerts
      SET ${updateFields.join(', ')}
      WHERE id = $${updateFields.length}
      RETURNING id, status, acknowledged_by, resolved_by, updated_at
    `;

    updateValues.push(id);

    const result = await db(query as any, ...updateValues);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: result[0]
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Alert update error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to update alert', detail: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET: Fetch a specific alert with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alert = await db`
      SELECT id, rule_id, app_name, severity, title, description,
             affected_users, status, log_samples, agent_suggested_fix,
             acknowledged_by, acknowledged_at, resolved_by, resolved_at,
             created_at, updated_at
      FROM alerts
      WHERE id = ${id}
    `;

    if (!alert || alert.length === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: alert[0]
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Alert fetch error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch alert', detail: errorMsg },
      { status: 500 }
    );
  }
}
