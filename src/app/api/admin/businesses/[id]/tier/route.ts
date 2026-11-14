import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FINANCE_ROLES, hasRole } from '@/lib/roles';
import {
  grantBusinessTier,
  TierActionError,
  type TierGrantMode,
} from '@/lib/business-tiers';
import { adminGrantFreePosPlan, adminRevokePosPlan } from '@/lib/pos/pos-admin';
import { PosError } from '@/lib/pos/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/businesses/[id]/tier
 *
 * Allows finance/platform administrators to:
 *  - Grant any platform tier for free (indefinite complimentary OR timed promo window)
 *  - Remove an active/comp tier cleanly back to 'free'
 *  - Optionally grant or revoke a free POS plan alongside or independently
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(request);
    if (!session || !hasRole(session.role, FINANCE_ROLES)) {
      return NextResponse.json(
        { error: 'Forbidden — only platform & finance administrators can manage business tiers.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    const modeRaw = body.mode;
    const hasPlatformAction =
      modeRaw === 'complimentary' || modeRaw === 'timed_free' || modeRaw === 'remove';

    const posActionRaw = body.posAction;
    const hasPosAction = posActionRaw === 'grant_free' || posActionRaw === 'revoke';

    if (!hasPlatformAction && !hasPosAction) {
      return NextResponse.json(
        { error: 'Specify a business tier action or POS plan action.' },
        { status: 400 },
      );
    }

    let platformResult = null;
    if (hasPlatformAction) {
      platformResult = await grantBusinessTier({
        businessId: id,
        mode: modeRaw as TierGrantMode,
        tierKey: typeof body.tierKey === 'string' ? body.tierKey : undefined,
        durationDays:
          body.durationDays !== undefined && body.durationDays !== null && body.durationDays !== ''
            ? Number(body.durationDays)
            : null,
        expiresAt: typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null,
        grantVerifiedBadge: Boolean(body.grantVerifiedBadge),
        revokeAdminBadge: Boolean(body.revokeAdminBadge),
        syncMonthlyCredits: Boolean(body.syncMonthlyCredits),
        bonusAdCredits:
          body.bonusAdCredits !== undefined && body.bonusAdCredits !== null
            ? Number(body.bonusAdCredits)
            : 0,
        cancelPayfast: body.cancelPayfast !== false,
        reason,
        downgradeReasonCategory:
          typeof body.downgradeReasonCategory === 'string'
            ? (body.downgradeReasonCategory as 'non_payment' | 'terms_violation' | 'fraud' | 'requested' | 'admin_discretion')
            : undefined,
        actor: {
          userId: session.id,
          fullName: session.fullName || session.email,
          role: session.role,
        },
      });
    }

    let posSubscription = null;
    if (posActionRaw === 'grant_free') {
      posSubscription = await adminGrantFreePosPlan({
        businessId: id,
        planKey: body.posPlanKey,
        durationDays:
          body.posDurationDays !== undefined && body.posDurationDays !== null && body.posDurationDays !== ''
            ? Number(body.posDurationDays)
            : null,
        expiresAt: typeof body.posExpiresAt === 'string' && body.posExpiresAt ? body.posExpiresAt : null,
        exemptFees: Boolean(body.posExemptFees),
        reason,
        actor: { userId: session.id, role: session.role },
      });
    } else if (posActionRaw === 'revoke') {
      posSubscription = await adminRevokePosPlan(
        id,
        { userId: session.id, role: session.role },
        reason,
      );
    }

    return NextResponse.json({
      success: true,
      ...(platformResult ?? {}),
      posSubscription,
    });
  } catch (error) {
    if (error instanceof TierActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PosError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('Admin business tier grant error:', error);
    return NextResponse.json({ error: 'Failed to update business tier' }, { status: 500 });
  }
}
