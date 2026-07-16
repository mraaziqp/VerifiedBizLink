import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const DEFAULTS = {
  profileVisibility: 'verified_only',
  showInSearch: true,
  allowMessages: true,
  shareAnalytics: false,
  marketingConsent: false,
};

// GET /api/users/privacy-settings
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`SELECT privacy_settings FROM users WHERE id = ${session.id}`;
  const settings = { ...DEFAULTS, ...(rows[0]?.privacy_settings || {}) };
  return NextResponse.json({ settings });
}

// PUT /api/users/privacy-settings
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { settings } = await request.json();
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object required' }, { status: 400 });
  }

  const rows = await db`
    UPDATE users SET privacy_settings = ${JSON.stringify(settings)}, updated_at = NOW()
    WHERE id = ${session.id}
    RETURNING privacy_settings
  `;

  return NextResponse.json({ settings: rows[0]?.privacy_settings });
}
