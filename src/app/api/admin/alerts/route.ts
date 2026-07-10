import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POST: Create a new alert rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      appName,
      logLevel,
      errorCodePattern,
      condition,
      threshold,
      timeWindowMinutes = 5,
      enabled = true
    } = body;

    if (!name || !condition || !threshold) {
      return NextResponse.json(
        { error: 'Missing required fields: name, condition, threshold' },
        { status: 400 }
      );
    }

    const result = await db`
      INSERT INTO alert_rules (
        name,
        app_name,
        log_level,
        error_code_pattern,
        condition,
        threshold,
        time_window_minutes,
        enabled,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${appName || null},
        ${logLevel || null},
        ${errorCodePattern || null},
        ${condition},
        ${threshold},
        ${timeWindowMinutes},
        ${enabled},
        NOW(),
        NOW()
      )
      RETURNING id, name, app_name, condition, threshold, enabled, created_at
    `;

    return NextResponse.json({
      success: true,
      rule: result[0]
    }, { status: 201 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Alert rule creation error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to create alert rule', detail: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET: List all alert rules and triggered alerts
 */
export async function GET(request: NextRequest) {
  try {
    const alertType = request.nextUrl.searchParams.get('type') || 'rules'; // 'rules' or 'triggered'
    const appName = request.nextUrl.searchParams.get('appName');
    const status = request.nextUrl.searchParams.get('status'); // for triggered alerts

    if (alertType === 'rules') {
      let query = `
        SELECT id, name, app_name, log_level, condition, threshold,
               time_window_minutes, enabled, created_at
        FROM alert_rules
      `;

      if (appName) {
        query += ` WHERE (app_name IS NULL OR app_name = '${appName}')`;
      }

      query += ` ORDER BY created_at DESC`;

      const rules = await db(query as any);

      return NextResponse.json({
        success: true,
        rules
      });
    } else {
      // Return triggered alerts
      let query = `
        SELECT id, rule_id, app_name, severity, title, description,
               affected_users, status, acknowledged_by, resolved_by,
               created_at, updated_at
        FROM alerts
      `;

      const conditions: string[] = [];

      if (appName) {
        conditions.push(`app_name = '${appName}'`);
      }

      if (status) {
        conditions.push(`status = '${status}'`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;

      const alerts = await db(query as any);

      return NextResponse.json({
        success: true,
        alerts
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Alert fetch error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', detail: errorMsg },
      { status: 500 }
    );
  }
}
