import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { cancelPayfastSubscription } from '@/lib/payfast-api';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/businesses/cancel-subscription — moves the caller's business to
 * Free and cancels their PayFast subscription so the card stops being
 * charged.
 *
 * Changing package_type alone never stopped PayFast billing. The cancel goes
 * through PayFast's API; if PayFast does not confirm it, nothing claims it
 * did — admins are alerted to cancel it by hand in the PayFast dashboard, and
 * the customer is told the same, because being charged next month after
 * being told you cancelled is worse than an honest manual step.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`
    SELECT id, package_type, payfast_token, company_name
    FROM businesses WHERE user_id = ${session.id} LIMIT 1
  `;
  const business = rows[0];
  if (!business) {
    return NextResponse.json({ error: 'No business profile found' }, { status: 404 });
  }

  if (business.package_type === 'free') {
    return NextResponse.json({ error: 'You are already on the Free plan' }, { status: 400 });
  }

  const token: string | null = business.payfast_token || null;
  const cancelled = token ? await cancelPayfastSubscription(token) : null;
  const confirmed = !token || Boolean(cancelled?.ok);

  await db`
    UPDATE businesses
    SET package_type = 'free',
        subscription_status = ${confirmed ? 'cancelled' : 'cancel_requested'},
        auto_renew = FALSE,
        payment_failed_at = NULL,
        payment_failed_notified_at = NULL,
        grace_warned_at = NULL,
        updated_at = NOW()
    WHERE id = ${business.id}
  `;

  await logBillingEvent({
    event: confirmed ? 'old_subscription_cancelled' : 'old_subscription_cancel_failed',
    severity: confirmed ? 'info' : 'critical',
    businessId: String(business.id),
    userId: session.id,
    reference: token,
    detail: !token
      ? `${business.company_name} cancelled and moved to Free. No PayFast subscription on file, so nothing to cancel there.`
      : confirmed
        ? `${business.company_name} cancelled and moved to Free. PayFast subscription ${token} cancelled.`
        : `${business.company_name} cancelled and moved to Free, but PayFast subscription ${token} could NOT be cancelled automatically (HTTP ${cancelled?.status}: ${cancelled?.detail}). Cancel it in the PayFast dashboard now or they will keep being charged.`,
    alertAdmins: !confirmed,
    alertTitle: `Cancel a PayFast subscription by hand: ${business.company_name}`,
  });

  await db`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      ${session.id},
      'subscription_cancelled',
      'business',
      ${business.id},
      ${JSON.stringify({ companyName: business.company_name, payfastToken: token, payfastCancelled: confirmed })}
    )
  `.catch((err) => console.log('Cancellation audit log note:', err.message));

  return NextResponse.json({
    success: true,
    requiresManualPayfastCancellation: !confirmed,
  });
}
