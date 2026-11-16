import db, { type DbRow } from '@/lib/db';

/**
 * Removing test charges.
 *
 * A charge made while testing (or an abandoned test checkout) should not sit
 * in a customer's Transaction History or count as revenue. It is not deleted:
 * the row is marked void, with who did it and why, so the payment ledger and
 * PayFast reconciliation still line up. Voided rows are hidden from the
 * customer and left out of every revenue total.
 */

let ready: Promise<void> | null = null;

export function ensurePaymentVoidColumns(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ`;
      await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS void_reason TEXT`;
      await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_by_name TEXT`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export class PaymentVoidError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function voidTestPayment(input: { paymentId: string; reason: string; actor: { userId: string | null; name: string } }): Promise<DbRow> {
  if (!/^[0-9a-f-]{36}$/i.test(input.paymentId)) throw new PaymentVoidError('Invalid payment.');
  const reason = (input.reason || '').trim().slice(0, 300);
  if (reason.length < 3) throw new PaymentVoidError('Give a short reason, e.g. "test charge".');
  await ensurePaymentVoidColumns();

  const [row] = await db`
    UPDATE payments
    SET voided_at = NOW(), void_reason = ${reason}, voided_by_name = ${input.actor.name}
    WHERE id = ${input.paymentId} AND voided_at IS NULL
    RETURNING id, user_id, amount, status, reference, description
  `;
  if (!row) throw new PaymentVoidError('Payment not found, or already removed.', 404);

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
    VALUES (${input.actor.userId}, ${input.actor.name},
            ${`Removed test charge R${(Number(row.amount) / 100).toFixed(2)} (${String(row.status)}): ${reason}`.slice(0, 250)},
            'payment', ${String(row.id)}, ${String(row.reference ?? row.description ?? '')})
  `.catch(() => undefined);
  return row;
}
