import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess, roleCan } from '@/lib/pos/auth-helper';
import { getPosPlans, getMerchantPosSubscription, startPosActivationCheckout, startPosTrial, cancelPosSubscription } from '@/lib/pos/pos-billing';
import { posErrorResponse, readJson, PosError } from '@/lib/pos/errors';
import { logBillingEvent } from '@/lib/billing-events';

/** Plans and this business's POS status. Billing details only for the owner (and read-only admins). */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'settings.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const [plans, subscription] = await Promise.all([getPosPlans(), getMerchantPosSubscription(auth.businessId)]);
    const canSeeBilling = roleCan(auth.posRole, 'billing.read');
    const safeSub = subscription && !canSeeBilling
      ? { plan_key: subscription.plan_key, plan_name: subscription.plan_name, status: subscription.status, max_tills: subscription.max_tills, max_staff: subscription.max_staff }
      : subscription
        ? { ...subscription, payfast_token: subscription.payfast_token ? 'on-file' : null }
        : null;
    return NextResponse.json({ plans, subscription: safeSub, access: auth.access, canManageBilling: roleCan(auth.posRole, 'billing.manage') });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/**
 * { action: 'activate', planKey } — returns a signed PayFast checkout; the
 *   ITN activates the plan. Also used to reactivate or change plan.
 * { action: 'start_trial', planKey } — only for plans with trial_days > 0.
 * { action: 'cancel' } — cancels at PayFast, access runs to period end.
 *
 * There is no way to mark a fee "paid" from here: the old setupFeePaid flag
 * is ignored.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'billing.manage');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const body = await readJson(req);
    const action = body.action ?? (body.planKey ? 'activate' : null);
    if (action === 'activate') {
      const checkout = await startPosActivationCheckout({
        session: { id: auth.session.id, email: auth.session.email, fullName: auth.session.fullName },
        businessId: auth.businessId,
        planKey: String(body.planKey ?? ''),
      });
      await logBillingEvent({
        event: 'pay_now_started', businessId: auth.businessId, userId: auth.session.id,
        amountCents: checkout.firstChargeCents, reference: checkout.paymentRef,
        detail: `POS ${String(body.planKey)} checkout started (${checkout.setupFeeCents}c setup + ${checkout.monthlyCents}c/month).`,
      });
      return NextResponse.json({
        payfastUrl: checkout.payfastUrl, data: checkout.data, signature: checkout.signature, paymentRef: checkout.paymentRef,
        firstChargeCents: checkout.firstChargeCents, setupFeeCents: checkout.setupFeeCents, monthlyCents: checkout.monthlyCents,
      });
    }
    if (action === 'start_trial') {
      return NextResponse.json({ success: true, subscription: await startPosTrial(auth.businessId, String(body.planKey ?? ''), auth.session.id) });
    }
    if (action === 'cancel') {
      return NextResponse.json({ success: true, subscription: await cancelPosSubscription(auth.businessId, auth.session.id) });
    }
    throw new PosError(400, 'BAD_ACTION', 'action must be activate, start_trial or cancel.');
  } catch (err) {
    return posErrorResponse(err);
  }
}
