'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminBackground } from '@/components/admin/ui';
import { useToast } from '@/hooks/use-toast';

export default function AdminPosPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics?: {
      total_active_merchants: number;
      total_sales_count: number;
      gross_volume_cents: number;
      platform_fees_accrued_cents: number;
      open_tills_count: number;
      paid_subscriptions_count: number;
    };
    recentTransactions?: Array<{
      id: string;
      company_name: string;
      receipt_number: string;
      total_cents: number;
      platform_fee_cents: number;
      payment_method: string;
      created_at: string;
    }>;
    topMerchants?: Array<{
      business_id: string;
      company_name: string;
      sales_count: number;
      total_volume_cents: number;
      platform_fees_cents: number;
    }>;
  } | null>(null);

  // Fee override modal
  const [selectedMerchant, setSelectedMerchant] = useState<{ business_id: string; company_name: string } | null>(null);
  const [customFeeInput, setCustomFeeInput] = useState('');
  const [merchantStatus, setMerchantStatus] = useState<'active' | 'past_due' | 'cancelled'>('active');
  const [savingMerchant, setSavingMerchant] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pos');
      if (res.ok) {
        const metricsData = await res.json();
        setData(metricsData);
      }
    } catch {
      toast({ title: 'Could not load admin POS data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateMerchant = async () => {
    if (!selectedMerchant) return;
    setSavingMerchant(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_merchant_pos',
          businessId: selectedMerchant.business_id,
          status: merchantStatus,
          customFeePercent: customFeeInput ? parseFloat(customFeeInput) : undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'Merchant POS configuration updated' });
        setSelectedMerchant(null);
        loadData();
      } else {
        toast({ title: 'Failed to update merchant', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingMerchant(false);
    }
  };

  const m = data?.metrics;
  const grossRand = m ? (Number(m.gross_volume_cents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00';
  const feesRand = m ? (Number(m.platform_fees_accrued_cents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00';

  return (
    <AdminBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/admin/dashboard">
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">POS Platform Oversight</h1>
                <span className="rounded-full bg-amber-400/20 border border-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-900">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitor system-wide POS merchants, transaction volumes, 1% fee collection, and merchant subscriptions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="outline" size="sm" className="rounded-xl text-xs font-bold">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh Live Metrics
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Transaction Volume</p>
                <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">R{grossRand}</p>
                <p className="mt-1 text-xs text-slate-400">{m?.total_sales_count ?? 0} total sales completed</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Fees Accrued (1%)</p>
                <p className="mt-2 text-2xl font-black text-amber-600 sm:text-3xl">R{feesRand}</p>
                <p className="mt-1 text-xs text-slate-400">VerifiedBizLink platform revenue</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active POS Merchants</p>
                <p className="mt-2 text-2xl font-black text-emerald-600 sm:text-3xl">
                  {m?.total_active_merchants ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-400">{m?.paid_subscriptions_count ?? 0} on active subscriptions</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Tills Right Now</p>
                <p className="mt-2 text-2xl font-black text-blue-600 sm:text-3xl">
                  {m?.open_tills_count ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-400">Live cashier sessions</p>
              </div>
            </div>

            {/* Top POS Merchants Table */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900">Top Performing POS Merchants</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-extrabold">
                    <tr>
                      <th className="py-3 px-4">Business Name</th>
                      <th className="py-3 px-4 text-center">Transactions</th>
                      <th className="py-3 px-4 text-right">Gross Volume</th>
                      <th className="py-3 px-4 text-right">Platform Fee (1%)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!data?.topMerchants || data.topMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No merchant transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      data.topMerchants.map((b) => (
                        <tr key={b.business_id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{b.company_name}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">{b.sales_count}</td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            R{(Number(b.total_volume_cents) / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-600">
                            R{(Number(b.platform_fees_cents) / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMerchant(b);
                                setCustomFeeInput('');
                                setMerchantStatus('active');
                              }}
                              className="rounded-xl border-slate-200 text-xs font-bold h-8"
                            >
                              Configure / Override
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Transactions Stream */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900">Recent Platform POS Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-extrabold">
                    <tr>
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Merchant</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Fee (1%)</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No recent transactions.
                        </td>
                      </tr>
                    ) : (
                      data.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{tx.receipt_number}</td>
                          <td className="py-3 px-4 font-sans font-bold text-slate-800">{tx.company_name}</td>
                          <td className="py-3 px-4 uppercase text-[10px] text-slate-600">{tx.payment_method}</td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            R{(tx.total_cents / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-amber-600">
                            R{(tx.platform_fee_cents / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-sans text-[11px]">
                            {new Date(tx.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================= MERCHANT OVERRIDE MODAL ======================= */}
        <Dialog open={Boolean(selectedMerchant)} onOpenChange={() => setSelectedMerchant(null)}>
          <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Configure POS: {selectedMerchant?.company_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Adjust merchant specific fee overrides or suspend POS access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">Custom Transaction Fee (%) (Leave blank for plan default 1%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={customFeeInput}
                  onChange={(e) => setCustomFeeInput(e.target.value)}
                  placeholder="e.g. 0.8"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">POS Access Status</label>
                <select
                  value={merchantStatus}
                  onChange={(e) => setMerchantStatus(e.target.value as typeof merchantStatus)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                >
                  <option value="active">Active (Full access to Tills & SoftPOS)</option>
                  <option value="past_due">Past Due (Subscription grace period)</option>
                  <option value="cancelled">Suspended / Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedMerchant(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateMerchant}
                  disabled={savingMerchant}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
                >
                  {savingMerchant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminBackground>
  );
}
