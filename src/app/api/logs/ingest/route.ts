import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { getSession, isStaff } from '@/lib/auth';

// Hash API key for comparison (never store raw keys)
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Log ingestion endpoint
 * Receives logs from all apps and stores them for monitoring
 * Requires API key authentication via header: Authorization: Bearer <key>
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
    const keyHash = hashApiKey(apiKey);

    // Verify API key
    const keyResult = await db`
      SELECT id, app_name, active, expires_at FROM api_keys
      WHERE key_hash = ${keyHash}
      LIMIT 1
    `;

    if (!keyResult || keyResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const apiKeyData = keyResult[0];

    // Check if key is active and not expired
    if (!apiKeyData.active) {
      return NextResponse.json(
        { error: 'API key is inactive' },
        { status: 403 }
      );
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'API key has expired' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      appName,
      environment = 'production',
      logLevel,
      message,
      errorCode,
      errorStack,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      userId,
      metadata = {}
    } = body;

    // Validate required fields
    if (!logLevel || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: logLevel, message' },
        { status: 400 }
      );
    }

    // Extract IP from request
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store log
    const logResult = await db`
      INSERT INTO application_logs (
        api_key_id,
        app_name,
        environment,
        log_level,
        message,
        error_code,
        error_stack,
        endpoint,
        method,
        status_code,
        response_time_ms,
        user_id,
        ip_address,
        user_agent,
        metadata,
        created_at
      ) VALUES (
        ${apiKeyData.id},
        ${appName || apiKeyData.app_name},
        ${environment},
        ${logLevel.toUpperCase()},
        ${message},
        ${errorCode || null},
        ${errorStack || null},
        ${endpoint || null},
        ${method || null},
        ${statusCode || null},
        ${responseTimeMs || null},
        ${userId || null},
        ${ip},
        ${userAgent},
        ${JSON.stringify(metadata)},
        NOW()
      )
      RETURNING id, created_at
    `;

    // Update last_used_at timestamp
    await db`
      UPDATE api_keys
      SET last_used_at = NOW()
      WHERE id = ${apiKeyData.id}
    `;

    // Check if this log should trigger an alert
    if (logLevel === 'ERROR' || logLevel === 'FATAL') {
      await checkAndTriggerAlerts(
        apiKeyData.app_name,
        environment,
        logLevel,
        errorCode,
        logResult[0].id
      );
    }

    return NextResponse.json({
      success: true,
      logId: logResult[0].id,
      timestamp: logResult[0].created_at
    }, { status: 201 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Log ingestion error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to ingest log', detail: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * Check if log should trigger an alert based on rules
 */
async function checkAndTriggerAlerts(
  appName: string,
  environment: string,
  logLevel: string,
  errorCode: string | null,
  _logId: string
) {
  try {
    // Get relevant alert rules
    const rules = await db`
      SELECT id, name, condition, threshold, time_window_minutes, log_level, error_code_pattern
      FROM alert_rules
      WHERE enabled = true
        AND (app_name IS NULL OR app_name = ${appName})
        AND (log_level IS NULL OR log_level = ${logLevel})
        AND (error_code_pattern IS NULL OR ${errorCode} LIKE error_code_pattern)
      LIMIT 10
    `;

    for (const rule of rules) {
      // Check if rule condition is met
      const timeWindowMs = (rule.time_window_minutes || 5) * 60 * 1000;
      const timeWindow = new Date(Date.now() - timeWindowMs);

      const countResult = await db`
        SELECT COUNT(*) as count FROM application_logs
        WHERE app_name = ${appName}
          AND log_level = ${logLevel}
          AND created_at > ${timeWindow.toISOString()}
      `;

      const errorCount = countResult[0]?.count || 0;

      if (errorCount >= (rule.threshold || 1)) {
        // Get sample logs for alert
        const sampleLogs = await db`
          SELECT id, message, error_code, endpoint, created_at FROM application_logs
          WHERE app_name = ${appName}
            AND log_level = ${logLevel}
            AND created_at > ${timeWindow.toISOString()}
          ORDER BY created_at DESC
          LIMIT 5
        `;

        // Create alert
        await db`
          INSERT INTO alerts (
            rule_id,
            app_name,
            severity,
            title,
            description,
            log_samples,
            status,
            created_at,
            updated_at
          ) VALUES (
            ${rule.id},
            ${appName},
            ${logLevel === 'FATAL' ? 'CRITICAL' : 'ERROR'},
            ${`${rule.name} - ${appName}`},
            ${`${errorCount} ${logLevel.toLowerCase()} events in the last ${rule.time_window_minutes} minutes`},
            ${JSON.stringify(sampleLogs)},
            'open',
            NOW(),
            NOW()
          )
        `;
      }
    }
  } catch (error) {
    console.error('Alert trigger error:', error);
    // Don't fail the log ingestion if alert triggering fails
  }
}

/**
 * GET handler to fetch logs with optional filtering
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const appName = searchParams.get('appName');
    const logLevel = searchParams.get('logLevel');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    const hours = parseInt(searchParams.get('hours') || '24');

    const logs = await db`
      SELECT id, app_name, environment, log_level, message, error_code,
             endpoint, method, status_code, response_time_ms, user_id, created_at
      FROM application_logs
      WHERE created_at > NOW() - (${hours} || ' hours')::interval
        AND (${appName}::text IS NULL OR app_name = ${appName})
        AND (${logLevel}::text IS NULL OR log_level = ${logLevel ? logLevel.toUpperCase() : null})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalResult = await db`
      SELECT COUNT(*) as count FROM application_logs
      WHERE created_at > NOW() - (${hours} || ' hours')::interval
        AND (${appName}::text IS NULL OR app_name = ${appName})
        AND (${logLevel}::text IS NULL OR log_level = ${logLevel ? logLevel.toUpperCase() : null})
    `;
    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Log fetch error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch logs', detail: errorMsg },
      { status: 500 }
    );
  }
}
