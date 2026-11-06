'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3,
  CreditCard, Banknote, QrCode, BookOpen, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PosReportsPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<'daily' | 'ledger'>('daily');
  const [loading, setLoading] = useState(true);

  const [dailyData, setDailyData] = useState<{
    summary?: {
      total_transactions: number;
      gross_revenue_cents: number;
      platform_fees_cents: number;
      net_revenue_cents: number;
      average_ticket_cents: number;
      cash_total_cents: number;
      card_tap_total_cents: number;
      qr_total_cents: number;
      cash_transactions: number;
      card_tap_transactions: number;
      qr_transactions: number;
    };
    topProducts?: Array<{ product_name: string; total_quantity: number; total_sales_cents: number }>;
  } | null>(null);

  const [ledgerEntries, setLedgerEntries] = useState<Array<{
    id: string;
    entry_type: string;
    debit_cents: number;
    credit_cents: number;
    balance_cents: number;
    description: string;
    created_at: string;
  }>>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const res = await fetch(`/api/pos/reports?type=daily&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setDailyData(data);
        }
      } else {
        const res = await fetch('/api/pos/reports?type=ledger');
        if (res.ok) {
          const data = await res.json();
          setLedgerEntries(data.ledger || []);
        }
      }
    } catch {
      toast({ title: 'Error loading report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const s = dailyData?.summary;
  const grossRand = s ? (Number(s.gross_revenue_cents) / 100).toFixed(2) : '0.00';
  const netRand = s ? (Number(s.net_revenue_cents) / 100).toFixed(2) : '0.00';
  const feeRand = s ? (Number(s.platform_fees_cents) / 100).toFixed(2) : '0.00';
  const avgRand = s ? (Number(s.average_ticket_cents) / 100).toFixed(2) : '0.00';

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
              <h1 className="text-2xl font-black text-slate-900">Reports & Financial Ledger</h1>
              <p className="text-xs text-slate-500">Track daily sales, 1% platform fee transparency, and audit ledgers.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-xl border-slate-300 bg-white text-xs font-bold w-40"
            />
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
              activeTab === 'daily'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <BarChart3 className="h-4 w-4" /> Daily Sales Performance
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
              activeTab === 'ledger'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <BookOpen className="h-4 w-4" /> Double-Entry Audit Ledger
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : activeTab === 'daily' ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales</p>
                <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">R{grossRand}</p>
                <p className="mt-1 text-xs text-slate-400">{s?.total_transactions ?? 0} transactions</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Proceeds</p>
                <p className="mt-2 text-2xl font-black text-emerald-600 sm:text-3xl">R{netRand}</p>
                <p className="mt-1 text-xs text-slate-400">After platform fee</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Fee (1%)</p>
                <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">R{feeRand}</p>
                <p className="mt-1 text-xs text-slate-400">Transparent VerifiedBizLink fee</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Ticket</p>
                <p className="mt-2 text-2xl font-black text-amber-600 sm:text-3xl">R{avgRand}</p>
                <p className="mt-1 text-xs text-slate-400">Per transaction</p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Tap to Pay (Card)</p>
                  <p className="text-lg font-black text-slate-900">
                    R{s ? (Number(s.card_tap_total_cents) / 100).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-[11px] text-slate-400">{s?.card_tap_transactions ?? 0} transactions</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Cash Payments</p>
                  <p className="text-lg font-black text-slate-900">
                    R{s ? (Number(s.cash_total_cents) / 100).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-[11px] text-slate-400">{s?.cash_transactions ?? 0} transactions</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">QR / Online Links</p>
                  <p className="text-lg font-black text-slate-900">
                    R{s ? (Number(s.qr_total_cents) / 100).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-[11px] text-slate-400">{s?.qr_transactions ?? 0} transactions</p>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900">Top Selling Items</h3>
              {!dailyData?.topProducts || dailyData.topProducts.length === 0 ? (
                <p className="text-xs text-slate-400">No items sold on this date.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dailyData.topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{p.product_name}</p>
                        <p className="text-[11px] text-slate-400">{p.total_quantity} sold</p>
                      </div>
                      <span className="font-black text-slate-900 text-sm">
                        R{(Number(p.total_sales_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Ledger Table */
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900">Immutable Financial Audit Ledger</h3>
            </div>
            {ledgerEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No ledger entries recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Debit</th>
                      <th className="py-3 px-4 text-right">Credit</th>
                      <th className="py-3 px-4 text-right">Settled Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {ledgerEntries.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(l.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4 font-bold uppercase text-[10px] text-slate-700">
                          {l.entry_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-900">{l.description}</td>
                        <td className="py-3 px-4 text-right text-rose-600 font-bold">
                          {l.debit_cents > 0 ? `R${(l.debit_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                          {l.credit_cents > 0 ? `R${(l.credit_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          R{(l.balance_cents / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
