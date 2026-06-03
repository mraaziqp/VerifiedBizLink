import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const documents = await db`
      SELECT
        d.id, d.name, d.doc_type, d.file_url, d.approval_status, d.score,
        d.uploaded_at, d.reviewed_at, d.review_notes,
        b.company_name, b.user_id,
        u.full_name, u.email, u.avatar_url, u.headline
      FROM documents d
      JOIN businesses b ON d.business_id = b.id
      JOIN users u ON d.user_id = u.id
      WHERE d.approval_status = ${status}
      ORDER BY d.uploaded_at DESC
    `;

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { documentId, approval, score, notes } = await request.json();

    if (!documentId || !approval) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updated = await db`
      UPDATE documents
      SET
        approval_status = ${approval},
        score = ${score || 0},
        approved_by = ${session.id},
        review_notes = ${notes || ''},
        reviewed_at = NOW()
      WHERE id = ${documentId}
      RETURNING id, approval_status, score, review_notes
    `;

    return NextResponse.json({ document: updated[0] });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
