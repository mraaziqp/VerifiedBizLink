import db, { type DbRow } from '@/lib/db';
import { getTier, type Tier } from '@/lib/tiers';
import { changeCredits } from '@/lib/ad-credits';
import { cancelPayfastSubscription } from '@/lib/payfast-api';
import { logBillingEvent } from '@/lib/billing-events';
import { DOWNGRADE_TIER } from '@/lib/billing';

export type TierGrantMode = 'complimentary' | 'timed_free' | 'remove';
export type DowngradeReasonCategory = 'non_payment' | 'terms_violation' | 'fraud' | 'requested' | 'admin_discretion';

export interface TierGrantActor {
  userId: string;
  fullName: string;
  role: string;
}

export interface GrantBusinessTierInput {
  businessId: string;
  mode: TierGrantMode;
  tierKey?: string;
  durationDays?: number | null;
  expiresAt?: string | null;
  grantVerifiedBadge?: boolean;
  revokeAdminBadge?: boolean;
  syncMonthlyCredits?: boolean;
  bonusAdCredits?: number;
  cancelPayfast?: boolean;
  reason: string;
  downgradeReasonCategory?: DowngradeReasonCategory;
  actor: TierGrantActor;
}

export interface GrantBusinessTierResult {
  business: DbRow;
  tier: Tier;
  mode: TierGrantMode;
  expiresAt: string | null;
  grantedCredits: number;
  payfastCancelled: boolean;
  requiresManualPayfastCancellation: boolean;
}

export class TierActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let schemaReady: Promise<void> | null = null;

/**
 * Ensures admin tier-grant metadata columns exist on `businesses`.
 * Memoized once per process so hot paths pay no extra query cost.
 */
export function ensureBusinessTierColumns(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_grant_type TEXT`;
      await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_granted_by UUID`;
      await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_granted_at TIMESTAMPTZ`;
      await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_grant_note TEXT`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

function resolveExpiryDate(durationDays?: number | null, expiresAtRaw?: string | null): Date {
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      throw new TierActionError(400, 'Expiry date must be in the future.');
    }
    return parsed;
  }
  const days = Math.trunc(Number(durationDays));
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new TierActionError(400, 'Duration must be between 1 and 3650 days.');
  }
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + days);
  return end;
}

/**
 * Grants a complimentary or timed free tier to a business, or cleanly removes
 * their active tier back to `'free'`. Updates billing flags safely so the
 * automated billing cron respects indefinite comps and expires timed grants.
 */
