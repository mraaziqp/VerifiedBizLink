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

    const doc = updated[0];

    // Get the business this document belongs to and recalculate trust score
    const businesses = await db`
      SELECT id, company_name, user_id FROM businesses WHERE id = ${doc.business_id}
    `;

    if (businesses.length > 0) {
      const biz = businesses[0];

      // Calculate new trust score based on all documents with grades
      const docs = await db`
        SELECT grade FROM documents WHERE business_id = ${doc.business_id} AND grade > 0
      `;

      let newTrustScore = 0;
      if (docs.length > 0) {
        const avgGrade = docs.reduce((sum, d) => sum + d.grade, 0) / docs.length;
        newTrustScore = Math.round((avgGrade / 100) * 95); // Cap at 95% for non-perfect docs
      }

      // Update business trust score if documents have been graded
      if (newTrustScore > 0) {
        await db`
          UPDATE businesses
          SET trust_score = ${newTrustScore}, updated_at = NOW()
          WHERE id = ${doc.business_id}
        `;
      }

      // Log the action
      await db`
        INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
        VALUES (
          ${session.id},
          ${session.fullName},
          ${'Graded document: ' + doc.name + ' (' + (grade ?? 0) + '/100)'},
          'document',
          ${id},
          ${biz.company_name}
        )
      `;

      // Notify business owner
      if (status === 'approved' || status === 'rejected') {
        const message = status === 'approved'
          ? `Document "${doc.name}" has been approved (Grade: ${grade ?? 0}/100)`
          : `Document "${doc.name}" needs revision. Please resubmit.`;

        await db`
          INSERT INTO notifications (user_id, type, title, content)
          VALUES (${biz.user_id}, 'document_graded', 'Document reviewed', ${message})
        `.catch((err) => console.error('Document review notification failed:', err));
      }
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Document review PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
