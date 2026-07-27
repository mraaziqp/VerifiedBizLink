import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// POST /api/businesses/cancel-subscription — downgrades the caller's
// business to Free immediately (same as before). Paid tiers are now real
// PayFast recurring subscriptions, though, so simply changing our own
// package_type does NOT stop PayFast from continuing to charge the card
// every month — that requires calling PayFast's own subscription-cancel
// API against the stored payfast_token.
//
// We deliberately do NOT attempt that API call yet: there's no confirmed
// PAYFAST_PASSPHRASE configured, and silently claiming a cancellation
// succeeded when we can't actually verify it against PayFast would risk
// a customer being charged again next month while believing they'd
// cancelled — worse than being honest about a manual step. Instead this
// flags the cancellation for staff (visible in Admin > Logs) to action
// in the PayFast dashboard, and tells the business the same thing.
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

  const hadToken = !!business.payfast_token;

  await db`
    UPDATE businesses
    SET package_type = 'free', subscription_status = 'cancel_requested', updated_at = NOW()
    WHERE id = ${business.id}
  `;

  await db`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      ${session.id},
      'subscription_cancel_requested',
      'business',
      ${business.id},
      ${JSON.stringify({
        companyName: business.company_name,
        payfastToken: business.payfast_token || null,
        note: hadToken
          ? 'Business downgraded to Free in-app. PayFast recurring billing for this token has NOT been cancelled automatically — needs manual cancellation in the PayFast dashboard to stop future charges.'
          : 'Business downgraded to Free in-app. No PayFast token on file (may predate recurring billing), so nothing to cancel on PayFast’s side.',
      })}
    )
  `.catch((err) => console.log('Cancellation audit log note:', err.message));

  return NextResponse.json({
    success: true,
    requiresManualPayfastCancellation: hadToken,
  });
}
