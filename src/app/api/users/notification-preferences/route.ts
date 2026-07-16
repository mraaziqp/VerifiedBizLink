import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const DEFAULTS = {
  emailVerification: true,
  connectionRequests: true,
  vettingUpdates: true,
  paymentReceipts: true,
  weeklyDigest: false,
  complianceAlerts: true,
  systemUpdates: true,
  marketingEmails: false,
};

// GET /api/users/notification-preferences
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`SELECT notification_preferences FROM users WHERE id = ${session.id}`;
  const preferences = { ...DEFAULTS, ...(rows[0]?.notification_preferences || {}) };
  return NextResponse.json({ preferences });
}

// PUT /api/users/notification-preferences
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { preferences } = await request.json();
  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json({ error: 'preferences object required' }, { status: 400 });
  }

  const rows = await db`
    UPDATE users SET notification_preferences = ${JSON.stringify(preferences)}, updated_at = NOW()
    WHERE id = ${session.id}
    RETURNING notification_preferences
  `;

  return NextResponse.json({ preferences: rows[0]?.notification_preferences });
}
