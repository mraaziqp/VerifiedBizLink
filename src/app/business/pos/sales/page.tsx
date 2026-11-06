'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Receipt, Printer, MessageSquare,
  Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SaleRecord {
  id: string;
  receipt_number: string;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  platform_fee_cents: number;
  payment_method: string;
  payment_status: 'completed' | 'refunded' | 'cancelled';
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
}

export default function PosSalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Receipt Modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [receiptItems, setReceiptItems] = useState<Array<{ name: string; quantity: number; unit_price_cents: number }>>([]);
  const [receiptModal, setReceiptModal] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Refund Modal
  const [refundTarget, setRefundTarget] = useState<SaleRecord | null>(null);
  const [refundReason, setRefundReason] = useState('Customer returned goods');
  const [restockItems, setRestockItems] = useState(true);
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/sales?limit=100');
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch {
      toast({ title: 'Could not load sales', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filtered = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.receipt_number.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.cashier_name?.toLowerCase().includes(q)
    );
  });

  const handleOpenReceipt = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    setLoadingReceipt(true);
    setReceiptModal(true);
    try {
      const res = await fetch(`/api/pos/sales?id=${sale.id}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptItems(
          data.items.map((it: { product_name: string; quantity: number; unit_price_cents: number }) => ({
            name: it.product_name,
            quantity: Number(it.quantity),
            unit_price_cents: Number(it.unit_price_cents),
          }))
        );
      }
    } catch {
      toast({ title: 'Error loading receipt items', variant: 'destructive' });
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleExecuteRefund = async () => {
    if (!refundTarget) return;
    setProcessingRefund(true);
    try {
      const res = await fetch(`/api/pos/sales/${refundTarget.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restockItems,
          reason: refundReason,
        }),
      });

      if (res.ok) {
        toast({ title: 'Sale refunded successfully', description: 'Transaction updated and logged to financial ledger.' });
        setRefundTarget(null);
        loadSales();
      } else {
        const data = await res.json();
        toast({ title: 'Refund failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setProcessingRefund(false);
    }
  };

  const getWhatsAppReceiptUrl = () => {
    if (!selectedSale) return '#';
    const itemsText = receiptItems
      .map((it) => `• ${it.quantity}x ${it.name} - R${((it.quantity * it.unit_price_cents) / 100).toFixed(2)}`)
      .join('%0A');
    const msg = `*VerifiedBizLink Digital Receipt*%0AReceipt: ${selectedSale.receipt_number}%0ADate: ${new Date(selectedSale.created_at).toLocaleString('en-ZA')}%0A%0A*Items:*%0A${itemsText}%0A%0A*Total:* R${(selectedSale.total_cents / 100).toFixed(2)}%0A*Payment:* ${selectedSale.payment_method.toUpperCase()}%0A%0A_Verified business on VerifiedBizLink.co.za_`;
    return `https://wa.me/?text=${msg}`;
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/business/pos">
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Sales History & Receipts</h1>
              <p className="text-xs text-slate-500">View transactions, reprint customer receipts, and process refunds.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs">
              <Link href="/business/pos/terminal">
                Open Till <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <Search className="absolute left-6 top-5.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt number, customer, or cashier..."
            className="pl-10 h-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Sales Table */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900">No sales transactions found</p>
              <p className="text-xs text-slate-400 mt-1">
                Completed sales will appear here with instant digital receipt re-prints.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">Receipt #</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Cashier</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const isRefunded = s.payment_status === 'refunded';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {s.receipt_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(s.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <span className="capitalize">{s.payment_method.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {s.cashier_name || 'Owner / Till'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                          R{(s.total_cents / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black',
                              isRefunded ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            {isRefunded ? 'Refunded' : 'Completed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReceipt(s)}
                            className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 h-8"
                          >
                            Receipt
                          </Button>
                          {!isRefunded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRefundTarget(s);
                                setRefundReason('Customer returned goods');
                                setRestockItems(true);
                              }}
                              className="rounded-xl text-xs font-bold h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================= RECEIPT REPRINT MODAL ======================= */}
        <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
          <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg font-black text-slate-900">Digital Receipt</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Receipt #{selectedSale?.receipt_number}
              </DialogDescription>
            </DialogHeader>

            {loadingReceipt ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="my-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 space-y-2">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <p className="font-bold text-sm">VerifiedBizLink Merchant</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedSale ? new Date(selectedSale.created_at).toLocaleString('en-ZA') : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">Receipt: {selectedSale?.receipt_number}</p>
                </div>

                <div className="space-y-1 py-1 max-h-40 overflow-y-auto">
                  {receiptItems.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2">
                        {it.quantity}x {it.name}
                      </span>
                      <span>R{((it.quantity * it.unit_price_cents) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL PAID</span>
                    <span>R{((selectedSale?.total_cents ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Method</span>
                    <span className="uppercase">{selectedSale?.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Status</span>
                    <span className="font-bold">{selectedSale?.payment_status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 font-bold text-xs">
                <a href={getWhatsAppReceiptUrl()} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-4 w-4 mr-1 text-emerald-600" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold text-xs">
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ======================= REFUND CONFIRMATION MODAL ======================= */}
        <Dialog open={Boolean(refundTarget)} onOpenChange={() => setRefundTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-rose-700">
                Process Refund: Receipt #{refundTarget?.receipt_number}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Amount to refund: R{refundTarget ? (refundTarget.total_cents / 100).toFixed(2) : '0.00'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">Reason for Refund</label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Defective item, customer return"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 border rounded-xl p-3 bg-slate-50 border-slate-200">
                <input
                  type="checkbox"
                  id="restock"
                  checked={restockItems}
                  onChange={(e) => setRestockItems(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 h-4 w-4"
                />
                <label htmlFor="restock" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Automatically return and restock items into inventory
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRefundTarget(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteRefund}
                  disabled={processingRefund}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 font-extrabold text-white text-xs shadow-xs"
                >
                  {processingRefund ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Refund'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </GlassBackground>
  );
}
