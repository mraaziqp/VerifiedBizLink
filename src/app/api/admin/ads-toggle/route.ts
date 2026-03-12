import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth';

// POST /api/admin/ads-toggle — enable/disable ads globally
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enabled } = await req.json();

  try {
    await db`
      INSERT INTO ad_settings (key, value, updated_at)
      VALUES ('ads_enabled', ${enabled ? 'true' : 'false'}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return NextResponse.json({ success: true, enabled });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
