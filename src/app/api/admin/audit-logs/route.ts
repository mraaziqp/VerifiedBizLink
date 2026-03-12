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
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await db`
      SELECT 
        al.id, al.action, al.target_type, al.target_id, al.target_name,
        al.created_at, al.admin_name,
        u.full_name AS admin_full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
