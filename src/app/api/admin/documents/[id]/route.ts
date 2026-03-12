import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// PATCH /api/admin/documents/[id] — update document review status, grade, notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status, grade, reviewNotes } = await request.json();

    const validStatuses = ['uploaded', 'reviewing', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid document status' }, { status: 400 });
    }

    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return NextResponse.json({ error: 'Grade must be 0–100' }, { status: 400 });
    }

    const updated = await db`
      UPDATE documents SET
        status = COALESCE(${status ?? null}, status),
        grade = COALESCE(${grade ?? null}, grade),
        review_notes = COALESCE(${reviewNotes ?? null}, review_notes),
        reviewed_by = ${session.id},
        reviewed_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: updated[0] });
  } catch (error) {
    console.error('Document review PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
