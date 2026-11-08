'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PosAccess } from '@/lib/pos/client';

export interface PosContext {
  businessId: string;
  businessName: string;
  role: string;
  capabilities: string[];
  access: PosAccess;
  settings: Record<string, unknown>;
  paymentMethods: { method: string; enabled: boolean; label: string; status: string; note?: string }[];
}

let cached: Promise<PosContext | null> | null = null;

/** Loads who the caller is at the POS (role, capabilities, subscription access). Cached per page load. */
export function loadPosContext(force = false): Promise<PosContext | null> {
  if (!cached || force) {
    cached = fetch('/api/pos/settings')
      .then(async (r) => (r.ok ? ((await r.json()) as PosContext) : null))
      .catch(() => null);
  }
  return cached;
}

export function usePosContext() {
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    loadPosContext().then((c) => {
      setCtx(c);
      setLoaded(true);
    });
  }, []);
  return { ctx, loaded, can: (cap: string) => Boolean(ctx?.capabilities.includes(cap)) };
}

const NAV: { href: string; label: string; cap: string }[] = [
  { href: '/business/pos', label: 'Overview', cap: 'settings.read' },
  { href: '/business/pos/terminal', label: 'Till', cap: 'sale.create' },
  { href: '/business/pos/inventory', label: 'Products', cap: 'catalog.read' },
  { href: '/business/pos/purchasing', label: 'Purchases', cap: 'purchasing.read' },
  { href: '/business/pos/sales', label: 'Sales', cap: 'sale.read' },
  { href: '/business/pos/reports', label: 'Reports', cap: 'reports.read' },
  { href: '/business/pos/expenses', label: 'Expenses', cap: 'expenses.read' },
  { href: '/business/pos/staff', label: 'Staff', cap: 'staff.read' },
  { href: '/business/pos/fees', label: 'Payments & Fees', cap: 'billing.read' },
  { href: '/business/pos/settings', label: 'Settings', cap: 'settings.read' },
];

export function PosAccessBanner({ access, canPay }: { access?: PosAccess | null; canPay?: boolean }) {
  if (!access || (access.mode === 'full' && !access.message)) return null;
  const readOnly = access.mode === 'read_only';
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
        readOnly ? 'border-rose-300 bg-rose-50 text-rose-950' : 'border-amber-300 bg-amber-50 text-amber-950',
      )}
    >
      <div className="flex items-start gap-2">
        {readOnly ? <Lock className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
        <span className="font-semibold">{access.message}</span>
      </div>
      {canPay && (
        <Button asChild size="sm" className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/business/pos/fees">{access.status === 'inactive' || access.status === 'none' ? 'Activate POS' : 'Pay now'}</Link>
        </Button>
      )}
    </div>
  );
}

export function PosHeader({ title, subtitle, ctx, actions }: { title: string; subtitle?: string; ctx: PosContext | null; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !ctx || ctx.capabilities.includes(n.cap));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="rounded-xl shrink-0">
            <Link href="/business/pos" aria-label="Back to POS overview">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label="POS sections" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-1.5 whitespace-nowrap pb-1">
          {items.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className={cn(
                  'inline-block rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                  pathname === n.href ? 'bg-amber-400 text-slate-950' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
                )}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <PosAccessBanner access={ctx?.access} canPay={ctx?.capabilities.includes('billing.manage')} />
    </div>
  );
}
