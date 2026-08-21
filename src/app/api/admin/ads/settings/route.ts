import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/ads/settings
 * Read all global ad settings & slot rules
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = (await db`SELECT key, value FROM ad_settings`) as unknown as Row[];
    const settings: Record<string, string> = {};
    rows.forEach((r) => {
      settings[r.key as string] = r.value as string;
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin ad settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load ad settings' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ads/settings
 * Update global ad settings & slot rules
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings object' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db`
        INSERT INTO ad_settings (key, value, updated_at)
        VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
      `;
    }

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Admin ad settings POST error:', error);
    return NextResponse.json({ error: 'Failed to update ad settings' }, { status: 500 });
  }
}
