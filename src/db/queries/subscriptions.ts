import { and, lt, or, eq } from 'drizzle-orm';
import { db } from '../index';
import { subscriptions, users } from '../schema';

export interface OverdueSubscription {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  status: string;
  nextBillingDate: Date | null;
  stripeSubscriptionId: string | null;
  paypalSubscriptionId: string | null;
  daysOverdue: number;
}

/**
 * Scans user_subscriptions table for active/unprocessed users whose next_billing_date
 * has passed, preparing for a secure CRON job retry ping or automated recovery flow.
 */
export async function scanOverdueSubscriptions(referenceDate = new Date()): Promise<OverdueSubscription[]> {
  try {
    const overdueRows = await db
      .select({
        subscriptionId: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        nextBillingDate: subscriptions.nextBillingDate,
        // No stripe/paypal id columns exist on the live table (billing is
        // PayFast); selecting them made this scan fail and return nothing.
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          // Billing date has passed
          lt(subscriptions.nextBillingDate, referenceDate),
          // Status is active, unpaid, or unprocessed
          or(
            eq(subscriptions.status, 'active'),
            eq(subscriptions.status, 'unpaid'),
            eq(subscriptions.status, 'unprocessed'),
            eq(subscriptions.status, 'past_due')
          )
        )
      );

    return overdueRows.map((row) => {
      const billingDate = row.nextBillingDate ? new Date(row.nextBillingDate) : null;
      const daysOverdue = billingDate
        ? Math.max(0, Math.floor((referenceDate.getTime() - billingDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        subscriptionId: row.subscriptionId,
        userId: row.userId,
        userEmail: row.userEmail,
        userName: row.userName,
        status: row.status,
        nextBillingDate: billingDate,
        stripeSubscriptionId: null,
        paypalSubscriptionId: null,
        daysOverdue,
      };
    });
  } catch (error) {
    // Thrown, not swallowed: an empty list would read as "nobody is overdue".
    console.error('scanOverdueSubscriptions error:', error);
    throw error;
  }
}
