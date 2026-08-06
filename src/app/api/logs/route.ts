import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

/**
 * Comprehensive audit logging system
 * Tracks all user actions for compliance and debugging
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, resourceType, resourceId, oldValue, newValue, status, details } = body;

    if (!userId || !action || !resourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action, resourceType' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert log into database
    const result = await db`
      INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        ip_address,
        user_agent,
        status,
        details,
        created_at
      ) VALUES (
        ${userId},
        ${action},
        ${resourceType},
        ${resourceId || null},
        ${oldValue ? JSON.stringify(oldValue) : null},
        ${newValue ? JSON.stringify(newValue) : null},
        ${ip},
        ${userAgent},
        ${status},
        ${details || null},
        NOW()
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      log: result[0],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Logging error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to create log entry', detail: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const action = request.nextUrl.searchParams.get('action');
    const resourceType = request.nextUrl.searchParams.get('resourceType');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    // Fetch logs using template literals
    let logs: any[] = [];

    if (userId && action && resourceType) {
      logs = await db`
        SELECT * FROM audit_logs
        WHERE user_id = ${userId} AND action = ${action} AND resource_type = ${resourceType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (userId && action) {
      logs = await db`
        SELECT * FROM audit_logs
        WHERE user_id = ${userId} AND action = ${action}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (userId) {
      logs = await db`
        SELECT * FROM audit_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (action) {
      logs = await db`
        SELECT * FROM audit_logs
        WHERE action = ${action}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (resourceType) {
      logs = await db`
        SELECT * FROM audit_logs
        WHERE resource_type = ${resourceType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      logs = await db`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count
    let total = 0;
    if (userId && action && resourceType) {
      const countResult = await db`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = ${userId} AND action = ${action} AND resource_type = ${resourceType}
      `;
      total = countResult[0]?.count || 0;
    } else if (userId && action) {
      const countResult = await db`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = ${userId} AND action = ${action}
      `;
      total = countResult[0]?.count || 0;
    } else if (userId) {
      const countResult = await db`
        SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ${userId}
      `;
      total = countResult[0]?.count || 0;
    } else if (action) {
      const countResult = await db`
        SELECT COUNT(*) as count FROM audit_logs WHERE action = ${action}
      `;
      total = countResult[0]?.count || 0;
    } else if (resourceType) {
      const countResult = await db`
        SELECT COUNT(*) as count FROM audit_logs WHERE resource_type = ${resourceType}
      `;
      total = countResult[0]?.count || 0;
    } else {
      const countResult = await db`SELECT COUNT(*) as count FROM audit_logs`;
      total = countResult[0]?.count || 0;
    }

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
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
