'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { posFetch, zar } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';

interface Expense { id: string; category: string; description?: string; amount_cents: number; expense_date: string; supplier_name?: string }

const CATEGORY_LABEL: Record<string, string> = {
  stock_purchase: 'Stock bought (not on a purchase order)', transport: 'Transport', rent: 'Rent / stall fee', electricity: 'Electricity',
  packaging: 'Packaging', equipment: 'Equipment', wages: 'Wages', other: 'Other',
};

export default function PosExpensesPage() {
  const { toast } = useToast();
  const { ctx, can } = usePosContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: 'transport', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await posFetch('/api/pos/expenses');
    if (r.ok) setExpenses((r.data.expenses as Expense[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (!(cents > 0)) return toast({ title: 'Enter an amount', variant: 'destructive' });
    setBusy(true);
    const r = await posFetch('/api/pos/expenses', { method: 'POST', json: { category: form.category, amountCents: cents, description: form.description, expenseDate: form.expenseDate } });
    setBusy(false);
    if (!r.ok) return toast({ title: 'Not saved', description: String(r.data.error ?? ''), variant: 'destructive' });
    setForm((f) => ({ ...f, amount: '', description: '' }));
    load();
  };

  const monthTotal = expenses.filter((x) => String(x.expense_date).slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((a, x) => a + Number(x.amount_cents), 0);
  const writable = can('expenses.write') && ctx?.access.mode === 'full';

  return (
    <GlassBackground>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader
          title="Expenses"
          subtitle="Costs of running the business. They reduce net profit in Reports; they are not sales and not VerifiedBizLink fees."
          ctx={ctx}
          actions={can('export') ? <a href="/api/pos/export?type=expenses" className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> CSV</a> : null}
        />

        {writable && (
          <form onSubmit={add} className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_7rem_9rem] text-xs">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-xl border border-slate-200 p-2" aria-label="Category">
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} type="number" inputMode="decimal" step="0.01" placeholder="Amount (R)" aria-label="Amount in rand" className="rounded-xl" />
            <Input value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} type="date" aria-label="Date" className="rounded-xl" />
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was it for? (optional)" aria-label="Description" className="rounded-xl sm:col-span-2" maxLength={300} />
            <Button type="submit" disabled={busy} className="rounded-xl bg-amber-400 text-slate-950 font-black text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add expense</>}</Button>
          </form>
        )}

        <p className="text-sm font-bold text-slate-700">This month: {zar(monthTotal)}</p>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : expenses.length === 0 ? (
          <p className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No expenses recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white text-xs">
            {expenses.map((x) => (
              <li key={x.id} className="flex justify-between gap-3 p-3">
                <span><b className="text-slate-900">{CATEGORY_LABEL[x.category] ?? x.category}</b>{x.description ? ` — ${x.description}` : ''}<span className="block text-slate-500">{new Date(x.expense_date).toLocaleDateString('en-ZA')}</span></span>
                <b>{zar(x.amount_cents)}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassBackground>
  );
}
