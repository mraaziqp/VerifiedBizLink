import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Admin-only (not banker/lawyer) — sales-agent performance data, not a
// general moderation tool.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db`
      SELECT
        b.id, b.company_name, b.assisted_by, b.package_type, b.status,
        b.created_at, u.full_name AS owner_name, u.email AS owner_email
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      WHERE b.assisted_signup = true
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json({ signups: rows });
  } catch (error) {
    console.error('Agent signups error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent signups' }, { status: 500 });
  }
}
