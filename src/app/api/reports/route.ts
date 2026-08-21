import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, reason, details } = body;

    const validReasons = ['spam', 'inappropriate', 'misleading', 'harassment', 'scam', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Missing target' }, { status: 400 });
    }

    // Check duplicate
    const [existing] = await db`
      SELECT id FROM reports
      WHERE reporter_id = ${session.id} AND target_type = ${targetType} AND target_id = ${targetId}
      LIMIT 1
    `;
    if (existing) {
      return NextResponse.json({ error: 'You have already reported this item' }, { status: 409 });
    }

    const [report] = await db`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
      VALUES (${session.id}, ${targetType}, ${targetId}, ${reason}, ${details || null})
      RETURNING *
    `;

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    console.error('Submit report error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    let query;
    if (status) {
      query = db`
        SELECT r.*, u.full_name as reporter_name, u.email as reporter_email
        FROM reports r
        LEFT JOIN users u ON r.reporter_id = u.id
        WHERE r.status = ${status}
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = db`
        SELECT r.*, u.full_name as reporter_name, u.email as reporter_email
        FROM reports r
        LEFT JOIN users u ON r.reporter_id = u.id
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const reports = await query;
    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('List reports error:', error);
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 });
  }
}
