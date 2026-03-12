import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: reportId } = await params;
    const { status } = await request.json();

    const allowed = ['open', 'investigating', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await db`
      UPDATE compliance_reports
      SET status = ${status}
      WHERE id = ${reportId}
      RETURNING id, status
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    await db`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, target_name)
      VALUES (${session.id}, ${'REPORT_' + status.toUpperCase()}, 'compliance_report', ${reportId}, ${'Report #' + reportId})
    `;

    return NextResponse.json({ report: updated[0] });
  } catch (error) {
    console.error('Report PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
