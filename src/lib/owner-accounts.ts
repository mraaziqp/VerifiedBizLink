import db, { type DbRow } from '@/lib/db';
import { cancelPayfastSubscription } from '@/lib/payfast-api';
import { logBillingEvent } from '@/lib/billing-events';
import { ensureBusinessTierColumns } from '@/lib/business-tiers';

/**
 * Owner accounts: the people who own VerifiedBizLink (and its sister
 * businesses). Every business owned by one of these emails is on the full
 * Premium plan for good — never billed, never warned, never downgraded.
 *
 * The list lives in platform_settings ('owner_accounts') so an admin can edit
 * it in Admin -> Tiers without a deploy. A business on this list carries
 * tier_grant_type = 'owner', which the billing sweep and the PayFast webhook
 * skip entirely.
 */

export const OWNER_TIER = 'premium';
const SETTINGS_KEY = 'owner_accounts';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normaliseOwnerEmails(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\s,;]+/) : [];
  const out = new Set<string>();
  for (const v of list) {
    const e = String(v ?? '').trim().toLowerCase();
    if (e && EMAIL_RE.test(e)) out.add(e);
  }
  return [...out].sort();
}

export async function getOwnerEmails(): Promise<string[]> {
  const rows = await db`SELECT value FROM platform_settings WHERE key = ${SETTINGS_KEY} LIMIT 1`.catch(() => [] as DbRow[]);
  const value = rows[0]?.value as { emails?: unknown } | undefined;
  return normaliseOwnerEmails(value?.emails);
}

export interface OwnerSyncResult {
  emails: string[];
  granted: Array<{ businessId: string; companyName: string; email: string }>;
  released: Array<{ businessId: string; companyName: string }>;
  payfastCancelFailures: string[];
  ownersWithoutBusiness: string[];
}

export interface OwnerActor {
  userId: string | null;
  name: string;
}

/**
 * Puts every owner's business on permanent Premium, cancelling any PayFast
 * subscription so it can never charge them. A business whose owner was taken
 * off the list keeps Premium as an ordinary complimentary grant (an admin can
 * then remove it deliberately) — it is never silently downgraded.
 *
 * Idempotent: safe to run on every save and on every billing sweep.
 */
export async function syncOwnerAccounts(actor: OwnerActor = { userId: null, name: 'Owner-account sync' }): Promise<OwnerSyncResult> {
  await ensureBusinessTierColumns();
  const emails = await getOwnerEmails();
  const result: OwnerSyncResult = { emails, granted: [], released: [], payfastCancelFailures: [], ownersWithoutBusiness: [] };

  const owned = emails.length
    ? await db`
        SELECT b.id, b.company_name, b.package_type, b.tier_grant_type, b.payfast_token, b.user_id, LOWER(u.email) AS email
        FROM businesses b JOIN users u ON u.id = b.user_id
        WHERE LOWER(u.email) = ANY(${emails})
      `
    : [];
  const withBusiness = new Set(owned.map((r) => String(r.email)));
  result.ownersWithoutBusiness = emails.filter((e) => !withBusiness.has(e));

  for (const b of owned) {
    const alreadyOwner = b.tier_grant_type === 'owner' && b.package_type === OWNER_TIER && !b.payfast_token;
    if (alreadyOwner) continue;

    let tokenCleared = true;
    if (b.payfast_token) {
      const token = String(b.payfast_token);
      const cancelled = await cancelPayfastSubscription(token).catch((err) => ({ ok: false, status: 0, detail: String(err) }));
      tokenCleared = cancelled.ok;
      if (!cancelled.ok) {
        result.payfastCancelFailures.push(String(b.company_name));
        await logBillingEvent({
          event: 'old_subscription_cancel_failed',
          severity: 'critical',
          businessId: String(b.id),
          userId: String(b.user_id),
          reference: token,
          detail: `${String(b.company_name)} is an owner account, but its PayFast subscription ${token} could NOT be cancelled automatically (HTTP ${cancelled.status}: ${cancelled.detail}). Cancel it in the PayFast dashboard so the owner is never charged.`,
          alertAdmins: true,
          alertTitle: `Cancel an owner's PayFast subscription: ${String(b.company_name)}`,
        });
      }
    }

    await db`
      UPDATE businesses SET
        package_type = ${OWNER_TIER},
        subscription_status = 'active',
        auto_renew = FALSE,
        next_billing_at = NULL,
        cancelled_at = NULL,
        cancellation_reason = NULL,
        trial_package = NULL,
        trial_ends_at = NULL,
        payment_failed_at = NULL,
        payment_failed_notified_at = NULL,
        payment_failed_reason = NULL,
        grace_warned_at = NULL,
        downgraded_from = NULL,
        downgraded_at = NULL,
        payfast_token = CASE WHEN ${tokenCleared} THEN NULL ELSE payfast_token END,
        tier_grant_type = 'owner',
        tier_granted_by = ${actor.userId},
        tier_granted_at = NOW(),
        tier_grant_note = 'Owner account: permanent Premium, never billed',
        status = CASE WHEN status = 'verified' THEN status ELSE 'verified' END,
        verified_at = COALESCE(verified_at, NOW()),
        badge_source = COALESCE(badge_source, 'admin_grant'),
        updated_at = NOW()
      WHERE id = ${b.id}
    `;
    result.granted.push({ businessId: String(b.id), companyName: String(b.company_name), email: String(b.email) });
    await logBillingEvent({
      event: 'admin_tier_granted',
      businessId: String(b.id),
      userId: String(b.user_id),
      detail: `${actor.name}: ${String(b.company_name)} set as an owner account — permanent ${OWNER_TIER}, never billed.`,
    });
  }

  // Taken off the list: keep their plan, but as an ordinary comp an admin can remove.
  const released = await db`
    UPDATE businesses b SET tier_grant_type = 'complimentary',
      tier_grant_note = 'Was an owner account; removed from the owner list. Complimentary until an admin changes it.',
      updated_at = NOW()
    FROM users u
    WHERE u.id = b.user_id AND b.tier_grant_type = 'owner'
      AND NOT (LOWER(u.email) = ANY(${emails.length ? emails : ['']}))
    RETURNING b.id, b.company_name
  `;
  result.released = released.map((r) => ({ businessId: String(r.id), companyName: String(r.company_name) }));
  return result;
}

export async function saveOwnerEmails(raw: unknown, actor: OwnerActor): Promise<OwnerSyncResult> {
  const emails = normaliseOwnerEmails(raw);
  const previous = await getOwnerEmails();
  await db`
    INSERT INTO platform_settings (key, value, updated_at, updated_by, updated_by_name)
    VALUES (${SETTINGS_KEY}, ${JSON.stringify({ emails })}::jsonb, NOW(), ${actor.userId}, ${actor.name})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by, updated_by_name = EXCLUDED.updated_by_name
  `;
  await db`
    INSERT INTO platform_settings_history (key, old_value, new_value, changed_by, changed_by_name)
    VALUES (${SETTINGS_KEY}, ${JSON.stringify({ emails: previous })}::jsonb, ${JSON.stringify({ emails })}::jsonb, ${actor.userId}, ${actor.name})
  `.catch(() => undefined);
  return syncOwnerAccounts(actor);
}
