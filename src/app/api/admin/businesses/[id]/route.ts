import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// PUT /api/admin/businesses/[id] — update status
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
    const { status, reviewNotes, trustScore } = await request.json();

    const validStatuses = ['pending', 'reviewing', 'verified', 'rejected', 'unregistered'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (trustScore !== undefined && trustScore !== null && (trustScore < 0 || trustScore > 100)) {
      return NextResponse.json({ error: 'Trust score must be between 0 and 100' }, { status: 400 });
    }

    const updated = await db`
      UPDATE businesses SET
        status = ${status},
        review_notes = ${reviewNotes || ''},
        trust_score = ${trustScore ?? (status === 'verified' ? 95 : status === 'reviewing' ? 60 : 30)},
        reviewed_by = ${session.id},
        verified_at = ${status === 'verified' ? new Date() : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Log the action
    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
      VALUES (
        ${session.id},
        ${session.fullName},
        ${'Updated business status to ' + status.toUpperCase()},
        'business',
        ${id},
        ${updated[0].company_name}
      )
    `;

    // Notify the business owner of the status change
    const statusMessages: Record<string, string> = {
      verified: `Your business "${updated[0].company_name}" has been verified. You now have a Gold Checkmark!`,
      rejected: `Your business "${updated[0].company_name}" verification was not successful. Review the feedback in Vetting Hub.`,
      reviewing: `Your business "${updated[0].company_name}" is now under active review by our compliance team.`,
    };
    const message = statusMessages[status];
    if (message) {
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${updated[0].user_id}, ${'vetting_update'}, 'Vetting update', ${message})
      `.catch(() => {}); // non-fatal
    }

    return NextResponse.json({ business: updated[0] });
  } catch (error) {
    console.error('Admin business PUT error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

// GET /api/admin/businesses/[id] — get single business details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const business = await db`
      SELECT 
        b.*,
        u.full_name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ${id}
      LIMIT 1
    `;

    if (business.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const docs = await db`SELECT * FROM documents WHERE business_id = ${id} ORDER BY uploaded_at DESC`;

    return NextResponse.json({ business: { ...business[0], documents: docs, doc_count: docs.length } });
  } catch (error) {
    console.error('Admin business GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}
