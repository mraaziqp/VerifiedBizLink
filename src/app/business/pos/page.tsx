'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard, ShoppingCart, Package, Truck, Receipt, BarChart3, Users, ArrowRight, Loader2,
  Wifi, WifiOff, Store, AlertTriangle, Wallet, Settings, Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { offlineStore } from '@/lib/pos/offline-store';
import { zar, pct } from '@/lib/pos/client';
import { PosAccessBanner, loadPosContext, type PosContext } from '@/components/pos/pos-header';

interface Dashboard {
  transactions: number;
  netSalesCents: number;
  grossProfitCents: number;
  platformFeesCents: number;
}

interface Inventory {
  low_stock: number | string;
  out_of_stock: number | string;
  open_stock_conflicts: number | string;
}

const MODULES = [
  { href: '/business/pos/terminal', cap: 'sale.create', icon: CreditCard, tone: 'bg-amber-100 text-amber-900', title: 'Till & Checkout', text: 'Fast checkout for cash and card-machine sales, change calculator, barcode lookup and WhatsApp receipts. Works offline for cash.' },
  { href: '/business/pos/inventory', cap: 'catalog.read', icon: Package, tone: 'bg-blue-100 text-blue-900', title: 'Products & Inventory', text: 'Catalogue, cost and selling prices, low-stock alerts, stock counts and a full movement log.' },
  { href: '/business/pos/purchasing', cap: 'purchasing.read', icon: Truck, tone: 'bg-indigo-100 text-indigo-900', title: 'Suppliers & Purchase Orders', text: 'Supplier records, purchase orders and receiving stock — including part deliveries.' },
  { href: '/business/pos/sales', cap: 'sale.read', icon: Receipt, tone: 'bg-emerald-100 text-emerald-900', title: 'Sales & Refunds', text: 'Every receipt, reprints, WhatsApp receipts and full or partial refunds.' },
  { href: '/business/pos/reports', cap: 'reports.read', icon: BarChart3, tone: 'bg-purple-100 text-purple-900', title: 'Reports', text: 'Sales, gross profit, net profit after expenses and fees, best sellers and the ledger.' },
  { href: '/business/pos/expenses', cap: 'expenses.read', icon: Banknote, tone: 'bg-orange-100 text-orange-900', title: 'Expenses', text: 'Rent, transport, packaging and other costs, so profit is real profit.' },
  { href: '/business/pos/staff', cap: 'staff.read', icon: Users, tone: 'bg-rose-100 text-rose-900', title: 'Staff & PINs', text: 'Cashiers, managers and stock controllers, with PINs for quick till switching.' },
  { href: '/business/pos/fees', cap: 'billing.read', icon: Wallet, tone: 'bg-slate-200 text-slate-900', title: 'Payments & Fees', text: 'Your subscription, VerifiedBizLink fees per sale, monthly statements and what you have paid.' },
  { href: '/business/pos/settings', cap: 'settings.write', icon: Settings, tone: 'bg-slate-100 text-slate-900', title: 'Settings', text: 'Receipts, VAT registration, discount limits and offline sales.' },
];

