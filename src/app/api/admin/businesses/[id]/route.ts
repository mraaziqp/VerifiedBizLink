import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const { status, reviewNotes, trustScore, packageType } = await request.json();

    const validStatuses = ['pending', 'reviewing', 'verified', 'rejected', 'unregistered'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (status === undefined && packageType === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (trustScore !== undefined && trustScore !== null && (trustScore < 0 || trustScore > 100)) {
      return NextResponse.json({ error: 'Trust score must be between 0 and 100' }, { status: 400 });
    }

    if (packageType !== undefined) {
      const [validTier] = await db`SELECT key FROM tiers WHERE key = ${packageType}`;
      if (!validTier) {
        return NextResponse.json({ error: 'Invalid package type' }, { status: 400 });
      }
    }

    const computedTrustScore = status === undefined
      ? undefined
      : trustScore ?? (status === 'verified' ? 95 : status === 'reviewing' ? 60 : 30);

    const updated = await db`
      UPDATE businesses SET
        status = COALESCE(${status}, status),
        review_notes = COALESCE(${reviewNotes}, review_notes),
        trust_score = COALESCE(${computedTrustScore}, trust_score),
        reviewed_by = COALESCE(${status !== undefined ? session.id : null}, reviewed_by),
        -- COALESCE, so re-approving an already-verified business keeps the
        -- date it was first verified. Stamping NOW() every time rewrote the
        -- customer's verification anniversary on any later edit, and the
        -- monthly "verified this month" analytics counted them again.
        verified_at = CASE
          WHEN ${status}::text = 'verified' THEN COALESCE(verified_at, NOW())
          WHEN ${status}::text IS NOT NULL THEN NULL
          ELSE verified_at END,
        -- A person has now actually looked at this one. That overwrites a
        -- badge that came from a purchase: reviewed beats paid-for, and this
        -- is the only signal that the documents were really checked.
        badge_source = CASE WHEN ${status}::text = 'verified' THEN 'vetting_review' ELSE badge_source END,
        -- Rejecting is also a review. Recording it means the decision is
        -- dated even when the answer was no.
        documents_reviewed_at = CASE
          WHEN ${status}::text IN ('verified', 'rejected') THEN NOW()
          ELSE documents_reviewed_at END,
        package_type = COALESCE(${packageType}, package_type),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Log the action
    const actionParts: string[] = [];
    if (status !== undefined) actionParts.push(`status to ${status.toUpperCase()}`);
    if (packageType !== undefined) actionParts.push(`plan to ${packageType.toUpperCase()}`);
    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
      VALUES (
        ${session.id},
        ${session.fullName},
        ${'Updated business ' + actionParts.join(', ')},
        'business',
        ${id},
        ${updated[0].company_name}
      )
    `;

    // Notify the business owner of a status change
    if (status !== undefined) {
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
        `.catch((err) => console.error('Vetting status notification failed:', err)); // non-fatal
      }
    }
    if (packageType !== undefined) {
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${updated[0].user_id}, 'payment_success', 'Plan updated', ${`Your business "${updated[0].company_name}" plan was changed to ${packageType} by an administrator.`})
      `.catch((err) => console.error('Plan-change notification failed:', err)); // non-fatal
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

    return NextResponse.json(
      { business: { ...business[0], documents: docs, doc_count: docs.length } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Admin business GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}
