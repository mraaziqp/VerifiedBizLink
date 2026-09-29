import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyItnSignature, payfastEnv } from '@/lib/payfast';
import { getTier, AD_BOOST_PRICE, AD_BOOST_DURATION_DAYS, VERIFICATION_FEE_RAND } from '@/lib/tiers';
import { changeCredits, findCreditPack, packForAmount } from '@/lib/ad-credits';
import { nextBillingDate } from '@/lib/billing';
import { issueInvoice } from '@/lib/invoices';
import { appUrlFromRequest } from '@/lib/email';
import { logBillingEvent } from '@/lib/billing-events';
import { sendFailureNotice } from '@/lib/billing-notices';
import { cancelPayfastSubscription } from '@/lib/payfast-api';

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

type PaymentRow = {
  id: string;
  user_id: string | null;
  amount: number | string;
  status: string;
  purchase_type: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const formData = new URLSearchParams(rawBody);
    const payfastData: Record<string, string> = {};
    formData.forEach((value, key) => {
      payfastData[key] = value;
    });

    const PAYFAST_MERCHANT_ID = payfastEnv('PAYFAST_MERCHANT_ID');
    const passphrase = payfastEnv('PAYFAST_PASSPHRASE');
    const itnRef = payfastData.m_payment_id || null;

    // Record every notification before judging it. Without this, an ITN that
    // is rejected leaves no trace anywhere and the only visible symptom is a
    // payment stuck on 'pending' with no way to tell whether PayFast ever
    // called at all.
    const logItn = (outcome: string, detail: string | null = null) =>
      db`
        INSERT INTO payfast_itn_log (payment_reference, payfast_reference, payment_status, outcome, detail, raw_body)
        VALUES (${itnRef}, ${payfastData.pf_payment_id || null}, ${payfastData.payment_status || null},
                ${outcome}, ${detail}, ${rawBody.slice(0, 8000)})
      `.catch((e) => console.error('ITN log write failed:', e.message));

    const { valid, variant } = verifyItnSignature(
      formData.entries(),
      payfastData.signature,
      passphrase,
    );

    if (!valid) {
      console.error('PayFast ITN signature did not match', {
        paymentRef: itnRef,
        passphraseConfigured: Boolean(passphrase),
        fieldCount: [...formData.keys()].length,
      });
      await logItn('rejected_signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    if (payfastData.merchant_id !== PAYFAST_MERCHANT_ID) {
      console.error('PayFast ITN merchant id mismatch', { paymentRef: itnRef });
      await logItn('rejected_merchant');
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 403 });
    }

    /**
     * PayFast's server-side confirmation, and what to do when it cannot be
     * reached.
     *
     * Failing closed here used to drop genuine payments in silence: the call
     * returns 200 either way, so PayFast stops retrying and a customer who
     * has been charged never gets what they paid for.
     *
     * A configured passphrase is a shared secret. A signature that verifies
     * against it could not have been produced by anyone else, so an
     * unreachable validator is a network problem, not evidence of forgery,
     * and the payment is honoured with a loud warning. Without a passphrase
     * the signature proves nothing — merchant_id is public — so the check
     * stays mandatory.
     */
    const validated = await isGenuineItn(rawBody);
    if (!validated) {
      if (!passphrase) {
        console.error('PayFast ITN failed validation and no passphrase is set — refusing to act', { paymentRef: itnRef });
        await logItn('rejected_unvalidated_no_passphrase');
        return NextResponse.json({ success: true }, { status: 200 });
      }
      console.warn('PayFast validation call failed, but the signature verified against the passphrase — proceeding', { paymentRef: itnRef });
      await logItn('accepted_signature_only');
    } else {
      await logItn('accepted', `signature variant: ${variant}`);
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
      // A subscription's renewals share its m_payment_id, so the charge being
      // reversed is found by pf_payment_id first — otherwise refunding month
      // three would reverse month one.
      const reversedRef = String(payfastData.pf_payment_id || '').trim();
      const [reversedCharge] = reversedRef
        ? ((await db`
            SELECT reference FROM payments
            WHERE payfast_reference = ${reversedRef} OR reference = ${reversedRef}
            LIMIT 1
          `.catch(() => [])) as unknown as { reference: string }[])
        : [];
      const { reversePaymentAndRaiseClawback } = await import('@/lib/clawbacks');
      const result = await reversePaymentAndRaiseClawback({
        paymentReference: reversedCharge?.reference ?? paymentRef,
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
        INSERT INTO notifications (user_id, type, title, content)
        SELECT id, 'payment_reversed', 'Payment reversed by PayFast',
               ${`${paymentRef} came back as ${normalizedStatus.toLowerCase()}. The account still holds its plan — review it.`}
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


    /**
     * Which charge is this, and who is it for?
     *
     * A subscription's first charge and every renewal after it all carry the
     * m_payment_id checkout created; only pf_payment_id is new per charge. So
     * the checkout row (`original`) says what was bought and by whom, and
     * pf_payment_id (`thisCharge`) says whether this exact charge has been
     * seen before.
     *
     * A renewal is a charge against a checkout that has already completed.
     * The earlier version settled every renewal onto the original row — the
     * first month was overwritten each time and no later month ever reached
     * Transaction History, the admin payment log, or advisor retention
     * commission. PayFast charged the R10 test subscription on 24 September
     * 2026 and there was no row for it anywhere.
     */
    const pfReference = String(payfastData.pf_payment_id || '').trim();
    const token = String(payfastData.token || '').trim() || null;

    const [original] = (await db`
      SELECT id, user_id, amount, status, purchase_type
      FROM payments WHERE reference = ${paymentRef} LIMIT 1
    `.catch(() => [])) as unknown as PaymentRow[];

    const [thisCharge] = pfReference
      ? ((await db`
          SELECT id, status FROM payments
          WHERE payfast_reference = ${pfReference} OR reference = ${pfReference}
          LIMIT 1
        `.catch(() => [])) as unknown as { id: string; status: string }[])
      : [];

    // A charge that is not the checkout row, against a checkout that has
    // already completed. Also true when a renewal first arrived as PENDING and
    // this is its COMPLETE — that charge has its own row by then.
    const isRenewal = original
      ? original.status === 'completed' && thisCharge?.id !== original.id
      : Boolean(token);

    // PayFast normally echoes the custom fields on every charge, but the
    // checkout row and the subscription token are the records of who is
    // paying — a renewal must never be orphaned, or granted to nobody.
    let userId = (payfastData.custom_str2 || original?.user_id || '').trim();
    if (!userId && token) {
      const [owner] = (await db`
        SELECT user_id FROM businesses WHERE payfast_token = ${token} LIMIT 1
      `.catch(() => [])) as unknown as { user_id: string }[];
      userId = owner?.user_id ?? '';
    }
    const purchaseType = payfastData.custom_str3 || original?.purchase_type || 'ad_credits';
    const amountCents = Math.round(parseFloat(payfastData.amount_gross || '0') * 100);

    /**
     * Money moved and the ledger could not show it. That is an accounting
     * problem, so admins are told rather than it being logged and forgotten.
     */
    const raiseUnrecorded = (why: string) =>
      logBillingEvent({
        event: 'payment_unrecorded',
        severity: 'critical',
        userId: userId || null,
        amountCents,
        reference: pfReference || paymentRef,
        detail: `PayFast charge ${pfReference || paymentRef} (R${payfastData.amount_gross}, ${payfastData.email_address || 'unknown payer'}) could not be written to the ledger: ${why}. Reconcile it by hand.`,
        alertAdmins: true,
        alertTitle: 'A PayFast charge could not be recorded',
      });

    /** Writes this charge to the ledger — its own row for a renewal. */
    const recordCharge = async (status: string) => {
      if (thisCharge) {
        await db`
          UPDATE payments
          SET status = ${status},
              completed_at = CASE WHEN ${status} = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END
          WHERE id = ${thisCharge.id}
            AND (status <> 'completed' OR ${status} = 'completed')
        `;
        return;
      }
      if (original && !isRenewal) {
        await db`
          UPDATE payments
          SET status = ${status},
              payfast_reference = ${pfReference || null},
              completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END
          WHERE id = ${original.id}
        `;
        return;
      }
      if (!pfReference) {
        throw new Error('no pf_payment_id to record a renewal against');
      }
      const inserted = (await db`
        INSERT INTO payments (user_id, amount, status, reference, payfast_reference, description, purchase_type, completed_at)
        VALUES (
          ${userId || null},
          ${amountCents},
          ${status},
          ${pfReference},
          ${pfReference},
          ${isRenewal ? `${payfastData.item_name || 'Subscription'} — renewal` : (payfastData.item_name || 'PayFast payment')},
          ${purchaseType},
          ${status === 'completed' ? new Date().toISOString() : null}
        )
        ON CONFLICT (reference) DO NOTHING
        RETURNING id
      `) as unknown as { id: string }[];
      if (inserted.length === 0) {
        throw new Error('a row with this reference already exists');
      }
    };

    if (dbStatus !== 'completed') {
      // A first charge that failed settles its checkout row. A renewal that
      // failed gets a row of its own, so the attempt is visible, and opens
      // the 72-hour grace window the billing sweep already runs — the customer
      // is warned and keeps their plan while they fix their card.
      await recordCharge(dbStatus).catch((err) => raiseUnrecorded(err.message));

      if (dbStatus === 'failed') {
        let businessId: string | null = null;
        if (isRenewal && userId) {
          const flagged = (await db`
            UPDATE businesses
            SET payment_failed_at = COALESCE(payment_failed_at, NOW()),
                payment_failed_reason = 'card_declined',
                updated_at = NOW()
            WHERE user_id = ${userId} AND package_type IS NOT NULL AND package_type <> 'free'
            RETURNING id, company_name, payment_failed_notified_at
          `.catch((err) => { console.error('Failed-renewal flag note:', err.message); return []; })) as unknown as { id: string; company_name: string; payment_failed_notified_at: string | null }[];
          businessId = flagged[0]?.id ?? null;
          // Tell the customer now rather than on the next sweep. If this
          // send fails it is logged, and the sweep retries it.
          if (flagged[0] && !flagged[0].payment_failed_notified_at) {
            await sendFailureNotice(flagged[0].id, { baseUrl: appUrlFromRequest(request) });
          }
        }
        await logBillingEvent({
          event: isRenewal ? 'renewal_failed' : 'charge_failed',
          severity: isRenewal ? 'critical' : 'warning',
          businessId,
          userId: userId || null,
          amountCents,
          reference: pfReference || paymentRef,
          detail: isRenewal
            ? `PayFast could not collect the R${payfastData.amount_gross} renewal (${purchaseType}) from ${payfastData.email_address || userId}. The customer has been emailed a Pay now link and has 5 days before the plan expires.`
            : `A R${payfastData.amount_gross} ${purchaseType} payment by ${payfastData.email_address || userId} failed at PayFast. Nothing was granted.`,
          alertAdmins: true,
          alertTitle: isRenewal ? 'A subscription renewal failed' : 'A payment failed',
        });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // A charge is only marked completed after it has been granted (below).
    // So a completed row means this is PayFast re-sending a notification it
    // already delivered — it retries until it gets a 200 — and granting again
    // would email a second invoice and add a second notification.
    if (thisCharge?.status === 'completed') {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!userId) {
      // Still recorded, so the money is visible in the payment log; an admin
      // has to decide whose it is.
      await recordCharge('completed').catch((err) => raiseUnrecorded(err.message));
      await raiseUnrecorded('it was recorded without an owner — no user could be matched to it');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    /**
     * A renewal on a subscription this business has since replaced — the
     * customer used Pay now, which starts a new subscription and cancels the
     * old one. If the old one charges anyway (the cancel did not go through
     * at PayFast), granting it would switch the account back to the old
     * token. Record the money, grant nothing, and get a person to refund it.
     */
    if (isRenewal && token && purchaseType.startsWith('subscription_')) {
      const [current] = (await db`
        SELECT id, company_name, payfast_token FROM businesses WHERE user_id = ${userId} LIMIT 1
      `.catch(() => [])) as unknown as { id: string; company_name: string; payfast_token: string | null }[];
      if (current?.payfast_token && current.payfast_token !== token) {
        await recordCharge('completed').catch((err) => raiseUnrecorded(err.message));
        await logBillingEvent({
          event: 'charge_on_replaced_subscription',
          severity: 'critical',
          businessId: current.id,
          userId,
          amountCents,
          reference: pfReference,
          detail: `${current.company_name} was charged R${payfastData.amount_gross} on their OLD PayFast subscription ${token}, which was replaced by ${current.payfast_token}. They may have been billed twice — cancel ${token} in the PayFast dashboard and refund charge ${pfReference}.`,
          alertAdmins: true,
          alertTitle: `Possible double charge: ${current.company_name}`,
        });
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    // Grant whatever was actually purchased. If this throws, nothing has been
    // marked completed, the 500 makes PayFast retry, and the retry grants.
    {
      const adId = payfastData.custom_str1 as string;
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

        /**
         * What this charge must cover.
         *
         * A first charge is checked against the tier as it stands today, and
         * the tier must be on sale — a forged or tampered checkout (amount=5
         * with purchaseType=subscription_premium, or the auto-granted trial)
         * must never be granted.
         *
         * A renewal is checked against what the customer signed up for: the
         * amount of their first charge, which is also the recurring amount
         * PayFast was told to bill. Checking it against today's tier instead
         * meant that raising a price, or switching a tier off for new sales,
         * blocked every existing subscriber's renewal — they were charged,
         * their billing date never moved, and the overdue sweep downgraded
         * customers who had paid.
         */
        /*
         * A Pay now after a failed renewal (custom_str5 = 'resume') restarts
         * the customer's existing plan at their existing price, so it is held
         * to the amount /api/billing/renew priced on the server and stored on
         * the checkout row — not to whether the tier is still on sale.
         */
        const isResume = !isRenewal && payfastData.custom_str5 === 'resume' && Boolean(original);
        const renewalOf = (isRenewal || isResume) && original ? Number(original.amount) / 100 : null;
        const eligible = renewalOf !== null
          ? Boolean(tierKey)
          : Boolean(tier && tier.isPurchasable);
        const requiredRand = renewalOf ?? Number(tier?.price ?? Infinity);
        const tierName = tier?.name ?? tierKey;

        if (eligible && Number.isFinite(paidAmount) && paidAmount >= requiredRand - 0.01) {
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

          /**
           * Every paid plan includes vetting and the badge — the R49 once-off
           * is the same entitlement for someone who does not want a
           * subscription. So a paid plan grants status = 'verified' here.
           *
           * Setting package_type alone left a paying customer on the tier
           * whose headline feature is "CIPC-verified business badge" without
           * the badge, because it is status the whole app reads. It also cost
           * their advisor the commission, which only counts verified sales.
           *
           * The free tier never grants it — there is nothing paid for.
           *
           * badge_source records that this badge came from a purchase rather
           * than a document review, because a verified business drops out of
           * the vetting queue and otherwise nobody could tell afterwards
           * whether anyone had actually checked it.
           */
          const grantsBadge = paidAmount > 0;

          // The subscription this charge replaces, if the customer used Pay
          // now. Read before the UPDATE below overwrites it.
          const [before] = (await db`
            SELECT payfast_token FROM businesses WHERE user_id = ${userId} LIMIT 1
          `.catch(() => [])) as unknown as { payfast_token: string | null }[];
          const replacedToken = before?.payfast_token && token && before.payfast_token !== token
            ? before.payfast_token
            : null;

          const upgraded = (await db`
            UPDATE businesses
            SET package_type = ${tierKey},
                payfast_token = COALESCE(${token}, payfast_token),
                subscription_status = 'active',
                last_billed_at = NOW(),
                billing_interval_months = ${intervalMonths},
                next_billing_at = ${nextBilling.toISOString()},
                auto_renew = TRUE,
                payment_failed_at = NULL,
                payment_failed_notified_at = NULL,
                payment_failed_reason = NULL,
                grace_warned_at = NULL,
                downgraded_from = NULL,
                downgraded_at = NULL,
                status = CASE WHEN ${grantsBadge} THEN 'verified' ELSE status END,
                verified_at = CASE WHEN ${grantsBadge} THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
                badge_source = CASE
                  WHEN ${grantsBadge} AND badge_source IS NULL THEN 'subscription'
                  ELSE badge_source END,
                updated_at = NOW()
            WHERE user_id = ${userId}
            RETURNING id
          `.catch(err => { console.error('Subscription upgrade FAILED:', err.message); return []; })) as unknown as { id: string }[];

          if (upgraded.length === 0) {
            // Paid, and nothing on the account moved. Without this the renewal
            // sweep would later dun a customer whose money arrived.
            await logBillingEvent({
              event: 'payment_unapplied',
              severity: 'critical',
              userId,
              amountCents: Math.round(paidAmount * 100),
              reference: pfReference || paymentRef,
              detail: `PayFast charge ${pfReference || paymentRef} (R${payfastData.amount_gross}) for ${tierName} matched no business for user ${userId}. Apply it by hand.`,
              alertAdmins: true,
              alertTitle: 'A subscription payment was not applied',
            });
          } else {
            if (replacedToken) {
              // The new subscription has charged, so the old one must never
              // charge again — otherwise the customer pays twice next month.
              const cancelled = await cancelPayfastSubscription(replacedToken);
              await logBillingEvent({
                event: cancelled.ok ? 'old_subscription_cancelled' : 'old_subscription_cancel_failed',
                severity: cancelled.ok ? 'info' : 'critical',
                businessId: upgraded[0].id,
                userId,
                reference: replacedToken,
                detail: cancelled.ok
                  ? `Old PayFast subscription ${replacedToken} cancelled after the customer paid on new subscription ${token}.`
                  : `The customer paid on new subscription ${token}, but old subscription ${replacedToken} could NOT be cancelled automatically (HTTP ${cancelled.status}: ${cancelled.detail}). Cancel it in the PayFast dashboard now or they may be billed twice.`,
                alertAdmins: !cancelled.ok,
                alertTitle: 'Cancel an old PayFast subscription by hand',
              });
            }
            await logBillingEvent({
              event: isRenewal ? 'renewal_succeeded' : 'charge_succeeded',
              businessId: upgraded[0].id,
              userId,
              amountCents: Math.round(paidAmount * 100),
              reference: pfReference || paymentRef,
              detail: `${tierName} ${isRenewal ? 'renewed' : isResume ? 'resumed through Pay now' : 'started'} — R${payfastData.amount_gross} from ${payfastData.email_address || userId}. Next billing ${nextBilling.toISOString().slice(0, 10)}.`,
            });
          }

          grantMessage = isRenewal
            ? `Your ${tierName} subscription has renewed — R${payfastData.amount_gross} received. Next billing date: ${nextBilling.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.`
            : grantsBadge
              ? `Your business has been upgraded to the ${tierName} plan, and your verified badge is now active.`
              : `Your business has been moved to the ${tierName} plan.`;

          // Receipt: one of the three email types the platform sends. Keyed on
          // this charge, so each month's invoice points at its own payment.
          await issueInvoice({
            userId,
            businessId: upgraded[0]?.id ?? null,
            tierKey,
            tierName,
            description: isRenewal ? `${tierName} subscription — renewal` : `${tierName} subscription`,
            amountCents: Math.round(paidAmount * 100),
            renewalPriceCents: Math.round((renewalOf ?? Number(tier?.price ?? paidAmount)) * 100),
            intervalMonths,
            paymentReference: pfReference || paymentRef,
            baseUrl: appUrlFromRequest(request),
          });
        } else {
          grantMessage = 'Your payment was received, but the amount did not match the selected plan. Please contact support.';
          await logBillingEvent({
            event: 'payment_unapplied',
            severity: 'critical',
            userId,
            amountCents: Math.round(paidAmount * 100),
            reference: pfReference || paymentRef,
            detail: `PayFast charge ${pfReference || paymentRef} paid R${paidAmount} for ${tierName} but R${requiredRand} was required (purchasable=${tier?.isPurchasable}, renewal=${isRenewal}, resume=${isResume}). The customer was charged and not given the plan — review it.`,
            alertAdmins: true,
            alertTitle: 'A subscription payment was not applied',
          });
        }
      } else if (purchaseType === 'ad_credits_topup') {
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        // The pack id travels in custom_str4. Checkouts started before packs
        // had ids are matched by the amount paid, which is unique per pack.
        const pack = findCreditPack(payfastData.custom_str4) ?? (Number.isFinite(paidAmount) ? packForAmount(paidAmount) : null);
        const [biz] = await db`SELECT id FROM businesses WHERE user_id = ${userId} LIMIT 1`;

        if (!pack || !Number.isFinite(paidAmount) || paidAmount + 0.01 < pack.price) {
          console.error('Credit top-up not granted: amount does not match a pack', { paidAmount, pack: pack?.id, paymentRef });
          grantMessage = 'Your payment was received, but it did not match a credit pack. Please contact support.';
        } else if (!biz) {
          console.error('Credit top-up not granted: no business for user', { userId, paymentRef });
          grantMessage = 'Your payment was received, but no business profile was found. Please contact support.';
        } else {
          // Keyed on the payment, so PayFast re-sending this notification
          // (which it does whenever the first reply is slow) cannot add the
          // credits a second time.
          const result = await changeCredits({
            businessId: String(biz.id),
            delta: pack.credits,
            kind: 'purchase',
            note: `Bought ${pack.credits} credits (${pack.label}) — R${pack.price}`,
            reference: `payfast:${paymentRef}`,
          });
          if (!result.applied && result.reason === 'duplicate') {
            // Already granted by an earlier copy of this notification.
            await recordCharge('completed').catch((err) => raiseUnrecorded(err.message));
            return NextResponse.json({ success: true }, { status: 200 });
          }
          grantMessage = `${pack.credits} ad credits added to your account.`;
        }
      } else if (purchaseType === 'verification_fee') {
        const paidAmount = parseFloat(payfastData.amount_gross as string);
        if (Number.isFinite(paidAmount) && paidAmount >= VERIFICATION_FEE_RAND - 0.01) {
          // status, not just verification_paid. The badge shown across the
          // app reads status, and commission counts a sale only when the
          // business is verified — so setting the flag alone left the
          // customer paying R49 for a badge that never appeared and the
          // advisor earning nothing, while this very message told them both
          // it had worked.
          const updated = (await db`
            UPDATE businesses
            SET verification_paid = TRUE,
                verification_paid_at = NOW(),
                status = 'verified',
                verified_at = COALESCE(verified_at, NOW()),
                badge_source = COALESCE(badge_source, 'verification_fee'),
                updated_at = NOW()
            WHERE user_id = ${userId}
            RETURNING id, assisted_by_user_id
          `.catch(err => { console.log('Verification fee update note:', err.message); return []; })) as unknown as { id: string; assisted_by_user_id: string | null }[];

          const biz = updated[0];
          grantMessage = 'Your business has been verified! The verified badge is now active on your profile.';

          // Issue invoice and send email receipt
          await issueInvoice({
            userId,
            businessId: biz?.id ?? null,
            tierKey: 'verification_fee',
            tierName: 'Verification Fee (Once-Off)',
            description: 'CIPC & ID Document Vetting + Gold Verified Badge (Once-Off)',
            amountCents: Math.round(paidAmount * 100),
            renewalPriceCents: 0,
            intervalMonths: 0,
            intervalLabel: 'Once-off',
            paymentReference: pfReference || paymentRef,
            baseUrl: appUrlFromRequest(request),
          }).catch(err => console.log('Verification fee invoice note:', err.message));

          // Log for attributed agent
          if (biz?.assisted_by_user_id) {
            const { logAgentActivity } = await import('@/lib/agents');
            await logAgentActivity(biz.assisted_by_user_id, 'verification_paid', `Business paid R${VERIFICATION_FEE_RAND} verification fee`, userId).catch(() => {});
          }
        } else {
          console.error(`Blocked verification fee: paid R${paidAmount}, requires R${VERIFICATION_FEE_RAND}`, { userId, paymentRef });
          grantMessage = 'Your payment was received, but the amount did not match the verification fee. Please contact support.';
        }
      }

      // Create notification
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${userId}, 'payment_success', ${isRenewal ? 'Subscription renewed' : 'Payment Successful'}, ${grantMessage})
      `.catch(err => console.log('Notification note:', err.message));

      // Subscriptions log their own outcome above; everything else is logged
      // here so every purchase appears in the billing log.
      if (!purchaseType.startsWith('subscription_')) {
        await logBillingEvent({
          event: 'charge_succeeded',
          userId,
          amountCents,
          reference: pfReference || paymentRef,
          detail: `${purchaseType} — R${payfastData.amount_gross} from ${payfastData.email_address || userId}: ${grantMessage}`,
        });
      }
    }

    // Recorded last: a completed row is the marker that this charge has been
    // granted in full (see the re-send check above).
    await recordCharge('completed').catch((err) => raiseUnrecorded(err.message));

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
