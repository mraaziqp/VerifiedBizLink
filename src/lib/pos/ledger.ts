import type { Sql } from '@/lib/db';
import type { PaymentMethodType } from './payments/types';

/**
 * The merchant's POS ledger: double-entry, one balanced journal per
 * financial event, each event posted at most once.
 *
 * These are the MERCHANT's books. The VerifiedBizLink fee appears here as the
 * merchant's expense and as what the merchant owes the platform
 * (platform_fee_payable). It is never recorded as platform revenue at the
 * moment of sale — the platform has not been paid yet. Platform revenue is
 * whatever has actually been collected, which lives in pos_billing_charges.
 *
 * Accounts:
 *   cash_on_hand          asset   cash in the drawer
 *   card_clearing         asset   card paid on the merchant's own machine
 *   electronic_clearing   asset   card/QR paid through an integrated provider
 *   merchant_bank         asset   money the merchant paid out (fee statements)
 *   sales_revenue         income  gross sales
 *   sales_returns         contra-income  refunds
 *   platform_fee_expense  expense VerifiedBizLink fee
 *   platform_fee_payable  liability  fee owed to VerifiedBizLink, not yet paid
 */
export type LedgerAccount =
  | 'cash_on_hand'
  | 'card_clearing'
  | 'electronic_clearing'
  | 'merchant_bank'
  | 'sales_revenue'
  | 'sales_returns'
  | 'platform_fee_expense'
  | 'platform_fee_payable';

export interface LedgerLine {
  account: LedgerAccount;
  entryType: string;
  debitCents?: number;
  creditCents?: number;
  feeStatus?: 'none' | 'accrued' | 'collected' | 'reversed' | 'waived';
  description: string;
}

export interface JournalInput {
  businessId: string;
  journalKey: string;
  kind: string;
  referenceType: string;
  referenceId: string;
  lines: LedgerLine[];
}

export class UnbalancedJournalError extends Error {
  constructor(key: string, debit: number, credit: number) {
    super(`Journal ${key} is unbalanced: debits ${debit} != credits ${credit}`);
    this.name = 'UnbalancedJournalError';
  }
}

export function assertBalanced(input: JournalInput) {
  let debit = 0;
  let credit = 0;
  for (const l of input.lines) {
    const d = l.debitCents ?? 0;
    const c = l.creditCents ?? 0;
    if (!Number.isInteger(d) || !Number.isInteger(c) || d < 0 || c < 0) {
      throw new Error(`Journal ${input.journalKey} has a non-integer or negative amount`);
    }
    debit += d;
    credit += c;
  }
  if (debit !== credit) throw new UnbalancedJournalError(input.journalKey, debit, credit);
}

/**
 * Posts a journal inside the caller's transaction. Returns false (and writes
 * nothing) if a journal with this key was already posted — so a retried
 * request or a re-delivered webhook can never post twice.
 */
export async function postJournal(tx: Sql, input: JournalInput): Promise<boolean> {
  const lines = input.lines.filter((l) => (l.debitCents ?? 0) > 0 || (l.creditCents ?? 0) > 0);
  const journal = { ...input, lines };
  assertBalanced(journal);
  if (lines.length === 0) return false;

  const [row] = await tx`
    INSERT INTO pos_ledger_journals (business_id, journal_key, kind, reference_type, reference_id)
    VALUES (${input.businessId}, ${input.journalKey}, ${input.kind}, ${input.referenceType}, ${input.referenceId})
    ON CONFLICT (journal_key) DO NOTHING
    RETURNING id
  `;
  if (!row) return false;

  for (const l of lines) {
    const d = l.debitCents ?? 0;
    const c = l.creditCents ?? 0;
    await tx`
      INSERT INTO pos_financial_ledger (
        business_id, journal_id, entry_type, account_name, debit_cents, credit_cents, balance_cents,
        fee_status, reference_type, reference_id, description
      ) VALUES (
        ${input.businessId}, ${row.id}, ${l.entryType}, ${l.account}, ${d}, ${c}, ${d - c},
        ${l.feeStatus ?? 'none'}, ${input.referenceType}, ${input.referenceId}, ${l.description}
      )
    `;
  }
  return true;
}

