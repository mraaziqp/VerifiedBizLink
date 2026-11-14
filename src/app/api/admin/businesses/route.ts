import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';
import { ensureBusinessTierColumns } from '@/lib/business-tiers';
import { ensurePosSchema } from '@/lib/pos/schema';

export const dynamic = 'force-dynamic';

// GET /api/admin/businesses — list all businesses with user, tier, billing, and POS info
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Promise.all([
      ensureBusinessTierColumns(),
      ensurePosSchema().catch(() => {}),
    ]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeDocs = searchParams.get('includeDocs') !== 'false';
    const isPaidUnreviewed = status === 'paid_unreviewed';
    const statusFilter = status && status !== 'all' && !isPaidUnreviewed ? status : null;

    const businesses = await db`
      SELECT
        b.id, b.user_id, b.company_name, b.industry, b.reg_number, b.vat_number,
        b.status, b.trust_score, b.submitted_at, b.verified_at, b.review_notes,
        b.description, b.website, b.phone, b.address, b.created_at,
        b.badge_source, b.documents_reviewed_at, b.package_type,
        b.subscription_status, b.trial_package, b.trial_ends_at,
        b.auto_renew, b.next_billing_at, b.ad_credits,
        COALESCE(b.unlimited_ad_credits, false) AS unlimited_ad_credits,
        COALESCE(b.verification_paid, false) AS verification_paid,
        (b.payfast_token IS NOT NULL) AS has_payfast_token,
        b.downgraded_from, b.downgraded_at,
        b.tier_grant_type, b.tier_granted_at, b.tier_grant_note,
        u.full_name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar,
        u.role AS owner_role, COALESCE(u.is_suspended, false) AS owner_suspended,
        ps.plan_key AS pos_plan_key,
        ps.status AS pos_status,
        ps.trial_ends_at AS pos_trial_ends_at,
        ps.renews_at AS pos_renews_at,
        COALESCE(ps.granted_free, false) AS pos_granted_free,
        ps.granted_reason AS pos_granted_reason,
        (ps.payfast_token IS NOT NULL) AS pos_has_payfast,
        (SELECT COUNT(*) FROM documents d WHERE d.business_id = b.id) AS doc_count,
        CASE
          WHEN ${includeDocs} THEN (
            SELECT COALESCE(json_agg(json_build_object(
              'id', d.id,
              'name', d.name,
              'doc_type', d.doc_type,
              'status', d.status,
              'grade', d.grade,
              'review_notes', d.review_notes,
              'uploaded_at', d.uploaded_at,
              'file_url', d.file_url
            ) ORDER BY d.uploaded_at DESC), '[]'::json)
            FROM documents d WHERE d.business_id = b.id
          )
          ELSE '[]'::json
        END AS documents
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN pos_merchant_subscriptions ps ON ps.business_id = b.id
      WHERE (
        (${isPaidUnreviewed} IS FALSE OR (
          b.status = 'verified'
          AND b.badge_source IN ('subscription', 'verification_fee')
          AND b.documents_reviewed_at IS NULL
        ))
        AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
      )
      ORDER BY
        CASE WHEN ${isPaidUnreviewed} THEN b.verified_at END ASC NULLS LAST,
        b.submitted_at DESC NULLS LAST,
        b.created_at DESC
    `;

    return NextResponse.json(
      { businesses },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Admin businesses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 503 });
  }
}
