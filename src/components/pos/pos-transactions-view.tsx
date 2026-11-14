'use client';

import { useState } from 'react';
import {
  Search, Printer, MessageSquare, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { zar } from '@/lib/pos/client';
import { cn } from '@/lib/utils';
import type { OverviewTransaction } from './pos-overview-workspace';

interface PosTransactionsViewProps {
  transactions: OverviewTransaction[];
  onPrintReceipt: (tx: OverviewTransaction) => void;
  onWhatsAppReceipt: (tx: OverviewTransaction) => void;
  onRefundTransaction: (tx: OverviewTransaction, reason: string, restock: boolean) => Promise<void>;
}

export function PosTransactionsView({
  transactions,
  onPrintReceipt,
  onWhatsAppReceipt,
  onRefundTransaction,
}: PosTransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<OverviewTransaction | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer changed mind');
  const [restockItems, setRestockItems] = useState(true);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const filtered = transactions.filter((tx) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      tx.receiptNumber.toLowerCase().includes(q) ||
      (tx.cashierName && tx.cashierName.toLowerCase().includes(q)) ||
      tx.paymentMethod.toLowerCase().includes(q)
    );
  });

  const handleOpenRefund = (tx: OverviewTransaction) => {
    setSelectedTx(tx);
    setRefundReason('Customer return / dissatisfaction');
    setRestockItems(true);
    setRefundModalOpen(true);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setSubmittingRefund(true);
    try {
      await onRefundTransaction(selectedTx, refundReason, restockItems);
      setRefundModalOpen(false);
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by receipt # or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>{filtered.length} total receipts recorded</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3.5">Receipt #</th>
                <th className="py-2.5 px-3">Date &amp; Time</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-2 text-center">Items</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">15% VAT</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Receipt Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isRefunded = tx.status === 'refunded';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{tx.timeStr}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">
                        {tx.cashierName || 'Cashier'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400">
                        {tx.itemsCount}
                      </td>
                      <td className="py-2.5 px-3 font-sans capitalize text-slate-700 dark:text-slate-300">
                        {tx.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{zar(tx.vatCents)}</td>
                      <td className={cn(
                        "py-2.5 px-3 text-right font-black",
                        isRefunded ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"
                      )}>
                        {zar(tx.totalCents)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            isRefunded
                              ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-400"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400"
                          )}
                        >
                          {isRefunded ? 'Refunded' : 'Completed'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            title="Print 80mm Receipt"
                            onClick={() => onPrintReceipt(tx)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="WhatsApp Receipt"
                            onClick={() => onWhatsAppReceipt(tx)}
                            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          {!isRefunded && (
                            <button
                              title="Void / Refund Sale"
                              onClick={() => handleOpenRefund(tx)}
                              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= REFUND MODAL ================= */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-rose-600" />
              Process Refund: #{selectedTx?.receiptNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Refunding reverses gross revenue and platform fees in the double-entry financial ledger. Original total: <strong className="font-mono text-slate-900 dark:text-white">{selectedTx ? zar(selectedTx.totalCents) : ''}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRefund} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Reason for Refund</Label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              >
                <option value="Customer return / dissatisfaction">Customer return / dissatisfaction</option>
                <option value="Wrong item rung up by cashier">Wrong item rung up by cashier</option>
                <option value="Defective / expired goods">Defective / expired goods</option>
                <option value="Transaction void / duplicate tender">Transaction void / duplicate tender</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Restock items back into inventory?</p>
                <p className="text-[11px] text-slate-500">Increments inventory quantities and logs audit entry</p>
              </div>
              <input
                type="checkbox"
                checked={restockItems}
                onChange={(e) => setRestockItems(e.target.checked)}
                className="h-4 w-4 rounded text-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setRefundModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingRefund}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                {submittingRefund ? 'Processing Refund...' : 'Confirm Full Refund'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
