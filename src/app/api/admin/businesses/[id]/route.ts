import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { FINANCE_ROLES, COMPLIANCE_ROLES, hasRole } from '@/lib/roles';
import { grantBusinessTier, TierActionError } from '@/lib/business-tiers';

export const dynamic = 'force-dynamic';

// PUT /api/admin/businesses/[id] — update vetting status and/or complimentary package tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, [...COMPLIANCE_ROLES, ...FINANCE_ROLES])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status, reviewNotes, trustScore, packageType, packageReason } = await request.json();

    const validStatuses = ['pending', 'reviewing', 'verified', 'rejected', 'unregistered'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (status === undefined && packageType === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    if (packageType !== undefined && !hasRole(session.role, FINANCE_ROLES)) {
      return NextResponse.json({ error: 'Forbidden — only platform or finance admins can change business tiers' }, { status: 403 });
    }

    if (trustScore !== undefined && trustScore !== null && (trustScore < 0 || trustScore > 100)) {
      return NextResponse.json({ error: 'Trust score must be between 0 and 100' }, { status: 400 });
    }

    if (packageType !== undefined && status === undefined) {
      const result = await grantBusinessTier({
        businessId: id,
        mode: packageType === 'free' ? 'remove' : 'complimentary',
        tierKey: String(packageType),
        reason: typeof packageReason === 'string' && packageReason.trim().length >= 3
          ? packageReason.trim()
          : 'Admin tier update',
        actor: {
          userId: session.id,
          fullName: session.fullName || session.email,
          role: session.role,
        },
      });
      return NextResponse.json({ business: result.business });
    }

    let updated = [] as Record<string, unknown>[];
    if (status !== undefined) {
      const computedTrustScore = trustScore ?? (status === 'verified' ? 95 : status === 'reviewing' ? 60 : 30);

      updated = (await db`
        UPDATE businesses SET
          status = COALESCE(${status}, status),
          review_notes = COALESCE(${reviewNotes}, review_notes),
          trust_score = COALESCE(${computedTrustScore}, trust_score),
          reviewed_by = COALESCE(${session.id}, reviewed_by),
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
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `) as Record<string, unknown>[];

      if (updated.length === 0) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      // A business that loses its badge must lose its certificate with it.
      if (status !== 'verified') {
        const { revokeCertificatesFor } = await import('@/lib/certificates');
        const revoked = await revokeCertificatesFor(
          id,
          `Business status changed to ${status}`,
        ).catch(() => 0);
        if (revoked > 0) {
          console.log(`Revoked ${revoked} certificate(s) for business ${id} (${status})`);
        }
      }

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
      `.catch((err) => console.error('Audit log write failed:', err));

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
        `.catch((err) => console.error('Vetting status notification failed:', err));
      }
    }

    if (packageType !== undefined) {
      const tierRes = await grantBusinessTier({
        businessId: id,
        mode: packageType === 'free' ? 'remove' : 'complimentary',
        tierKey: String(packageType),
        reason: typeof packageReason === 'string' && packageReason.trim().length >= 3
          ? packageReason.trim()
          : 'Admin tier update',
        actor: {
          userId: session.id,
          fullName: session.fullName || session.email,
          role: session.role,
        },
      });
      updated = [tierRes.business];
    }

    return NextResponse.json({ business: updated[0] });
  } catch (error) {
    if (error instanceof TierActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
