'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GlassBackground } from '@/components/shared/glass-ui';
import { zar, METHOD_LABELS } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';
import { cn } from '@/lib/utils';

interface Dashboard {
  from: string;
  to: string;
  transactions: number;
  grossSalesCents: number;
  refundsCents: number;
  netSalesCents: number;
  vatCents: number;
  costOfGoodsCents: number;
  grossProfitCents: number;
  platformFeesCents: number;
  expensesCents: number;
  netProfitCents: number;
  averageSaleCents: number;
  byMethod: { payment_method: string; count: number; net_cents: number }[];
  daily: { day: string; transactions: number; net_sales_cents: number }[];
  topProducts: { product_name: string; quantity: number; sales_cents: number; gross_profit_cents: number }[];
  byCashier: { cashier: string; transactions: number; net_sales_cents: number }[];
  previous: Dashboard | null;
}

const saToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' })).toISOString().slice(0, 10);
const shift = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86400000).toISOString().slice(0, 10);

export default function PosReportsPage() {
  const { ctx, can } = usePosContext();
  const today = saToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Dashboard | null>(null);
  const [ledger, setLedger] = useState<{ account_name: string; debit_cents: number; credit_cents: number; balance_cents: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, l] = await Promise.all([
      fetch(`/api/pos/reports?type=dashboard&from=${from}&to=${to}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/pos/reports?type=trial_balance').then((r) => (r.ok ? r.json() : null)),
    ]);
    setData(d);
    setLedger(l?.accounts ?? []);
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const presets: [string, string, string][] = [
    ['Today', today, today],
    ['7 days', shift(today, -6), today],
    ['This month', `${today.slice(0, 7)}-01`, today],
    ['30 days', shift(today, -29), today],
  ];
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d) => Number(d.net_sales_cents)));

  return (
    <GlassBackground>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader
          title="Reports"
          subtitle="Sales are not profit — each figure below is labelled for what it is."
          ctx={ctx}
          actions={can('export') ? <a href="/api/pos/export?type=ledger" className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> Ledger CSV</a> : null}
        />

        <div className="flex flex-wrap items-end gap-2">
          {presets.map(([l, f, t]) => (
            <button key={l} onClick={() => { setFrom(f); setTo(t); }} className={cn('rounded-xl px-3 py-2 text-xs font-bold', from === f && to === t ? 'bg-amber-400 text-slate-950' : 'bg-white border border-slate-200 text-slate-600')}>{l}</button>
          ))}
          <label className="text-xs font-bold text-slate-600">From <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-xl bg-white" /></label>
          <label className="text-xs font-bold text-slate-600">To <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-xl bg-white" /></label>
        </div>

        {loading || !data ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Net sales" value={data.netSalesCents} prev={data.previous?.netSalesCents} hint={`${zar(data.grossSalesCents)} sold − ${zar(data.refundsCents)} refunded`} />
              <Kpi label="Gross profit" value={data.grossProfitCents} prev={data.previous?.grossProfitCents} hint={`after ${zar(data.costOfGoodsCents)} cost of goods${data.vatCents ? ` and ${zar(data.vatCents)} VAT` : ''}`} />
              <Kpi label="Net profit" value={data.netProfitCents} prev={data.previous?.netProfitCents} hint={`after ${zar(data.expensesCents)} expenses and ${zar(data.platformFeesCents)} VerifiedBizLink fees`} />
              <Kpi label="Sales" value={null} text={`${data.transactions}`} hint={`average ${zar(data.averageSaleCents)}`} />
            </section>
            <p className="text-xs text-slate-500">Gross profit uses each product&apos;s cost price at the time of sale; products with no cost price set will overstate it. Compared with the {data.previous ? `${data.previous.from} – ${data.previous.to}` : 'previous'} period.</p>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">Net sales by day</h2>
              {data.daily.length === 0 ? <p className="text-xs text-slate-500">No sales in this period.</p> : (
                <div className="flex h-40 items-end gap-1" role="img" aria-label="Bar chart of net sales per day">
                  {data.daily.map((d) => (
                    <div key={String(d.day)} className="group flex flex-1 flex-col items-center justify-end" title={`${String(d.day).slice(0, 10)}: ${zar(d.net_sales_cents)} (${d.transactions})`}>
                      <div className="w-full rounded-t bg-amber-400" style={{ height: `${Math.max(2, (Number(d.net_sales_cents) / maxDay) * 100)}%` }} />
                      <span className="mt-1 text-[9px] text-slate-500">{String(d.day).slice(8, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <Table title="Best sellers" rows={data.topProducts.map((p) => [p.product_name, `${Number(p.quantity)}`, zar(p.sales_cents), zar(p.gross_profit_cents)])} head={['Product', 'Qty', 'Sales', 'Gross profit']} />
              <Table title="How customers paid" rows={data.byMethod.map((m) => [METHOD_LABELS[m.payment_method] ?? m.payment_method, `${m.count}`, zar(m.net_cents)])} head={['Method', 'Sales', 'Net']} />
              <Table title="By cashier" rows={data.byCashier.map((c) => [c.cashier, `${c.transactions}`, zar(c.net_sales_cents)])} head={['Cashier', 'Sales', 'Net']} />
            </div>

            {ledger.length > 0 && (
              <Table
                title="Ledger balances (all time)"
                head={['Account', 'Debits', 'Credits', 'Balance']}
                rows={ledger.map((a) => [a.account_name.replace(/_/g, ' '), zar(a.debit_cents), zar(a.credit_cents), zar(a.balance_cents)])}
                note="Double-entry: total debits always equal total credits. “platform fee payable” is what you currently owe VerifiedBizLink in fees."
              />
            )}
          </>
        )}
      </div>
    </GlassBackground>
  );
}

function Kpi({ label, value, prev, text, hint }: { label: string; value: number | null; prev?: number; text?: string; hint?: string }) {
  const delta = value !== null && prev !== undefined && prev !== 0 ? Math.round(((value - prev) / Math.abs(prev)) * 100) : null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-1 text-xl font-black', value !== null && value < 0 ? 'text-rose-700' : 'text-slate-900')}>{text ?? zar(value)}</p>
      {delta !== null && (
        <p className={cn('flex items-center gap-1 text-[11px] font-bold', delta >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta >= 0 ? '+' : ''}{delta}% vs previous
        </p>
      )}
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Table({ title, head, rows, note }: { title: string; head: string[]; rows: string[][]; note?: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-2 overflow-x-auto">
      <h2 className="text-sm font-black text-slate-900">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-slate-500">Nothing yet.</p> : (
        <table className="w-full text-xs">
          <thead className="text-slate-500"><tr>{head.map((h, i) => <th key={h} className={cn('py-1', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cn('py-1.5', j ? 'text-right' : '')}>{c}</td>)}</tr>)}</tbody>
        </table>
      )}
      {note && <p className="text-[11px] text-slate-500">{note}</p>}
    </section>
  );
}
