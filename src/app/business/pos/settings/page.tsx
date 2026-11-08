'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Store, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { PosHeader, usePosContext, loadPosContext } from '@/components/pos/pos-header';

interface FormState {
  vat_registered: boolean;
  vat_number: string;
  tax_rate_percent: number;
  receipt_header: string;
  receipt_footer: string;
  phone: string;
  email: string;
  address: string;
  auto_print_receipt: boolean;
  allow_offline_sales: boolean;
  allow_custom_items: boolean;
  max_cashier_discount_percent: number;
}

export default function PosSettingsPage() {
  const { toast } = useToast();
  const { ctx, loaded, can } = usePosContext();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    const s = ctx.settings;
    setForm({
      vat_registered: Boolean(s.vat_registered),
      vat_number: String(s.vat_number ?? ''),
      tax_rate_percent: Number(s.tax_rate_percent ?? 15),
      receipt_header: String(s.receipt_header ?? ''),
      receipt_footer: String(s.receipt_footer ?? ''),
      phone: String(s.phone ?? ''),
      email: String(s.email ?? ''),
      address: String(s.address ?? ''),
      auto_print_receipt: Boolean(s.auto_print_receipt),
      allow_offline_sales: s.allow_offline_sales !== false,
      allow_custom_items: s.allow_custom_items !== false,
      max_cashier_discount_percent: Number(s.max_cashier_discount_bps ?? 1000) / 100,
    });
  }, [ctx]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { max_cashier_discount_percent, ...rest } = form;
    const res = await fetch('/api/pos/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, max_cashier_discount_bps: Math.round(max_cashier_discount_percent * 100) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      toast({ title: 'Settings saved' });
      loadPosContext(true);
    } else {
      toast({ title: 'Not saved', description: data.error, variant: 'destructive' });
    }
  };

  const editable = can('settings.write');

  return (
    <GlassBackground>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader title="POS settings" subtitle="Receipts, VAT, cashier limits and how you take payment." ctx={ctx} />

        {!loaded || !form ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><CreditCard className="h-5 w-5 text-amber-500" /> Payment methods</h2>
              <ul className="space-y-2 text-sm">
                {ctx!.paymentMethods.map((m) => (
                  <li key={m.method} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3">
                    <span className="font-bold text-slate-900">{m.label}</span>
                    <span className={m.enabled ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-slate-500'}>
                      {m.enabled ? (m.status === 'sandbox' ? 'On (test mode)' : 'On') : 'Coming soon'}
                    </span>
                    {m.note && <span className="w-full text-xs text-slate-500">{m.note}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">Card payments are taken on your own card machine (for example Yoco or your bank&apos;s speedpoint), so the money goes straight to you. Your plan and fees are on <Link href="/business/pos/fees" className="font-bold underline">Payments & Fees</Link>.</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Receipt className="h-5 w-5 text-amber-500" /> VAT</h2>
              <Toggle
                label="My business is registered for VAT with SARS"
                hint="Only turn this on if you have a VAT number. Receipts then show VAT and say “Tax invoice”. If you are not registered, receipts show no VAT."
                checked={form.vat_registered}
                onChange={(v) => set('vat_registered', v)}
                disabled={!editable}
              />
              {form.vat_registered && (
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <Field label="VAT number" value={form.vat_number} onChange={(v) => set('vat_number', v)} placeholder="4xxxxxxxxx" disabled={!editable} mono />
                  <Field label="VAT rate (%)" value={String(form.tax_rate_percent)} onChange={(v) => set('tax_rate_percent', Number(v || 0))} type="number" disabled={!editable} />
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Store className="h-5 w-5 text-amber-500" /> Store & receipts</h2>
              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                <Field label="Receipt header" value={form.receipt_header} onChange={(v) => set('receipt_header', v)} disabled={!editable} />
                <Field label="Receipt footer" value={form.receipt_footer} onChange={(v) => set('receipt_footer', v)} disabled={!editable} />
                <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} disabled={!editable} />
                <Field label="Email" value={form.email} onChange={(v) => set('email', v)} disabled={!editable} />
                <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(v) => set('address', v)} disabled={!editable} /></div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="text-base font-black text-slate-900">Till rules</h2>
              <Toggle label="Allow offline cash sales" hint="Cash sales are saved on the device without internet and sync when the connection returns. Card sales always need a connection." checked={form.allow_offline_sales} onChange={(v) => set('allow_offline_sales', v)} disabled={!editable} />
              <Toggle label="Allow custom items" hint="Lets the till sell something that is not in your product list, at a price typed in." checked={form.allow_custom_items} onChange={(v) => set('allow_custom_items', v)} disabled={!editable} />
              <Toggle label="Print a receipt after every sale" checked={form.auto_print_receipt} onChange={(v) => set('auto_print_receipt', v)} disabled={!editable} />
              <div className="max-w-xs text-xs">
                <Field label="Largest discount a cashier can give (%)" value={String(form.max_cashier_discount_percent)} onChange={(v) => set('max_cashier_discount_percent', Math.max(0, Math.min(100, Number(v || 0))))} type="number" disabled={!editable} />
                <p className="mt-1 text-slate-500">Bigger discounts need a manager or the owner to sign in with their PIN.</p>
              </div>
            </section>

            {editable && (
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} className="rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300 px-6">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save settings'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </GlassBackground>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; mono?: boolean }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="font-bold text-slate-700">{label}</label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`mt-1 rounded-xl ${mono ? 'font-mono' : ''}`} />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}
