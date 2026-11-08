import { GRACE_PERIOD_HOURS } from '@/lib/billing';

/**
 * Subscription status values stored in pos_merchant_subscriptions.status:
 *
 *   inactive   never activated (or activation never paid)
 *   trial      free trial, only if the plan offers one (trial_days > 0)
 *   active     paid and current
 *   grace      a renewal or fee statement failed; full access for the
 *              grace window (GRACE_PERIOD_HOURS, shared with tier billing)
 *   suspended  grace ran out, or an admin suspended the account
 *   cancelled  the merchant cancelled and the paid term has ended
 *
 * Whatever the status, a merchant's data is never deleted: outside 'full'
 * access the till is read-only and every history and export still works.
 */
export type PosSubscriptionStatus = 'inactive' | 'trial' | 'active' | 'grace' | 'suspended' | 'cancelled';

export interface PosAccessState {
  mode: 'full' | 'read_only';
  status: PosSubscriptionStatus | 'none';
  /** Shown as a banner on every POS screen. */
  message: string;
  graceEndsAt?: string | null;
}

type SubRow = {
  status?: string | null;
  trial_ends_at?: string | Date | null;
  renews_at?: string | Date | null;
  payment_failed_at?: string | Date | null;
  cancel_at_period_end?: boolean | null;
  suspended_reason?: string | null;
} | null;

const t = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : NaN);

export function posAccessState(sub: SubRow, now: Date = new Date()): PosAccessState {
  if (!sub) {
    return { mode: 'read_only', status: 'none', message: 'Activate VerifiedBizLink POS to start selling.' };
  }
  const nowMs = now.getTime();
  const status = (sub.status || 'inactive') as PosSubscriptionStatus;

  switch (status) {
    case 'active': {
      if (sub.cancel_at_period_end && t(sub.renews_at) <= nowMs) {
        return { mode: 'read_only', status: 'cancelled', message: 'Your POS subscription has ended. Reactivate to keep selling — all your records are still here.' };
      }
      return { mode: 'full', status, message: sub.cancel_at_period_end ? 'Your subscription is set to end at the close of this billing period.' : '' };
    }
    case 'trial': {
      if (t(sub.trial_ends_at) > nowMs) return { mode: 'full', status, message: 'You are on a free trial.' };
      return { mode: 'read_only', status, message: 'Your free trial has ended. Activate POS to keep selling — your records are safe.' };
    }
    case 'grace': {
      const ends = t(sub.payment_failed_at) + GRACE_PERIOD_HOURS * 3600_000;
      if (ends > nowMs) {
        return {
          mode: 'full',
          status,
          graceEndsAt: new Date(ends).toISOString(),
          message: `A payment did not go through. Pay before ${new Date(ends).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} to keep your till open.`,
        };
      }
      return { mode: 'read_only', status: 'suspended', message: 'Your till is read-only because a payment is overdue. Pay now to reopen it — nothing has been deleted.' };
    }
    case 'suspended':
      return {
        mode: 'read_only',
        status,
        message: sub.suspended_reason === 'admin'
          ? 'Your POS account has been suspended by VerifiedBizLink. Contact support.'
          : 'Your till is read-only because a payment is overdue. Pay now to reopen it — nothing has been deleted.',
      };
    case 'cancelled':
      return { mode: 'read_only', status, message: 'Your POS subscription is cancelled. Reactivate any time — all your records are still here.' };
    case 'inactive':
    default:
      return { mode: 'read_only', status: 'inactive', message: 'Activate VerifiedBizLink POS to start selling.' };
  }
}
