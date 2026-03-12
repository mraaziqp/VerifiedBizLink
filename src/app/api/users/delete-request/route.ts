import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/users/delete-request — check if there's a pending deletion request
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const rows = await db`
      SELECT id, status, scheduled_for, created_at
      FROM deletion_requests
      WHERE user_id = ${session.id} AND status = 'pending'
      LIMIT 1
    `;
    return NextResponse.json({ pending: rows.length > 0, request: rows[0] ?? null });
  } catch (err) {
    return NextResponse.json({ pending: false, request: null });
  }
}

// POST /api/users/delete-request — schedule account deletion in 30-90 days
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Check if there's already a pending request
    const existing = await db`
      SELECT id FROM deletion_requests WHERE user_id = ${session.id} AND status = 'pending' LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A deletion request is already pending.' }, { status: 409 });
    }

    // Schedule deletion: 30 days out (admin can process up to 90 days)
    await db`
      INSERT INTO deletion_requests (user_id, status, scheduled_for, created_at)
      VALUES (
        ${session.id},
        'pending',
        NOW() + INTERVAL '30 days',
        NOW()
      )
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete request error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// DELETE /api/users/delete-request — cancel a pending deletion request
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Only allow cancellation if within 7 days of request
    const result = await db`
      UPDATE deletion_requests
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE user_id = ${session.id}
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '7 days'
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'No cancellable deletion request found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cancel deletion error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
