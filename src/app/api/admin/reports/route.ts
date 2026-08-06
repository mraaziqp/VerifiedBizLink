import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = await db`
      SELECT 
        cr.id, cr.report_type, cr.risk_level, cr.description, cr.status, cr.created_at,
        u.full_name AS reported_user_name,
        r.full_name AS reporter_name
      FROM compliance_reports cr
      LEFT JOIN users u ON cr.reported_user_id = u.id
      LEFT JOIN users r ON cr.reporter_id = r.id
      ORDER BY cr.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportedUserId, reportType, riskLevel, description } = await request.json();

    const report = await db`
      INSERT INTO compliance_reports (reported_user_id, reporter_id, report_type, risk_level, description)
      VALUES (${reportedUserId}, ${session.id}, ${reportType}, ${riskLevel || 'medium'}, ${description || ''})
      RETURNING *
    `;

    return NextResponse.json({ report: report[0] }, { status: 201 });
  } catch (error) {
    console.error('Report POST error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