export function assetAccountFor(method: PaymentMethodType | string): LedgerAccount {
  if (method === 'cash') return 'cash_on_hand';
  if (method === 'card_external') return 'card_clearing';
  return 'electronic_clearing';
}

export function saleJournal(p: {
  businessId: string;
  saleId: string;
  receiptNumber: string;
  method: PaymentMethodType | string;
  totalCents: number;
  feeCents: number;
  feeRateBps: number;
}): JournalInput {
  const asset = assetAccountFor(p.method);
  const pct = (p.feeRateBps / 100).toFixed(2).replace(/\.00$/, '');
  return {
    businessId: p.businessId,
    journalKey: `sale:${p.saleId}`,
    kind: 'sale',
    referenceType: 'sale',
    referenceId: p.saleId,
    lines: [
      { account: asset, entryType: 'payment_received', debitCents: p.totalCents, description: `Payment received (${p.method}) for receipt ${p.receiptNumber}` },
      { account: 'sales_revenue', entryType: 'sale_proceeds', creditCents: p.totalCents, description: `Gross sale, receipt ${p.receiptNumber}` },
      { account: 'platform_fee_expense', entryType: 'fee_accrued', debitCents: p.feeCents, feeStatus: 'accrued', description: `VerifiedBizLink fee (${pct}%) on receipt ${p.receiptNumber}` },
      { account: 'platform_fee_payable', entryType: 'fee_accrued', creditCents: p.feeCents, feeStatus: 'accrued', description: `VerifiedBizLink fee owed for receipt ${p.receiptNumber} (accrued, not yet paid)` },
    ],
  };
}

export function refundJournal(p: {
  businessId: string;
  refundId: string;
  saleId: string;
  receiptNumber: string;
  method: PaymentMethodType | string;
  amountCents: number;
  feeReversalCents: number;
}): JournalInput {
  const asset = assetAccountFor(p.method);
  return {
    businessId: p.businessId,
    journalKey: `refund:${p.refundId}`,
    kind: 'refund',
    referenceType: 'refund',
    referenceId: p.refundId,
    lines: [
      { account: 'sales_returns', entryType: 'refund_deduction', debitCents: p.amountCents, description: `Refund on receipt ${p.receiptNumber}` },
      { account: asset, entryType: 'refund_payout', creditCents: p.amountCents, description: `Refund paid back (${p.method}) on receipt ${p.receiptNumber}` },
      { account: 'platform_fee_payable', entryType: 'fee_reversal', debitCents: p.feeReversalCents, feeStatus: 'reversed', description: `VerifiedBizLink fee reversed for refund on receipt ${p.receiptNumber}` },
      { account: 'platform_fee_expense', entryType: 'fee_reversal', creditCents: p.feeReversalCents, feeStatus: 'reversed', description: `Fee expense reversed for refund on receipt ${p.receiptNumber}` },
    ],
  };
}

export function feePaymentJournal(p: { businessId: string; statementId: string; statementNumber: string; amountCents: number }): JournalInput {
  return {
    businessId: p.businessId,
    journalKey: `fee_payment:${p.statementId}`,
    kind: 'fee_payment',
    referenceType: 'fee_statement',
    referenceId: p.statementId,
    lines: [
      { account: 'platform_fee_payable', entryType: 'fee_payment', debitCents: p.amountCents, feeStatus: 'collected', description: `Paid VerifiedBizLink fee statement ${p.statementNumber}` },
      { account: 'merchant_bank', entryType: 'fee_payment', creditCents: p.amountCents, feeStatus: 'collected', description: `Payment for fee statement ${p.statementNumber}` },
    ],
  };
}

export function feeWaiverJournal(p: { businessId: string; statementId: string; statementNumber: string; amountCents: number }): JournalInput {
  return {
    businessId: p.businessId,
    journalKey: `fee_waiver:${p.statementId}`,
    kind: 'fee_waiver',
    referenceType: 'fee_statement',
    referenceId: p.statementId,
    lines: [
      { account: 'platform_fee_payable', entryType: 'fee_waiver', debitCents: p.amountCents, feeStatus: 'waived', description: `VerifiedBizLink waived fee statement ${p.statementNumber}` },
      { account: 'platform_fee_expense', entryType: 'fee_waiver', creditCents: p.amountCents, feeStatus: 'waived', description: `Fee expense reversed: statement ${p.statementNumber} waived` },
    ],
  };
}