export async function grantBusinessTier(input: GrantBusinessTierInput): Promise<GrantBusinessTierResult> {
  if (!UUID_RE.test(input.businessId)) {
    throw new TierActionError(400, 'Invalid business ID.');
  }
  const reason = (input.reason || '').trim().slice(0, 500);
  if (reason.length < 3) {
    throw new TierActionError(400, 'Please enter a short reason (at least 3 characters) for the audit log.');
  }

  await ensureBusinessTierColumns();

  const effectiveMode: TierGrantMode =
    input.mode === 'remove' || input.tierKey === DOWNGRADE_TIER ? 'remove' : input.mode;
  const targetKey = effectiveMode === 'remove' ? DOWNGRADE_TIER : String(input.tierKey || '').trim();
  if (!targetKey) {
    throw new TierActionError(400, 'Select a target tier.');
  }

  const tier = await getTier(targetKey);
  if (!tier) {
    throw new TierActionError(404, `Unknown tier "${targetKey}".`);
  }

  const [before] = (await db`
    SELECT id, user_id, company_name, status, badge_source, documents_reviewed_at,
           verification_paid, package_type, payfast_token, subscription_status,
           trial_package, trial_ends_at, tier_grant_type
    FROM businesses
    WHERE id = ${input.businessId}
    LIMIT 1
  `) as DbRow[];

  if (!before) {
    throw new TierActionError(404, 'Business not found.');
  }
  if (before.tier_grant_type === 'owner') {
    throw new TierActionError(
      409,
      `${String(before.company_name)} is an owner account (permanent Premium). Remove its owner email from the Owner accounts list first if you really mean to change it.`,
    );
  }

  // Cancel any active PayFast subscription before DB updates so we never hold
  // locks across network I/O and never leave the merchant being auto-billed.
  let payfastCancelled = false;
  let requiresManualPayfastCancellation = false;
  const existingToken = before.payfast_token ? String(before.payfast_token) : null;
  const shouldCancelPayfast = existingToken && input.cancelPayfast !== false;

  if (shouldCancelPayfast && existingToken) {
    const cancelled = await cancelPayfastSubscription(existingToken);
    payfastCancelled = Boolean(cancelled?.ok);
    requiresManualPayfastCancellation = !payfastCancelled;

    await logBillingEvent({
      event: payfastCancelled ? 'old_subscription_cancelled' : 'old_subscription_cancel_failed',
      severity: payfastCancelled ? 'info' : 'critical',
      businessId: String(before.id),
      userId: String(before.user_id),
      reference: existingToken,
      detail: payfastCancelled
        ? `Admin (${input.actor.fullName}) moved ${String(before.company_name)} to ${effectiveMode === 'remove' ? 'Free' : `${tier.name} (complimentary)`}. PayFast subscription ${existingToken} was cancelled automatically.`
        : `Admin (${input.actor.fullName}) moved ${String(before.company_name)} to ${effectiveMode === 'remove' ? 'Free' : `${tier.name} (complimentary)`}, but PayFast subscription ${existingToken} failed automatic cancellation (HTTP ${cancelled?.status}: ${cancelled?.detail}). Cancel it in PayFast manually.`,
      alertAdmins: !payfastCancelled,
      alertTitle: `Cancel PayFast subscription manually: ${String(before.company_name)}`,
    });
  }

  const expiryDate = effectiveMode === 'timed_free'
    ? resolveExpiryDate(input.durationDays, input.expiresAt)
    : null;
  const expiryIso = expiryDate ? expiryDate.toISOString() : null;

  let updatedRows: DbRow[];
  if (effectiveMode === 'remove') {
    const canRevokeBadge = Boolean(
      input.revokeAdminBadge &&
      ['admin_grant', 'subscription'].includes(String(before.badge_source || '')) &&
      !before.documents_reviewed_at &&
      before.verification_paid !== true,
    );

    const statusForDowngrade =
      input.downgradeReasonCategory === 'non_payment'
        ? 'downgraded_nonpayment'
        : input.downgradeReasonCategory === 'terms_violation'
          ? 'terms_violation'
          : 'cancelled';

    const { revokeCertificatesFor } = await import('@/lib/certificates');
    updatedRows = (await db`
      UPDATE businesses
      SET
        downgraded_from = CASE
          WHEN package_type IS NOT NULL AND package_type <> ${DOWNGRADE_TIER} THEN package_type
          ELSE downgraded_from
        END,
        downgraded_at = CASE
          WHEN package_type IS NOT NULL AND package_type <> ${DOWNGRADE_TIER} THEN NOW()
          ELSE downgraded_at
        END,
        package_type = ${DOWNGRADE_TIER},
        subscription_status = ${statusForDowngrade},
        auto_renew = FALSE,
        next_billing_at = NULL,
        cancelled_at = NOW(),
        cancellation_reason = ${reason},
        trial_package = NULL,
        trial_ends_at = NULL,
        payment_failed_at = NULL,
        payment_failed_notified_at = NULL,
        payment_failed_reason = ${input.downgradeReasonCategory === 'non_payment' ? 'admin_downgrade_unpaid' : null},
        grace_warned_at = NULL,
        payfast_token = CASE WHEN ${payfastCancelled} THEN NULL ELSE payfast_token END,
        tier_grant_type = NULL,
        tier_granted_by = ${input.actor.userId},
        tier_granted_at = NOW(),
        tier_grant_note = ${reason},
        status = CASE WHEN ${canRevokeBadge} THEN 'unregistered' ELSE status END,
        verified_at = CASE WHEN ${canRevokeBadge} THEN NULL ELSE verified_at END,
        badge_source = CASE WHEN ${canRevokeBadge} THEN NULL ELSE badge_source END,
        trust_score = CASE WHEN ${canRevokeBadge} THEN LEAST(COALESCE(trust_score, 30), 30) ELSE trust_score END,
        updated_at = NOW()
      WHERE id = ${input.businessId}
      RETURNING *
    `) as DbRow[];

    if (canRevokeBadge) {
      await revokeCertificatesFor(input.businessId, `Admin removed complimentary tier: ${reason}`).catch(() => 0);
    }
  } else {
    const grantsBadge = Boolean(input.grantVerifiedBadge);
    const grantType = effectiveMode === 'timed_free' ? 'timed_free' : 'complimentary';

    updatedRows = (await db`
      UPDATE businesses
      SET
        package_type = ${tier.key},
        subscription_status = 'active',
        auto_renew = FALSE,
        next_billing_at = ${expiryIso}::timestamptz,
        cancelled_at = NULL,
        cancellation_reason = NULL,
        trial_package = ${effectiveMode === 'timed_free' ? tier.key : null},
        trial_ends_at = ${expiryIso}::timestamptz,
        payment_failed_at = NULL,
        payment_failed_notified_at = NULL,
        payment_failed_reason = NULL,
        grace_warned_at = NULL,
        downgraded_from = NULL,
        downgraded_at = NULL,
        payfast_token = CASE WHEN ${payfastCancelled} THEN NULL ELSE payfast_token END,
        tier_grant_type = ${grantType},
        tier_granted_by = ${input.actor.userId},
        tier_granted_at = NOW(),
        tier_grant_note = ${reason},
        status = CASE WHEN ${grantsBadge} AND status <> 'verified' THEN 'verified' ELSE status END,
        trust_score = CASE WHEN ${grantsBadge} AND COALESCE(trust_score, 0) < 95 THEN 95 ELSE trust_score END,
        verified_at = CASE WHEN ${grantsBadge} THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
        badge_source = CASE
          WHEN badge_source = 'vetting_review' THEN 'vetting_review'
          WHEN ${grantsBadge} THEN COALESCE(badge_source, 'admin_grant')
          ELSE badge_source
        END,
        updated_at = NOW()
      WHERE id = ${input.businessId}
      RETURNING *
    `) as DbRow[];
  }

  const after = updatedRows[0];
  let grantedCredits = 0;

  if (effectiveMode !== 'remove') {
    const monthlyAmt = input.syncMonthlyCredits ? Math.max(0, Math.trunc(tier.monthlyAdCredits)) : 0;
    const bonusAmt = Math.max(0, Math.trunc(Number(input.bonusAdCredits || 0)));
    const totalToGrant = monthlyAmt + bonusAmt;
    if (totalToGrant > 0) {
      const creditRes = await changeCredits({
        businessId: input.businessId,
        delta: totalToGrant,
        kind: 'admin_adjustment',
        note: `Tier grant (${tier.name}): ${reason}`,
        actorId: input.actor.userId,
      });
      if (creditRes.applied) {
        grantedCredits = totalToGrant;
      }
    }
  }

  const auditAction =
    effectiveMode === 'remove'
      ? input.downgradeReasonCategory === 'non_payment'
        ? `Downgraded to Free (Unpaid): ${reason}`
        : input.downgradeReasonCategory === 'terms_violation'
          ? `Downgraded to Free (Terms Violation): ${reason}`
          : `Removed tier (moved to Free): ${reason}`
      : effectiveMode === 'timed_free'
        ? `Granted timed free ${tier.name} plan (until ${expiryIso?.slice(0, 10)}): ${reason}`
        : `Granted complimentary ${tier.name} plan: ${reason}`;

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
    VALUES (
      ${input.actor.userId},
      ${input.actor.fullName},
      ${auditAction.slice(0, 250)},
      'business',
      ${input.businessId},
      ${String(before.company_name || '')}
    )
  `.catch((err) => console.error('[business-tiers] audit log failed:', err));

  await logBillingEvent({
    event: effectiveMode === 'remove' ? 'admin_tier_removed' : 'admin_tier_granted',
    severity: input.downgradeReasonCategory === 'terms_violation' ? 'warning' : 'info',
    businessId: String(before.id),
    userId: String(before.user_id),
    detail: `${input.actor.fullName}: ${auditAction}`,
  });

  const ownerMessage =
    effectiveMode === 'remove'
      ? input.downgradeReasonCategory === 'non_payment'
        ? `Your business "${String(before.company_name)}" has been moved back to the Free Profile tier due to unpaid subscription fees.${reason ? ` Note: ${reason}` : ''} You can resubscribe or choose a new plan at any time in Settings → Billing.`
        : input.downgradeReasonCategory === 'terms_violation'
          ? `Your business "${String(before.company_name)}" has had its paid subscription revoked and moved back to Free due to a terms of service violation.${reason ? ` Note: ${reason}` : ''} Contact support if you believe this was in error.`
          : `Your business "${String(before.company_name)}" has been moved back to the Free Profile tier by an administrator.${reason ? ` Note: ${reason}` : ''}`
      : effectiveMode === 'timed_free'
        ? `Your business "${String(before.company_name)}" has been granted free complimentary access to the ${tier.name} plan until ${new Date(expiryIso!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.${grantedCredits > 0 ? ` (+${grantedCredits} ad credits added)` : ''}`
        : `Your business "${String(before.company_name)}" has been granted complimentary access to the ${tier.name} plan at no cost.${grantedCredits > 0 ? ` (+${grantedCredits} ad credits added)` : ''}`;

  const notificationTitle =
    effectiveMode === 'remove'
      ? input.downgradeReasonCategory === 'non_payment'
        ? 'Plan moved to Free (Unpaid)'
        : input.downgradeReasonCategory === 'terms_violation'
          ? 'Subscription revoked (Terms Violation)'
          : 'Plan moved to Free'
      : 'Complimentary plan activated';

  await db`
    INSERT INTO notifications (user_id, type, title, content)
    VALUES (
      ${before.user_id},
      ${effectiveMode === 'remove' ? 'subscription_ended' : 'payment_success'},
      ${notificationTitle},
      ${ownerMessage}
    )
  `.catch((err) => console.error('[business-tiers] notification failed:', err));

  return {
    business: after,
    tier,
    mode: effectiveMode,
    expiresAt: expiryIso,
    grantedCredits,
    payfastCancelled,
    requiresManualPayfastCancellation,
  };
}

export interface SetGrantExpiryInput {
  businessId: string;
  /** New end date (must be in the future), or null with permanent: true. */
  expiresAt?: string | null;
  permanent?: boolean;
  reason: string;
  actor: TierGrantActor;
}

/**
 * Changes when a free (complimentary or timed) grant ends, without re-granting:
 * move the end date, or make it permanent. Paid subscriptions and owner
 * accounts are not changed here.
 */
export async function setGrantExpiry(input: SetGrantExpiryInput) {
  if (!UUID_RE.test(input.businessId)) throw new TierActionError(400, 'Invalid business ID.');
  const reason = (input.reason || '').trim().slice(0, 500);
  if (reason.length < 3) throw new TierActionError(400, 'Please enter a short reason (at least 3 characters) for the audit log.');
  await ensureBusinessTierColumns();

  const [b] = (await db`
    SELECT id, user_id, company_name, package_type, tier_grant_type, next_billing_at
    FROM businesses WHERE id = ${input.businessId} LIMIT 1
  `) as DbRow[];
  if (!b) throw new TierActionError(404, 'Business not found.');
  if (b.tier_grant_type === 'owner') throw new TierActionError(409, 'Owner accounts are permanent already.');
  if (b.tier_grant_type !== 'timed_free' && b.tier_grant_type !== 'complimentary') {
    throw new TierActionError(409, `${String(b.company_name)} is not on a free grant, so there is no expiry to change.`);
  }

  let expiryIso: string | null = null;
  if (!input.permanent) {
    const d = new Date(String(input.expiresAt ?? ''));
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) throw new TierActionError(400, 'Choose an end date in the future.');
    if (d.getTime() > Date.now() + 3650 * 86400_000) throw new TierActionError(400, 'End date must be within 10 years.');
    expiryIso = d.toISOString();
  }

  const [after] = (await db`
    UPDATE businesses SET
      tier_grant_type = ${expiryIso ? 'timed_free' : 'complimentary'},
      next_billing_at = ${expiryIso}::timestamptz,
      trial_ends_at = ${expiryIso}::timestamptz,
      trial_package = ${expiryIso ? String(b.package_type) : null},
      auto_renew = FALSE,
      tier_granted_by = ${input.actor.userId},
      tier_granted_at = NOW(),
      tier_grant_note = ${reason},
      updated_at = NOW()
    WHERE id = ${input.businessId}
    RETURNING *
  `) as DbRow[];

  const when = expiryIso
    ? new Date(expiryIso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const action = expiryIso ? `Free plan end date set to ${expiryIso.slice(0, 10)}: ${reason}` : `Free plan made permanent: ${reason}`;
  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
    VALUES (${input.actor.userId}, ${input.actor.fullName}, ${action.slice(0, 250)}, 'business', ${input.businessId}, ${String(b.company_name || '')})
  `.catch((err) => console.error('[business-tiers] audit log failed:', err));
  await logBillingEvent({
    event: 'admin_tier_granted',
    businessId: String(b.id),
    userId: String(b.user_id),
    detail: `${input.actor.fullName}: ${String(b.company_name)} — ${action}`,
  });
  await db`
    INSERT INTO notifications (user_id, type, title, content)
    VALUES (${b.user_id}, 'payment_success', 'Your complimentary plan was updated',
            ${when ? `Your free ${String(b.package_type)} plan now runs until ${when}.` : `Your free ${String(b.package_type)} plan no longer expires.`})
  `.catch(() => undefined);

  return { business: after, expiresAt: expiryIso, permanent: !expiryIso };
}
