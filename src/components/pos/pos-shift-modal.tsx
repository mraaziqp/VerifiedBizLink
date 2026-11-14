'use client';

import { useState, useMemo } from 'react';
import {
  Banknote, ArrowDownRight, Calculator, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { zar } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

interface OpenShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFloatCents?: number;
  onConfirmOpen: (floatCents: number) => Promise<void>;
}

export function OpenShiftModal({
  open,
  onOpenChange,
  defaultFloatCents = 50000,
  onConfirmOpen,
}: OpenShiftModalProps) {
  const [floatRand, setFloatRand] = useState<string>((defaultFloatCents / 100).toString());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(floatRand || '0') * 100);
    setSubmitting(true);
    try {
      await onConfirmOpen(cents);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Open Shift & Cash Float
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Confirm the opening cash drawer float to begin trading. All sales and change will reconcile against this balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Opening Float Amount (ZAR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold font-mono text-slate-400">R</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={floatRand}
                onChange={(e) => setFloatRand(e.target.value)}
                className="pl-8 font-mono text-base font-bold"
                required
              />
            </div>
            {/* Quick Float Shortcuts */}
            <div className="flex gap-2 pt-1 font-mono text-xs">
              {[200, 500, 1000].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFloatRand(r.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  R{r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              {submitting ? 'Opening Shift...' : 'Confirm & Open Till'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// CASH DROP / PETTY CASH OUT MODAL
// ================================================================

interface CashDropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDrop: (data: { amountCents: number; reason: string; cashierPin?: string }) => Promise<void>;
}

export function CashDropModal({ open, onOpenChange, onConfirmDrop }: CashDropModalProps) {
  const [amountRand, setAmountRand] = useState('');
  const [reason, setReason] = useState('Petty Cash / Store Supplies');
  const [notes, setNotes] = useState('');
  const [cashierPin, setCashierPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amountRand || '0') * 100);
    if (cents <= 0) return;
    setSubmitting(true);
    try {
      await onConfirmDrop({
        amountCents: cents,
        reason: `${reason}${notes ? ` - ${notes}` : ''}`,
        cashierPin,
      });
      onOpenChange(false);
      setAmountRand('');
      setNotes('');
      setCashierPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-orange-600" />
            Log Cash Drop / Petty Cash Out
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Record money removed from the cash drawer during trading (safe drops, milk/packaging, transport) so the end-of-shift cash up balances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount Removed (ZAR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold font-mono text-slate-400">R</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountRand}
                onChange={(e) => setAmountRand(e.target.value)}
                className="pl-8 font-mono text-base font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason Category</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="Safe Drop / Bank Deposit">Safe Drop / Bank Deposit</option>
              <option value="Petty Cash / Store Supplies">Petty Cash / Store Supplies (Milk, Bags)</option>
              <option value="Transport / Courier">Transport / Courier Cost</option>
              <option value="Casual Staff Wage / Payout">Casual Staff Wage / Payout</option>
              <option value="Owner Drawing">Owner Drawing</option>
              <option value="Other Store Expense">Other Store Expense</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Details / Vendor Note</Label>
            <Input
              placeholder="e.g. Spar receipt for 2L milk and coffee filters"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">4-Digit Authorizing PIN</Label>
            <Input
              type="password"
              maxLength={4}
              placeholder="****"
              value={cashierPin}
              onChange={(e) => setCashierPin(e.target.value)}
              className="text-xs font-mono tracking-widest text-center max-w-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !amountRand}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs"
            >
              {submitting ? 'Recording...' : 'Record Cash Removal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// END-OF-SHIFT BLIND CASH UP & Z-REPORT MODAL
// ================================================================

interface BlindCashUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedCashCents: number;
  openingFloatCents: number;
  cashSalesCents: number;
  cashRefundsCents: number;
  cashDropsCents: number;
  todayVatCents: number;
  todayGrossSalesCents: number;
  businessName: string;
  cashierName?: string;
  onConfirmClose: (countedCashCents: number, zReportData: Record<string, unknown>) => Promise<void>;
}

export function BlindCashUpModal({
  open,
  onOpenChange,
  expectedCashCents,
  openingFloatCents,
  cashSalesCents,
  cashRefundsCents,
  cashDropsCents,
  todayVatCents,
  todayGrossSalesCents,
  businessName,
  cashierName,
  onConfirmClose,
}: BlindCashUpModalProps) {
  // South African Rand Denomination State
  const [denoms, setDenoms] = useState<{ [key: string]: number }>({
    r200: 0,
    r100: 0,
    r50: 0,
    r20: 0,
    r10: 0,
    r5: 0,
    r2: 0,
    r1: 0,
    cents50: 0,
  });

  const [useLumpSum, setUseLumpSum] = useState(false);
  const [lumpSumRand, setLumpSumRand] = useState('');
  const [reconciliationComplete, setReconciliationComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Compute total counted from denominations
  const totalCountedCents = useMemo(() => {
    if (useLumpSum) {
      return Math.round(parseFloat(lumpSumRand || '0') * 100);
    }
    return (
      (denoms.r200 || 0) * 20000 +
      (denoms.r100 || 0) * 10000 +
      (denoms.r50 || 0) * 5000 +
      (denoms.r20 || 0) * 2000 +
      (denoms.r10 || 0) * 1000 +
      (denoms.r5 || 0) * 500 +
      (denoms.r2 || 0) * 200 +
      (denoms.r1 || 0) * 100 +
      (denoms.cents50 || 0) * 50
    );
  }, [denoms, useLumpSum, lumpSumRand]);

  const varianceCents = totalCountedCents - expectedCashCents;

  const handleReconcile = () => {
    setReconciliationComplete(true);
  };

  const handleFinalClose = async () => {
    setSubmitting(true);
    try {
      const zReport = {
        zReportNumber: `Z-${Date.now().toString().slice(-6)}`,
        generatedAt: new Date().toISOString(),
        businessName,
        cashierName: cashierName || 'Lead Cashier',
        openingFloatCents,
        cashSalesCents,
        cashRefundsCents,
        cashDropsCents,
        expectedCashCents,
        countedCashCents: totalCountedCents,
        varianceCents,
        todayGrossSalesCents,
        todayVatCents,
      };
      await onConfirmClose(totalCountedCents, zReport);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-500" />
            End-of-Shift Blind Cash Up & Z-Report
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Blind cash count prevents cashier collusion. Enter the physical currency counted in the till drawer without looking at the expected totals first.
          </DialogDescription>
        </DialogHeader>

        {!reconciliationComplete ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                South African Cash Denomination Calculator
              </span>
              <button
                type="button"
                onClick={() => setUseLumpSum(!useLumpSum)}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {useLumpSum ? 'Switch to Denominations' : 'Switch to Lump Sum Entry'}
              </button>
            </div>

            {useLumpSum ? (
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Label className="text-xs font-bold">Total Physical Cash in Drawer (ZAR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold font-mono text-slate-400">R</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={lumpSumRand}
                    onChange={(e) => setLumpSumRand(e.target.value)}
                    className="pl-8 font-mono text-lg font-bold"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'r200', label: 'R 200 Notes', val: 200 },
                  { key: 'r100', label: 'R 100 Notes', val: 100 },
                  { key: 'r50', label: 'R 50 Notes', val: 50 },
                  { key: 'r20', label: 'R 20 Notes', val: 20 },
                  { key: 'r10', label: 'R 10 Notes', val: 10 },
                  { key: 'r5', label: 'R 5 Coins', val: 5 },
                  { key: 'r2', label: 'R 2 Coins', val: 2 },
                  { key: 'r1', label: 'R 1 Coins', val: 1 },
                  { key: 'cents50', label: '50c Coins', val: 0.5 },
                ].map((denom) => (
                  <div key={denom.key} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {denom.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms[denom.key] || ''}
                        onChange={(e) => setDenoms({ ...denoms, [denom.key]: parseInt(e.target.value || '0', 10) })}
                        className="h-8 text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        ={zar((denoms[denom.key] || 0) * denom.val * 100)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Counted Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between font-mono">
              <span className="text-xs text-slate-300">Total Counted Cash:</span>
              <span className="text-xl font-black text-amber-400">{zar(totalCountedCents)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReconcile}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Perform Reconciliation Check
              </Button>
            </div>
          </div>
        ) : (
          /* ================= STEP 2: RECONCILIATION & Z-REPORT ================= */
          <div className="space-y-4 pt-2">
            {/* Reconciliation Overview Box */}
            <div className={cn(
              "p-4 rounded-xl border font-mono space-y-2",
              varianceCents === 0
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                : varianceCents > 0
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
            )}>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Opening Cash Float:</span>
                <span>{zar(openingFloatCents)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>+ Cash Sales Collected:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{zar(cashSalesCents)}</span>
              </div>
              {cashRefundsCents > 0 && (
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>- Cash Refunds Paid Out:</span>
                  <span className="text-rose-600">-{zar(cashRefundsCents)}</span>
                </div>
              )}
              {cashDropsCents > 0 && (
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>- Cash Drops / Store Payouts:</span>
                  <span className="text-orange-600">-{zar(cashDropsCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>Expected Drawer Cash:</span>
                <span>{zar(expectedCashCents)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1">
                <span>Actual Counted Cash:</span>
                <span>{zar(totalCountedCents)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-dashed border-slate-300 dark:border-slate-700">
                <span>Cash Drawer Variance:</span>
                <span className={cn(
                  "font-mono",
                  varianceCents === 0 ? "text-emerald-700 dark:text-emerald-400" : varianceCents > 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-600"
                )}>
                  {varianceCents === 0 ? 'R 0.00 (BALANCED)' : varianceCents > 0 ? `+${zar(varianceCents)} (OVER)` : `-${zar(Math.abs(varianceCents))} (SHORT)`}
                </span>
              </div>
            </div>

            {/* SARS VAT 201 Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
                SARS VAT 201 Tax Output Summary
              </span>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Today&apos;s Gross Sales (Incl. VAT):</span>
                <span>{zar(todayGrossSalesCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Standard 15% Output VAT Collected:</span>
                <span className="font-bold text-amber-600">{zar(todayVatCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sales Value Net of VAT:</span>
                <span>{zar(todayGrossSalesCents - todayVatCents)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReconciliationComplete(false)}
                className="text-xs"
              >
                Back to Count
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => window.print()}
                  variant="outline"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Z-Report
                </Button>
                <Button
                  type="button"
                  onClick={handleFinalClose}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {submitting ? 'Finalizing...' : 'Save & Close Shift'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
