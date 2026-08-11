import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AGENT_PORTAL_ROLES, ROLES, hasRole } from '@/lib/roles';
import { commissionCents } from '@/lib/commission';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/agent/dashboard
 *
 * Everything the sales agent portal needs, scoped to one agent.
 *
 * An agent may only ever see their own book. Admins may pass ?agentId= to
 * review a specific agent; for anyone else the parameter is ignored outright
 * rather than validated, so there is no way to probe another agent's numbers.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAdmin = session!.role === ROLES.ADMIN;
    const requested = request.nextUrl.searchParams.get('agentId');
    const agentId = isAdmin && requested ? requested : session!.id;

    /**
     * One query, two joins:
     *   - every business this agent signed up (assisted_by_user_id)
     *   - that business owner's FIRST completed payment, if any
     *
     * DISTINCT ON gives us the earliest completed payment per user, which is
     * what commission is calculated from. Ordering by COALESCE(completed_at,
     * created_at) matters: older rows predate completed_at being populated.
     */
    const rows = (await db`
      WITH first_payment AS (
        SELECT DISTINCT ON (p.user_id)
          p.user_id, p.amount, p.reference, p.description,
          COALESCE(p.completed_at, p.created_at) AS paid_at
        FROM payments p
        WHERE p.status = 'completed'
        ORDER BY p.user_id, COALESCE(p.completed_at, p.created_at) ASC
      )
      SELECT
        b.id AS business_id, b.company_name, b.package_type, b.status,
        b.created_at AS signed_up_at,
        u.id AS owner_id, u.full_name, u.email, u.email_verified,
        fp.amount AS first_payment_cents, fp.reference, fp.paid_at
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN first_payment fp ON fp.user_id = u.id
      WHERE b.assisted_by_user_id = ${agentId}
      ORDER BY b.created_at DESC
    `) as unknown as Row[];

    const signups = rows.map((r) => {
      const cents = Number(r.first_payment_cents) || 0;
      return {
        businessId: r.business_id,
        companyName: r.company_name || '(unnamed business)',
        packageType: r.package_type || 'free',
        status: r.status || 'unregistered',
        signedUpAt: r.signed_up_at,
        ownerName: r.full_name,
        ownerEmail: r.email,
        emailVerified: r.email_verified === true,
        // A sign-up only becomes a "sale" once it has actually paid.
        converted: cents > 0,
        firstPaymentCents: cents,
        commissionCents: commissionCents(cents),
        reference: r.reference || null,
        paidAt: r.paid_at || null,
      };
    });

    const converted = signups.filter((s) => s.converted);

    return NextResponse.json({
      agentId,
      totals: {
        signups: signups.length,
        sales: converted.length,
        pending: signups.length - converted.length,
        // Verified but not yet paying — the agent's warmest follow-up list.
        awaitingPayment: signups.filter((s) => !s.converted && s.emailVerified).length,
        revenueCents: converted.reduce((sum, s) => sum + s.firstPaymentCents, 0),
        commissionCents: converted.reduce((sum, s) => sum + s.commissionCents, 0),
      },
      signups,
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load agent dashboard' }, { status: 500 });
  }
}
