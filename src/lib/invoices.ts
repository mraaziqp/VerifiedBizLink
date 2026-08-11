import crypto from 'crypto';
import db from '@/lib/db';
import {
  invoiceNumber, nextBillingDate, subscriptionTerms, formatRand, formatDate,
} from '@/lib/billing';
import { sendInvoiceEmail } from '@/lib/email';

export interface IssueInvoiceInput {
  userId: string;
  businessId?: string | null;
  tierKey: string;
  tierName: string;
  description: string;
  amountCents: number;
  /** What the NEXT charge will be. Differs from amountCents on promos. */
  renewalPriceCents?: number;
  intervalMonths?: number;
  intervalLabel?: string;
  paymentReference?: string | null;
  periodStart?: Date;
  baseUrl?: string;
}

/**
 * Records an invoice and emails it.
 *
 * The row is written first and `emailed_at` stamped only after the send
 * succeeds — so a mail outage costs the customer an email, never the record.
 * Receipts are one of the three email types the platform is allowed to send
 * (verification, receipts, welcome); everything else goes to in-app
 * notifications to stay inside the 100k/month ceiling.
 */
export async function issueInvoice(input: IssueInvoiceInput): Promise<string | null> {
  const {
    userId, businessId = null, tierKey, tierName, description, amountCents,
    renewalPriceCents = amountCents, intervalMonths = 1,
    intervalLabel = intervalMonths === 1 ? 'Monthly' : `${intervalMonths} months`,
    paymentReference = null, baseUrl,
  } = input;

  const now = new Date();
  const periodStart = input.periodStart ?? now;
  const periodEnd = nextBillingDate(periodStart, intervalMonths);
  const number = invoiceNumber(now, crypto.randomBytes(4).toString('hex'));

  let invoiceId: string | null = null;
  try {
    const rows = (await db`
      INSERT INTO invoices (
        invoice_number, user_id, business_id, tier_key, tier_name, description,
        amount_cents, interval_months, period_start, period_end, next_billing_at,
        renewal_price_cents, status, payment_reference
      ) VALUES (
        ${number}, ${userId}, ${businessId}, ${tierKey}, ${tierName}, ${description},
        ${amountCents}, ${intervalMonths}, ${periodStart.toISOString()},
        ${periodEnd.toISOString()}, ${periodEnd.toISOString()},
        ${renewalPriceCents}, 'paid', ${paymentReference}
      )
      RETURNING id
    `) as unknown as { id: string }[];
    invoiceId = rows[0]?.id ?? null;
  } catch (error) {
    console.error('Failed to record invoice for user', userId, error);
    return null;
  }

  // Email is best-effort and must never roll back a recorded payment.
  try {
    const users = (await db`
      SELECT email, full_name FROM users WHERE id = ${userId} LIMIT 1
    `) as unknown as { email: string; full_name: string }[];
    const user = users[0];
    if (!user?.email) return invoiceId;

    await sendInvoiceEmail(user.email, {
      userFirstName: String(user.full_name || '').split(' ')[0],
      invoiceNumber: number,
      tierName,
      description,
      amount: formatRand(amountCents),
      purchasedOn: formatDate(now),
      renewalPrice: formatRand(renewalPriceCents),
      nextBillingAt: formatDate(periodEnd),
      intervalLabel,
      terms: subscriptionTerms(renewalPriceCents, periodEnd),
      appUrl: baseUrl,
    });
    await db`UPDATE invoices SET emailed_at = NOW() WHERE id = ${invoiceId}`;
  } catch (error) {
    console.error('Invoice recorded but email failed for', invoiceId, error);
  }

  return invoiceId;
}
