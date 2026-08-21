import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AGENT_PORTAL_ROLES, ROLES, hasRole } from '@/lib/roles';
import {
  commissionCents, getWeeklyTierRate, OFFICIAL_WEEKLY_TIERS,
  MONTHLY_RETENTION_RATE, calculateRetentionCommission
} from '@/lib/commission';
import { referralLink, referralQrUrl } from '@/lib/agents';
import { getCommissionSettings } from '@/lib/settings';
import { appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/agent/dashboard
 *
 * Implements VerifiedBizLink Business Advisor Commission & Incentive Policy (Version 1.0)
 * - Weekly Tiered Acquisition (20% to 50%)
 * - 5% Monthly Recurring Retention
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

    const settings = await getCommissionSettings();
    const me = (await db`
      SELECT referral_code, commission_rate_override FROM users WHERE id = ${agentId} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    // Calculate weekly sales count for the current week (Monday to now)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weeklySalesCount = rows.filter((r) => {
      const cents = Number(r.first_payment_cents) || 0;
      if (cents <= 0 || !r.paid_at) return false;
      const paidDate = new Date(r.paid_at as string);
      return paidDate >= monday;
    }).length;

    // Apply Weekly Tiered Rate (20% for 1-10, 30% for 11-15, 40% for 16-20, 50% for 21+)
    const weeklyTier = getWeeklyTierRate(weeklySalesCount);

    const override = me[0]?.commission_rate_override;
    const effectiveRate =
      override !== null && override !== undefined ? Number(override) : weeklyTier.rate;

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
        converted: cents > 0,
        firstPaymentCents: cents,
        commissionCents: commissionCents(cents, effectiveRate),
        reference: r.reference || null,
        paidAt: r.paid_at || null,
      };
    });

    const converted = signups.filter((s) => s.converted);

    // Calculate recurring 5% retention commission on paying accounts
    const retentionMonthlyCents = converted.reduce((sum, s) => {
      return sum + Math.floor(s.firstPaymentCents * MONTHLY_RETENTION_RATE);
    }, 0);

    const code = (me[0]?.referral_code as string) || null;
    const base = appUrlFromRequest(request);
    const link = code ? referralLink(base, code) : null;

    const paidRows = (await db`
      SELECT COALESCE(SUM(amount_cents), 0)::int AS paid
      FROM commission_payouts WHERE agent_id = ${agentId}
    `.catch(() => [{ paid: 0 }])) as unknown as Row[];
    const paidCents = Number(paidRows[0]?.paid) || 0;

    return NextResponse.json({
      agentId,
      policy: {
        version: '1.0',
        weeklyTiers: OFFICIAL_WEEKLY_TIERS,
        retentionRatePercent: Math.round(MONTHLY_RETENTION_RATE * 100),
      },
      currentWeeklyTier: {
        weeklySales: weeklySalesCount,
        tierName: weeklyTier.tierName,
        ratePercent: Math.round(effectiveRate * 100),
      },
      scheme: {
        ratePercent: Math.round(effectiveRate * 100),
        milestones: settings.milestones,
      },
      referral: {
        code,
        link,
        qrUrl: link ? referralQrUrl(link) : null,
      },
      payouts: {
        paidCents,
        retentionMonthlyCents,
      },
      totals: {
        signups: signups.length,
        sales: converted.length,
        weeklySales: weeklySalesCount,
        pending: signups.length - converted.length,
        awaitingPayment: signups.filter((s) => !s.converted && s.emailVerified).length,
        revenueCents: converted.reduce((sum, s) => sum + s.firstPaymentCents, 0),
        commissionCents: converted.reduce((sum, s) => sum + s.commissionCents, 0),
        retentionMonthlyCents,
      },
      signups,
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load agent dashboard' }, { status: 500 });
  }
}
