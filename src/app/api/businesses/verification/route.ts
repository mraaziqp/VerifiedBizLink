import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { VERIFICATION_FEE_RAND } from '@/lib/tiers';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/businesses/verification — can this business buy the badge, and
 * has it already.
 *
 * The verify page used to read verification_paid off /api/businesses/packages,
 * which does not select that column, so the value was always undefined and the
 * "already paid" state could never show. Someone who had paid was shown the
 * pay button again.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT status, verification_paid, verification_paid_at, package_type, badge_source
      FROM businesses WHERE user_id = ${session.id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({
        hasBusiness: false,
        verified: false,
        verificationPaid: false,
        onPaidPlan: false,
        canPurchase: false,
        feeRand: VERIFICATION_FEE_RAND,
      });
    }

    const biz = rows[0];
    const verified = biz.status === 'verified';
    const paid = biz.verification_paid === true;
    const packageType = String(biz.package_type ?? 'free');

    // Every paid plan already includes vetting and the badge, so the once-off
    // fee is only for businesses staying on Free. Offering it to a subscriber
    // would be charging twice for one entitlement.
    const onPaidPlan = packageType !== 'free' && packageType !== '';

    return NextResponse.json({
      hasBusiness: true,
      verified,
      verificationPaid: paid,
      onPaidPlan,
      // Nothing to sell to a business that already carries the badge, however
      // it got there — paying twice for the same thing is not an upsell.
      canPurchase: !verified && !paid && !onPaidPlan,
      status: biz.status ?? null,
      packageType,
      badgeSource: biz.badge_source ?? null,
      feeRand: VERIFICATION_FEE_RAND,
    });
  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json({ error: 'Could not load verification status' }, { status: 500 });
  }
}
