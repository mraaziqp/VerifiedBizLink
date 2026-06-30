import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Maps the actual audit_logs schema (user_id / entity_type / entity_id /
    // details) onto the field names the admin UI expects (admin_name /
    // target_type / target_name).
    const logs = await db`
      SELECT
        al.id,
        al.action,
        al.entity_type            AS target_type,
        al.entity_id              AS target_id,
        al.entity_id              AS target_name,
        al.details,
        al.created_at,
        COALESCE(u.full_name, u.email, 'System') AS admin_name,
        COALESCE(u.full_name, u.email, 'System') AS admin_full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
