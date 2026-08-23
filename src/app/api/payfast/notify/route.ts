import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { signPayfast, payfastEnv } from '@/lib/payfast';
import { getTier, AD_CREDIT_PRICE_PER_DAY, AD_BOOST_PRICE, AD_BOOST_DURATION_DAYS } from '@/lib/tiers';
import { nextBillingDate } from '@/lib/billing';
import { issueInvoice } from '@/lib/invoices';
import { appUrlFromRequest } from '@/lib/email';

// PayFast's official anti-spoofing check (required by their integration
// guide, not optional): post the exact ITN body back to PayFast and only
// trust it if they confirm it as a transaction they actually processed.
//
// The signature alone is not proof of origin unless a passphrase is set:
// merchant_id is not secret (it's sent to the browser on every checkout),
// so without one anybody could compute a "valid" signature for a fabricated
// POST straight to this endpoint and grant themselves (or any user_id they
// guess) a free tier upgrade, ad boost, or ad credits. This closes that gap
// whether or not a passphrase is configured.
async function isGenuineItn(rawBody: string): Promise<boolean> {
  const payfastUrl = payfastEnv('PAYFAST_URL');
  const validateUrl =
    payfastEnv('PAYFAST_VALIDATE_URL') ||
    (payfastUrl.includes('sandbox')
      ? 'https://sandbox.payfast.co.za/eng/query/validate'
      : 'https://www.payfast.co.za/eng/query/validate');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const text = (await res.text()).trim();
    return text === 'VALID';
  } catch (err) {
    console.error('PayFast ITN validation call failed:', err);
    return false; // fail closed — an unreachable validator is not proof of authenticity
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const formData = new URLSearchParams(rawBody);
    const payfastData: Record<string, string> = {};
    formData.forEach((value, key) => {
      payfastData[key] = value;
    });

    // Verify signature
    const PAYFAST_MERCHANT_ID = payfastEnv('PAYFAST_MERCHANT_ID');

    // Built from the POST in the order PayFast sent it. Sorting the keys here
    // compares against a string PayFast never generated, which rejected every
    // genuine notification with a 403.
    const expectedSignature = signPayfast(
      formData.entries(),
      payfastEnv('PAYFAST_PASSPHRASE'),
    );

    const receivedSignature = payfastData.signature as string;

    // Verify signature matches
    if (receivedSignature !== expectedSignature) {
      console.error('Invalid Payfast signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Verify merchant ID
    if (payfastData.merchant_id !== PAYFAST_MERCHANT_ID) {
      console.error('Invalid merchant ID');
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 403 });
    }

    // Confirm this request actually came from PayFast, not just something
    // that knows the (non-secret) merchant_id and the signature algorithm.
    if (!(await isGenuineItn(rawBody))) {
      console.error('PayFast ITN failed server-side validation — treating as spoofed', {
        paymentRef: payfastData.m_payment_id,
      });
      // Still 200: a real ITN we can't validate would otherwise retry
      // forever, and a forged one deserves no signal either way.
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update payment status based on payment_status
    const paymentStatus = payfastData.payment_status as string;
    const paymentRef = payfastData.m_payment_id as string;
    const normalizedStatus = String(paymentStatus || '').trim().toUpperCase();

    // A refund, reversal or chargeback is not a status update — it undoes a
    // payment that has already earned an advisor commission, so it goes
    // through the clawback path (Commission Policy §12) instead of falling
    // through to the UPDATE below. Left unhandled it landed on 'pending',
    // which quietly demoted a completed payment and removed its commission
    // with nothing flagged for anyone to see.
    if (
      normalizedStatus === 'REFUNDED' ||
      normalizedStatus === 'REVERSED' ||
      normalizedStatus === 'CHARGEBACK'
    ) {
      const { reversePaymentAndRaiseClawback } = await import('@/lib/clawbacks');
      const result = await reversePaymentAndRaiseClawback({
        paymentReference: paymentRef,
        reason: `PayFast reported this payment as ${normalizedStatus.toLowerCase()}`,
        actorName: 'PayFast (automatic)',
      }).catch((err) => {
        console.error('Automatic clawback failed:', err);
        return null;
      });
      console.log('PayFast reversal handled:', result?.reason ?? 'error');

      // The tier is deliberately not stripped here. One reversed month is not
      // the same as a fraudulent account, and an admin deciding the clawback
      // is the right person to decide the account too.
      await db`
        INSERT INTO notifications (user_id, title, content, link)
        SELECT id, 'Payment reversed by PayFast',
               ${`${paymentRef} came back as ${normalizedStatus.toLowerCase()}. The account still holds its plan — review it.`},
               '/admin/payments'
        FROM users WHERE role = 'admin'
      `.catch((err) => console.log('Reversal notification note:', err.message));

      return NextResponse.json({ success: true }, { status: 200 });
    }

    let dbStatus = 'pending';
    if (normalizedStatus === 'COMPLETE') {
      dbStatus = 'completed';
    } else if (normalizedStatus === 'FAILED') {
      dbStatus = 'failed';
    } else if (normalizedStatus === 'PENDING') {
      dbStatus = 'pending';
    } else if (normalizedStatus === 'CANCELLED') {
      // A cancelled subscription says nothing about the charges already
      // taken, so stop the renewal and leave the ledger alone.
      await db`
        UPDATE businesses
        SET auto_renew = FALSE, subscription_status = 'cancelled', updated_at = NOW()
        WHERE payfast_token = ${payfastData.token || null}
      `.catch((err) => console.log('Subscription cancellation note:', err.message));
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Something PayFast added that this code has never seen. Recording it
      // as 'pending' would demote a completed payment, so do nothing and say
      // so loudly enough to be found in the logs.
      console.error('Unrecognised PayFast payment_status — ignored:', {
        paymentStatus,
        paymentRef,
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update payment record. payments has no updated_at column (only
    // created_at/completed_at) — an earlier version of this query set
    // updated_at, which doesn't exist, so it always threw and was silently
    // swallowed by the .catch() below: every payment stayed 'pending'
    // forever even though the grant below succeeded. completed_at is the
    // real column for "when did this finish."
    const updatedPayment = await db`
      UPDATE payments
      SET status = ${dbStatus},
          payfast_reference = ${payfastData.pf_payment_id || null},
          completed_at = CASE WHEN ${dbStatus} = 'completed' THEN NOW() ELSE completed_at END
      WHERE reference = ${paymentRef}
      RETURNING id
    `.catch(err => { console.log('Payment update note:', err.message); return []; });

    // A recurring monthly charge reuses the same m_payment_id the
    // subscription was created with, so the UPDATE above just re-confirms
    // that original row instead of creating a new one — insert a fresh
    // ledger row instead, keyed on PayFast's own transaction id (always
    // unique per charge), so every month's payment actually shows up in
    // Transaction History rather than only the first one ever appearing.
    if (updatedPayment.length === 0 && dbStatus === 'completed' && payfastData.pf_payment_id) {
      await db`
        INSERT INTO payments (user_id, amount, status, reference, description, completed_at)
        VALUES (
          ${payfastData.custom_str2 || null},
          ${Math.round(parseFloat(payfastData.amount_gross || '0') * 100)},
          'completed',
          ${payfastData.pf_payment_id},
          ${payfastData.item_name || 'Recurring billing'},
          NOW()
        )
        ON CONFLICT (reference) DO NOTHING
      `.catch(err => console.log('Recurring payment ledger note:', err.message));
    }

    // If payment successful, grant whatever was actually purchased
    if (dbStatus === 'completed') {
      const userId = payfastData.custom_str2 as string;
      const adId = payfastData.custom_str1 as string;
      const purchaseType = (payfastData.custom_str3 as string) || 'ad_credits';
      let grantMessage = `Your payment of R${payfastData.amount_gross} has been received`;

      if (purchaseType === 'ad_boost' && adId) {
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        // Same underpayment guard as subscriptions below — this branch used
        // to grant the boost unconditionally regardless of amount_gross.
        if (Number.isFinite(paidAmount) && paidAmount >= AD_BOOST_PRICE - 0.01) {
          await db`
            UPDATE ads
            SET is_boosted = TRUE, is_active = TRUE, boost_expires_at = NOW() + (${AD_BOOST_DURATION_DAYS} || ' days')::interval
            WHERE id = ${adId}
              AND business_id IN (SELECT id FROM businesses WHERE user_id = ${userId})
          `.catch(err => console.log('Ad update note:', err.message));
          grantMessage = `Your ad has been boosted for ${AD_BOOST_DURATION_DAYS} days — it will get priority placement.`;
        } else {
          console.error(`Blocked ad boost: paid R${paidAmount}, requires R${AD_BOOST_PRICE}`, { userId, adId, paymentRef });
          grantMessage = 'Your payment was received, but the amount did not match the ad boost price. Please contact support.';
        }
      } else if (purchaseType.startsWith('subscription_')) {
        // Derived from the key, not a hardcoded map — any tier an admin adds
        // in Tier Management is purchasable through this same path with no
        // code change needed.
        const tierKey = purchaseType.slice('subscription_'.length);
        const tier = await getTier(tierKey);
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        // Guard against a forged/tampered client request paying less than the
        // tier actually costs (e.g. amount=5 with purchaseType=subscription_premium),
        // or targeting a tier that isn't meant to be purchased at all (e.g. the
        // auto-granted trial) — the webhook must never trust purchaseType alone.
        if (tier && tier.isPurchasable && Number.isFinite(paidAmount) && paidAmount >= tier.price - 0.01) {
          // token identifies the recurring subscription itself — present on
          // both the initial charge and every recurring monthly charge.
          // Recording it (and refreshing last_billed_at every cycle) is what
          // lets the cancellation flow — and any future reconciliation —
          // find the right PayFast subscription for this business.
          // A successful charge always clears any in-flight grace window —
          // otherwise the billing cron would downgrade a customer who just paid.
          const intervalMonths = Number(payfastData.custom_int2) > 0
            ? Number(payfastData.custom_int2)
            : 1;
          const nextBilling = nextBillingDate(new Date(), intervalMonths);

          const upgraded = (await db`
            UPDATE businesses
            SET package_type = ${tierKey},
                payfast_token = COALESCE(${payfastData.token || null}, payfast_token),
                subscription_status = 'active',
                last_billed_at = NOW(),
                billing_interval_months = ${intervalMonths},
                next_billing_at = ${nextBilling.toISOString()},
                auto_renew = TRUE,
                payment_failed_at = NULL,
                grace_warned_at = NULL,
                downgraded_from = NULL,
                downgraded_at = NULL,
                updated_at = NOW()
            WHERE user_id = ${userId}
            RETURNING id
          `.catch(err => { console.log('Subscription upgrade note:', err.message); return []; })) as unknown as { id: string }[];

          grantMessage = `Your business has been upgraded to the ${tier.name} plan.`;

          // Receipt: one of the three email types the platform sends.
          await issueInvoice({
            userId,
            businessId: upgraded[0]?.id ?? null,
            tierKey,
            tierName: tier.name,
            description: `${tier.name} subscription`,
            amountCents: Math.round(paidAmount * 100),
            renewalPriceCents: Math.round(tier.price * 100),
            intervalMonths,
            paymentReference: paymentRef,
            baseUrl: appUrlFromRequest(request),
          });
        } else {
          console.error(`Blocked subscription upgrade: paid R${paidAmount} for ${tierKey} (requires R${tier?.price}, purchasable=${tier?.isPurchasable})`, { userId, paymentRef });
          grantMessage = 'Your payment was received, but the amount did not match the selected plan. Please contact support.';
        }
      } else if (purchaseType === 'ad_credits_topup') {
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        const creditDays = Number.isFinite(paidAmount) ? Math.floor(paidAmount / AD_CREDIT_PRICE_PER_DAY) : 0;
        if (creditDays > 0) {
          await db`
            UPDATE businesses SET ad_credits = ad_credits + ${creditDays}, updated_at = NOW()
            WHERE user_id = ${userId}
          `.catch(err => console.log('Ad credit top-up note:', err.message));
          grantMessage = `${creditDays} ad-day credit${creditDays === 1 ? '' : 's'} added to your account.`;
        }
      } else if (purchaseType === 'verification_fee') {
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        if (Number.isFinite(paidAmount) && paidAmount >= 49 - 0.01) {
          // status, not just verification_paid. The badge shown across the
          // app reads status, and commission counts a sale only when the
          // business is verified — so setting the flag alone left the
          // customer paying R49 for a badge that never appeared and the
          // advisor earning nothing, while this very message told them both
          // it had worked.
          await db`
            UPDATE businesses
            SET verification_paid = TRUE,
                verification_paid_at = NOW(),
                status = 'verified',
                verified_at = COALESCE(verified_at, NOW()),
                updated_at = NOW()
            WHERE user_id = ${userId}
          `.catch(err => console.log('Verification fee update note:', err.message));
          grantMessage = 'Your business has been verified! The verified badge is now active on your profile.';

          // Log for attributed agent
          const [biz] = await db`SELECT assisted_by_user_id FROM businesses WHERE user_id = ${userId} LIMIT 1`.catch(() => []);
          if (biz?.assisted_by_user_id) {
            const { logAgentActivity } = await import('@/lib/agents');
            await logAgentActivity(biz.assisted_by_user_id, 'verification_paid', 'Business paid R49 verification fee', userId).catch(() => {});
          }
        } else {
          console.error(`Blocked verification fee: paid R${paidAmount}, requires R49`, { userId, paymentRef });
          grantMessage = 'Your payment was received, but the amount did not match the verification fee. Please contact support.';
        }
      }

      // Create notification
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${userId}, 'payment_success', 'Payment Successful', ${grantMessage})
      `.catch(err => console.log('Notification note:', err.message));
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Payfast webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
