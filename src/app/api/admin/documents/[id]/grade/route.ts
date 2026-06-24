/**
 * Grade Document Endpoint
 * Allows admins (Ramoen, Wesley) to grade verification documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { grade, status, review_notes } = await request.json();

    // Validate grade (0-100)
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return NextResponse.json(
        { error: 'Grade must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['uploaded', 'reviewing', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update document
    const updated = await db`
      UPDATE documents
      SET
        grade = ${grade ?? 0},
        status = ${status || 'reviewing'},
        review_notes = ${review_notes || ''},
        reviewed_by = ${session.id},
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = updated[0];

    // Get the business this document belongs to
    const business = await db`
      SELECT id, company_name, user_id FROM businesses WHERE id = ${doc.business_id}
      LIMIT 1
    `;

    if (business.length > 0) {
      // Calculate new trust score based on all documents
      const allDocs = await db`
        SELECT grade FROM documents WHERE business_id = ${doc.business_id} AND grade > 0
      `;

      let newTrustScore = 0;
      if (allDocs.length > 0) {
        const avgGrade = allDocs.reduce((sum, d) => sum + d.grade, 0) / allDocs.length;
        newTrustScore = Math.round((avgGrade / 100) * 95); // Cap at 95% for non-perfect docs
      }

      // Update business trust score
      if (newTrustScore > 0) {
        await db`
          UPDATE businesses
          SET trust_score = ${newTrustScore}, updated_at = NOW()
          WHERE id = ${doc.business_id}
        `;
      }

      // Log the grading action
      await db`
        INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, metadata)
        VALUES (
          ${session.id},
          ${session.fullName},
          ${'Graded document: ' + doc.name},
          'document',
          ${id},
          ${business[0].company_name},
          ${{ grade, status, trust_score: newTrustScore }}::jsonb
        )
      `;

      // Notify business owner of document review
      if (status === 'approved' || status === 'rejected') {
        const message = status === 'approved'
          ? `Document "${doc.name}" has been approved. Grade: ${grade}/100`
          : `Document "${doc.name}" was rejected. Please review feedback and resubmit.`;

        await db`
          INSERT INTO notifications (user_id, type, message, link)
          VALUES (${business[0].user_id}, ${'document_graded'}, ${message}, '/vetting')
        `.catch(() => {}); // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (error) {
    console.error('Document grading error:', error);
    return NextResponse.json(
      { error: 'Failed to grade document' },
      { status: 500 }
    );
  }
}
