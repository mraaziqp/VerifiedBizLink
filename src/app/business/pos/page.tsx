'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard, ShoppingCart, Package, Truck, Receipt, BarChart3,
  Users, ShieldCheck, ArrowRight, Loader2,
  Wifi, WifiOff, Store, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { offlineStore } from '@/lib/pos/offline-store';

export default function BusinessPosHubPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    settings?: Record<string, unknown>;
    tills?: Array<{ id: string; till_number: number; name: string; status: string }>;
    daily?: {
      summary?: {
        total_transactions: number;
        gross_revenue_cents: number;
        platform_fees_cents: number;
        net_revenue_cents: number;
      };
    };
    subscription?: {
      plan_name: string;
      status: string;
      monthly_price_rand: number;
    };
  } | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, tillsRes, reportsRes, subRes] = await Promise.all([
        fetch('/api/pos/settings').catch(() => null),
        fetch('/api/pos/tills').catch(() => null),
        fetch('/api/pos/reports?type=daily').catch(() => null),
        fetch('/api/pos/subscription').catch(() => null),
      ]);

      const settings = settingsRes?.ok ? (await settingsRes.json()).settings : null;
      const tills = tillsRes?.ok ? (await tillsRes.json()).tills : [];
      const daily = reportsRes?.ok ? await reportsRes.json() : null;
      const sub = subRes?.ok ? (await subRes.json()).subscription : null;

      setData({
        settings,
        tills,
        daily,
        subscription: sub,
      });
    } catch {
      /* offline fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    const res = await offlineStore.syncPendingSales();
    setPendingSyncCount(offlineStore.getQueuedSales().length);
    setSyncing(false);

    if (res.synced > 0) {
      toast({
        title: `Synced ${res.synced} offline transaction${res.synced === 1 ? '' : 's'}`,
        description: 'Your sales ledger and inventory have been updated.',
      });
      loadData();
    }
  }, [loadData, toast]);

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);
    setPendingSyncCount(offlineStore.getQueuedSales().length);

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, handleSync]);

  if (loading && !data) {
    return (
      <GlassBackground>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </GlassBackground>
    );
  }

  const grossRand = data?.daily?.summary?.gross_revenue_cents
    ? (Number(data.daily.summary.gross_revenue_cents) / 100).toFixed(2)
    : '0.00';
  const totalSalesCount = data?.daily?.summary?.total_transactions ?? 0;

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Header Banner */}
        <header className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-lg sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                  <Store className="h-3.5 w-3.5 text-amber-400" /> Mobile POS Ecosystem
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SoftPOS & Tap to Pay Enabled
                </span>
              </div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">Point of Sale Hub</h1>
              <p className="max-w-xl text-xs text-slate-300 sm:text-sm">
                Complete digital till, contactless card tap, inventory audit, and multi-platform sales management for your business.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
              <Button asChild size="lg" className="rounded-2xl bg-amber-400 px-6 py-6 font-black text-slate-950 hover:bg-amber-300 shadow-md active:scale-95 transition-all">
                <Link href="/business/pos/terminal" className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-5 w-5" /> Open Till & Checkout
                </Link>
              </Button>

              {/* Online/Offline status pill */}
              <div className="flex items-center gap-2 text-xs font-bold">
                {isOnline ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-700/50">
                    <Wifi className="h-3.5 w-3.5" /> Online Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-700/50">
                    <WifiOff className="h-3.5 w-3.5" /> Offline Mode Active
                  </span>
                )}

                {pendingSyncCount > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={syncing || !isOnline}
                    className="flex items-center gap-1.5 text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-full hover:bg-amber-500/30 transition-colors"
                  >
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    Sync {pendingSyncCount} offline sale{pendingSyncCount === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Sales</p>
            <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">R{grossRand}</p>
            <p className="mt-1 text-xs text-slate-400">{totalSalesCount} transaction{totalSalesCount === 1 ? '' : 's'} today</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">POS Plan</p>
            <p className="mt-2 text-xl font-black text-amber-600 sm:text-2xl">
              {data?.subscription?.plan_name || 'Starter Plan'}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              ● Active (1% Fee)
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Digital Tills</p>
            <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              {data?.tills?.length ?? 1} Active
            </p>
            <p className="mt-1 text-xs text-slate-400">Mobile & Web Terminals</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tap to Pay</p>
            <p className="mt-2 text-xl font-black text-emerald-600 sm:text-2xl">Ready</p>
            <p className="mt-1 text-xs text-slate-400">SoftPOS (NFC) & Apple Tap</p>
          </div>
        </div>

        {/* Feature Navigation Modules */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Terminal */}
          <Link href="/business/pos/terminal" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 group-hover:bg-amber-400 transition-colors">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Digital Till & Checkout</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Fast touch-friendly checkout, barcode scanner, cash change calculator, contactless Tap to Pay, and instant WhatsApp receipts.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-amber-600">
                Launch Till <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* 2. Inventory */}
          <Link href="/business/pos/inventory" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-900 group-hover:bg-blue-400 transition-colors">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Products & Inventory</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Manage product catalog, SKUs, barcodes, cost vs selling prices, low-stock threshold alerts, and full stock movement logs.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-blue-600">
                Manage Stock <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* 3. Purchasing & Suppliers */}
          <Link href="/business/pos/purchasing" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-900 group-hover:bg-indigo-400 transition-colors">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Suppliers & Purchase Orders</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Maintain supplier contact records, issue purchase orders, and receive incoming inventory straight into stock.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-indigo-600">
                Open Purchasing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* 4. Sales & Receipts */}
          <Link href="/business/pos/sales" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 group-hover:bg-emerald-400 transition-colors">
                  <Receipt className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Sales History & Refunds</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Inspect completed transactions, reprint digital/thermal receipts, resend WhatsApp receipts, and process refunds.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-emerald-600">
                View Sales <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* 5. Reports & Ledger */}
          <Link href="/business/pos/reports" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-900 group-hover:bg-purple-400 transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Reports & Financial Ledger</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Daily revenue, gross profit margins, inventory valuation, platform fees breakdown, and double-entry ledger.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-purple-600">
                View Reports <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* 6. Staff & Tills */}
          <Link href="/business/pos/staff" className="group block">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-900 group-hover:bg-rose-400 transition-colors">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Staff & Till Access</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Assign cashier and manager roles, configure 4-digit quick-switch PINs for shift changes, and audit cashier activity.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-rose-600">
                Manage Staff <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </GlassBackground>
  );
}
