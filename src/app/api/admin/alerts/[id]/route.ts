import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth';

/**
 * PUT: Update alert status (acknowledge, resolve). acknowledged_by/resolved_by
 * are always the acting staff member's own name — never trust the client for
 * who performed the action.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, suggestedFix } = body;

    if (!status && !suggestedFix) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const actor = session!.fullName;

    const result = await db`
      UPDATE alerts SET
        status = COALESCE(${status ?? null}, status),
        acknowledged_by = CASE WHEN ${status}::text = 'acknowledged' THEN ${actor} ELSE acknowledged_by END,
        acknowledged_at = CASE WHEN ${status}::text = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
        resolved_by = CASE WHEN ${status}::text = 'resolved' THEN ${actor} ELSE resolved_by END,
        resolved_at = CASE WHEN ${status}::text = 'resolved' THEN NOW() ELSE resolved_at END,
        agent_suggested_fix = COALESCE(${suggestedFix ?? null}, agent_suggested_fix),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status, acknowledged_by, resolved_by, updated_at
    `;

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
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