export default function BusinessPosHubPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [today, setToday] = useState<Dashboard | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [sub, setSub] = useState<{ plan_name?: string; status?: string; fee_rate_bps?: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    const c = await loadPosContext(true);
    setCtx(c);
    if (c) {
      const can = (cap: string) => c.capabilities.includes(cap);
      const [rep, inv, s] = await Promise.all([
        can('reports.read') ? fetch('/api/pos/reports?type=dashboard&compare=0').then((r) => (r.ok ? r.json() : null)).catch(() => null) : null,
        can('reports.read') ? fetch('/api/pos/reports?type=inventory').then((r) => (r.ok ? r.json() : null)).catch(() => null) : null,
        fetch('/api/pos/subscription').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setToday(rep);
      setInventory(inv);
      setSub(s?.subscription ?? null);
      setPending(offlineStore.getQueuedSales(c.businessId).length);
    }
    setLoading(false);
  }, []);

  const handleSync = useCallback(async () => {
    if (!ctx) return;
    setSyncing(true);
    const res = await offlineStore.syncPendingSales(ctx.businessId);
    setPending(offlineStore.getQueuedSales(ctx.businessId).length);
    setSyncing(false);
    if (res.synced > 0) toast({ title: `Synced ${res.synced} offline sale${res.synced === 1 ? '' : 's'}` });
    if (res.rejected > 0) toast({ title: `${res.rejected} offline sale${res.rejected === 1 ? '' : 's'} need attention`, description: 'Open the till to review them.', variant: 'destructive' });
    if (res.synced > 0) loadData();
  }, [ctx, loadData, toast]);

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [loadData]);

  useEffect(() => {
    if (isOnline && pending > 0 && !syncing) handleSync();
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <GlassBackground>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </GlassBackground>
    );
  }

  if (!ctx) {
    return (
      <GlassBackground>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
          <Store className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-black text-slate-900">VerifiedBizLink POS</h1>
          <p className="text-sm text-slate-600">Create your business profile first, then come back here to set up your till.</p>
          <Button asChild className="rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300">
            <Link href="/business/dashboard">Go to my business</Link>
          </Button>
        </div>
      </GlassBackground>
    );
  }

  const can = (cap: string) => ctx.capabilities.includes(cap);
  const cardMethods = ctx.paymentMethods.filter((m) => m.enabled).map((m) => m.label).join(' · ');

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-lg sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                <Store className="h-3.5 w-3.5 text-amber-400" /> VerifiedBizLink POS
              </span>
              <h1 className="text-3xl font-black text-white sm:text-4xl">{ctx.businessName || 'Your till'}</h1>
              <p className="max-w-xl text-xs text-slate-300 sm:text-sm">Accepting: {cardMethods}</p>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              {can('sale.create') && ctx.access.mode === 'full' && (
                <Button asChild size="lg" className="rounded-2xl bg-amber-400 px-6 py-6 font-black text-slate-950 hover:bg-amber-300 shadow-md">
                  <Link href="/business/pos/terminal" className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5" /> Open till
                  </Link>
                </Button>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {isOnline ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-700/50"><Wifi className="h-3.5 w-3.5" /> Online</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-700/50"><WifiOff className="h-3.5 w-3.5" /> Offline — cash sales only</span>
                )}
                {pending > 0 && (
                  <button onClick={handleSync} disabled={syncing || !isOnline} className="flex items-center gap-1.5 text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-full hover:bg-amber-500/30">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {pending} offline sale{pending === 1 ? '' : 's'} waiting to sync
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <PosAccessBanner access={ctx.access} canPay={can('billing.manage')} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Today’s sales (net of refunds)" value={today ? zar(today.netSalesCents) : '—'} hint={today ? `${today.transactions} sale${today.transactions === 1 ? '' : 's'}` : 'Managers and owners only'} />
          <Stat label="Today’s gross profit" value={today ? zar(today.grossProfitCents) : '—'} hint="Sales minus cost of goods and VAT" />
          <Stat
            label="POS plan"
            value={sub?.plan_name || 'Not active'}
            hint={sub ? `${sub.status}${sub.fee_rate_bps !== undefined ? ` · ${pct(sub.fee_rate_bps)} fee per sale` : ''}` : 'Activate to start selling'}
          />
          <Stat
            label="Stock alerts"
            value={inventory ? `${Number(inventory.low_stock) + Number(inventory.out_of_stock)}` : '—'}
            hint={inventory ? `${inventory.out_of_stock} out · ${inventory.low_stock} low${Number(inventory.open_stock_conflicts) ? ` · ${inventory.open_stock_conflicts} to review` : ''}` : ''}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.filter((m) => can(m.cap)).map((m) => (
            <Link key={m.href} href={m.href} className="group block">
              <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
                <div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.tone}`}>
                    <m.icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-black text-slate-900">{m.title}</h2>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{m.text}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-amber-700">
                  Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </GlassBackground>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl break-words">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
