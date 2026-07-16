import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { getSession, isStaff } from '@/lib/auth';

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  return `vbz_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash API key for storage (one-way)
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * POST: Create a new API key
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, appName, environment = 'production', expiresInDays } = body;

    if (!name || !appName) {
      return NextResponse.json(
        { error: 'Missing required fields: name, appName' },
        { status: 400 }
      );
    }

    // Generate API key
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    // Calculate expiration if specified
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Store hashed key
    const result = await db`
      INSERT INTO api_keys (
        name,
        key_hash,
        app_name,
        environment,
        active,
        expires_at,
        created_at
      ) VALUES (
        ${name},
        ${keyHash},
        ${appName},
        ${environment},
        true,
        ${expiresAt ? expiresAt.toISOString() : null},
        NOW()
      )
      RETURNING id, name, app_name, environment, created_at, expires_at
    `;

    return NextResponse.json({
      success: true,
      key: plainKey, // Only return the plain key once, to the user
      keyData: result[0],
      warning: 'Save this key securely. You will not be able to view it again.'
    }, { status: 201 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('API key creation error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to create API key', detail: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET: List all API keys (mask the actual keys)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const appName = request.nextUrl.searchParams.get('appName');

    const keys = await db`
      SELECT id, name, app_name, environment, active,
             SUBSTRING(key_hash, 1, 8) || '...' as key_preview,
             last_used_at, expires_at, created_at
      FROM api_keys
      WHERE ${appName}::text IS NULL OR app_name = ${appName}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      keys
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('API key fetch error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch API keys', detail: errorMsg },
      { status: 500 }
    );
  }
}
