'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2, Download, Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminBackground } from '@/components/admin/ui';
import { useToast } from '@/hooks/use-toast';
import { zar, pct } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const TABS = ['overview', 'merchants', 'statements', 'revenue', 'plans', 'audit'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { overview: 'Overview', merchants: 'Merchants', statements: 'Fee statements', revenue: 'Revenue collected', plans: 'Plans & fees', audit: 'Audit log' };

async function api(path: string, body?: unknown) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function AdminPosPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [overview, setOverview] = useState<Row | null>(null);
  const [merchants, setMerchants] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [statements, setStatements] = useState<Row[]>([]);
  const [charges, setCharges] = useState<Row[]>([]);
  const [plans, setPlans] = useState<{ plans: Row[]; feeRules: Row[] } | null>(null);
  const [audit, setAudit] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Row | null>(null);
  const [action, setAction] = useState<{ kind: string; target: Row } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === 'overview') setOverview((await api(`/api/admin/pos?view=overview&from=${from}&to=${to}`)).data);
    if (tab === 'merchants') setMerchants((await api(`/api/admin/pos?view=merchants&q=${encodeURIComponent(q)}`)).data.merchants ?? []);
    if (tab === 'statements') setStatements((await api('/api/admin/pos?view=statements')).data.statements ?? []);
    if (tab === 'revenue') setCharges((await api(`/api/admin/pos?view=charges&from=${from}&to=${to}`)).data.charges ?? []);
    if (tab === 'plans') setPlans((await api('/api/admin/pos?view=plans')).data);
    if (tab === 'audit') setAudit((await api('/api/admin/pos?view=audit')).data.audit ?? []);
    setLoading(false);
  }, [tab, from, to, q]);
  useEffect(() => { load(); }, [load]);

  const openMerchant = async (businessId: string) => {
    const r = await api(`/api/admin/pos?view=merchant&businessId=${businessId}`);
    if (r.ok) setDetail(r.data);
  };

  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    const t = action.target;
    let body: Record<string, unknown> = {};
    switch (action.kind) {
      case 'suspend':
      case 'reactivate':
        body = { action: action.kind, businessId: t.business_id, reason: form.reason };
        break;
      case 'change_plan':
        body = { action: 'change_plan', businessId: t.business_id, planKey: form.planKey, reason: form.reason };
        break;
      case 'fee_override':
        body = { action: 'fee_override', businessId: t.business_id, rateBps: Math.round(parseFloat(form.ratePercent || '0') * 100), exempt: form.exempt === 'yes', effectiveFrom: form.effectiveFrom || undefined, effectiveTo: form.effectiveTo || undefined, maxFeeCents: form.capRand ? Math.round(parseFloat(form.capRand) * 100) : undefined, reason: form.reason };
        break;
      case 'plan_fee':
        body = { action: 'plan_fee', planKey: t.plan_key, rateBps: Math.round(parseFloat(form.ratePercent || '0') * 100), effectiveFrom: form.effectiveFrom || undefined, reason: form.reason };
        break;
      case 'update_plan':
        body = { action: 'update_plan', planKey: t.plan_key, updates: { monthly_price_rand: Number(form.monthly), setup_fee_rand: Number(form.setup), max_tills: Number(form.tills), max_staff: Number(form.staff), trial_days: Number(form.trial), is_active: form.active === 'yes' } };
        break;
      case 'waive':
        body = { action: 'waive_statement', statementId: t.id, reason: form.reason };
        break;
    }
    const r = await api('/api/admin/pos', body);
    setBusy(false);
    if (!r.ok) return toast({ title: 'Not done', description: r.data.error, variant: 'destructive' });
    toast({ title: 'Saved and recorded in the audit log' });
    setAction(null);
    setDetail(null);
    load();
  };

  const startAction = (kind: string, target: Row, initial: Record<string, string> = {}) => {
    setForm({ reason: '', ...initial });
    setAction({ kind, target });
  };

  return (
    <AdminBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl"><Link href="/admin/dashboard" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">VerifiedBizLink POS</h1>
              <p className="text-xs text-slate-500">Platform revenue here is money actually collected. Merchants&apos; sales are theirs and are shown only for scale.</p>
            </div>
          </div>
          <Button variant="outline" onClick={load} className="rounded-xl text-xs"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        </div>

        <nav className="flex flex-wrap gap-1.5" aria-label="POS admin sections">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('rounded-xl px-3 py-1.5 text-xs font-bold', tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>{TAB_LABEL[t]}</button>
          ))}
        </nav>

        {(tab === 'overview' || tab === 'revenue') && (
          <div className="flex flex-wrap items-end gap-2 text-xs">
            <label className="font-bold text-slate-600">From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl bg-white" /></label>
            <label className="font-bold text-slate-600">To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl bg-white" /></label>
            {tab === 'revenue' && <a className="inline-flex items-center gap-1 font-bold underline" href={`/api/admin/pos/export?type=charges&from=${from}&to=${to}`}><Download className="h-3.5 w-3.5" /> CSV</a>}
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : tab === 'overview' && overview ? (
          <div className="space-y-6">
            <Grid title="Collected platform revenue (in period)" items={[
              ['Subscriptions', zar(overview.collectedRevenue.subscriptionCents)],
              ['Setup fees', zar(overview.collectedRevenue.setupFeeCents)],
              ['Transaction fees (paid statements)', zar(overview.collectedRevenue.transactionFeeCents)],
              ['Total collected', zar(overview.collectedRevenue.totalCents)],
            ]} />
            <Grid title="Transaction fees — receivable, not yet revenue" items={[
              ['Accrued on sales (in period)', zar(overview.fees.accruedCents)],
              ['Reversed by refunds (in period)', zar(overview.fees.reversedCents)],
              ['Not yet billed (now)', zar(overview.fees.unbilledCents)],
              ['Billed, unpaid (now)', `${zar(overview.fees.outstandingCents)}${overview.fees.overdueCents ? ` · ${zar(overview.fees.overdueCents)} overdue` : ''}`],
            ]} />
            <Grid title="Merchants" items={[
              ['Active', String(overview.merchants.active)],
              ['In grace', String(overview.merchants.grace)],
              ['Suspended / read-only', String(overview.merchants.suspended)],
              ['MRR (recurring)', zar(overview.mrrCents)],
            ]} />
            <Grid title="Merchant activity (their money, not ours)" items={[
              ['Completed sales', String(overview.sales.completedCount)],
              ['Merchant sales volume', zar(overview.sales.merchantGmvCents)],
              ['Refunds', zar(overview.sales.refundsCents)],
              ['Failed / cancelled online payments', String(overview.sales.failedCount)],
            ]} />
            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs space-y-2">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" /> Payment methods on this deployment</h2>
              {(overview.paymentMethods as Row[]).map((m) => (
                <p key={m.method}><b>{m.label}</b>: {m.enabled ? (m.status === 'sandbox' ? 'on (sandbox)' : 'on') : 'off — awaiting provider approval'}</p>
              ))}
              <p className="text-slate-500">QR / payment-link sales collect into VerifiedBizLink&apos;s own PayFast account, so they stay off until PayFast approves a settlement arrangement in writing (POS_PLATFORM_COLLECTION_APPROVED).</p>
              {Number(overview.issues.open_stock_conflicts) + Number(overview.issues.stale_pending_sales) > 0 && (
                <p className="text-amber-800">{overview.issues.open_stock_conflicts} stock conflicts open · {overview.issues.stale_pending_sales} online sales pending for over an hour</p>
              )}
            </section>
          </div>
        ) : tab === 'merchants' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Business name" className="pl-9 rounded-xl bg-white" aria-label="Search merchants" /></div>
              <a className="inline-flex items-center gap-1 text-xs font-bold underline" href="/api/admin/pos/export?type=merchants"><Download className="h-3.5 w-3.5" /> CSV</a>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Business</th><th>Verified</th><th>Plan</th><th>Status</th><th>Tills</th><th className="text-right">This month</th><th className="text-right">Lifetime</th><th className="text-right">Fees accrued</th><th className="text-right">Collected</th><th className="text-right">Owed</th><th>Fee</th><th className="p-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {merchants.map((m) => (
                    <tr key={m.business_id}>
                      <td className="p-3"><button onClick={() => openMerchant(m.business_id)} className="font-black text-slate-900 hover:underline">{m.company_name}</button></td>
                      <td>{m.verification_status}</td>
                      <td>{m.plan_key}</td>
                      <td><span className={cn('rounded-full px-2 py-0.5 font-bold', m.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' : m.subscription_status === 'grace' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700')}>{m.subscription_status}{m.cancel_at_period_end ? ' (ending)' : ''}</span></td>
                      <td>{m.tills}</td>
                      <td className="text-right">{zar(m.month_sales_cents)}</td>
                      <td className="text-right">{zar(m.lifetime_sales_cents)}</td>
                      <td className="text-right">{zar(m.fees_accrued_cents)}</td>
                      <td className="text-right">{zar(m.fees_collected_cents)}</td>
                      <td className="text-right">{zar(m.outstanding_cents)}</td>
                      <td>{m.fee_override_bps !== null ? <b>{pct(m.fee_override_bps)}</b> : 'plan'}</td>
                      <td className="p-3 whitespace-nowrap space-x-1">
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('fee_override', m, { ratePercent: '1', exempt: 'no' })}>Fee</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('change_plan', m, { planKey: m.plan_key })}>Plan</Button>
                        {m.subscription_status === 'suspended'
                          ? <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('reactivate', m)}>Reactivate</Button>
                          : <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px] text-rose-700" onClick={() => startAction('suspend', m)}>Suspend</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {merchants.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No POS merchants yet.</p>}
            </div>
          </div>
        ) : tab === 'statements' ? (
          <div className="space-y-2">
            <a className="inline-flex items-center gap-1 text-xs font-bold underline" href="/api/admin/pos/export?type=statements"><Download className="h-3.5 w-3.5" /> CSV</a>
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Statement</th><th>Business</th><th>Period</th><th className="text-right">Fees</th><th className="text-right">Reversals</th><th className="text-right">Due</th><th>Status</th><th>Due date</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {statements.map((s) => (
                    <tr key={s.id}>
                      <td className="p-3 font-mono">{s.statement_number}</td><td>{s.company_name}</td><td>{String(s.period_start).slice(0, 7)}</td>
                      <td className="text-right">{zar(s.fees_accrued_cents)}</td><td className="text-right">−{zar(s.fee_reversals_cents)}</td><td className="text-right font-black">{zar(s.net_due_cents)}</td>
                      <td>{s.status}</td><td>{s.due_at ? new Date(s.due_at).toLocaleDateString('en-ZA') : '—'}</td>
                      <td className="p-2">{s.status === 'open' && <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('waive', s)}>Waive</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {statements.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No statements yet — the first are issued at the start of next month.</p>}
            </div>
          </div>
        ) : tab === 'revenue' ? (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Date</th><th>Business</th><th>Kind</th><th>PayFast ref</th><th className="text-right p-3">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {charges.map((c) => (
                  <tr key={c.id}><td className="p-3">{new Date(c.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{c.company_name}</td><td>{c.kind.replace('_', ' ')}</td><td className="font-mono">{c.payment_reference}</td><td className="text-right p-3 font-bold">{zar(c.amount_cents)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-black"><td className="p-3" colSpan={4}>Total collected</td><td className="text-right p-3">{zar(charges.reduce((a, c) => a + Number(c.amount_cents), 0))}</td></tr></tfoot>
            </table>
          </div>
        ) : tab === 'plans' && plans ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {plans.plans.map((p) => (
                <div key={p.plan_key} className="rounded-3xl border border-slate-200 bg-white p-5 text-xs space-y-2">
                  <p className="text-base font-black text-slate-900">{p.name} <span className="font-mono text-slate-400">{p.plan_key}</span>{!p.is_active && <span className="ml-1 text-rose-700">(not on sale)</span>}</p>
                  <p>{zar(p.monthly_price_cents)}/month · {zar(p.setup_fee_cents)} setup · {pct(p.fee_rate_bps)} per sale</p>
                  <p>{p.max_tills} tills · {p.max_staff} staff · {p.trial_days ? `${p.trial_days}-day trial` : 'no trial'}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('update_plan', p, { monthly: String(p.monthly_price_rand), setup: String(p.setup_fee_rand), tills: String(p.max_tills), staff: String(p.max_staff), trial: String(p.trial_days ?? 0), active: p.is_active ? 'yes' : 'no' })}>Edit pricing</Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => startAction('plan_fee', p, { ratePercent: String(p.fee_rate_bps / 100) })}>Change fee</Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Price changes apply to new subscriptions. Existing PayFast subscriptions keep the amount they signed up at. Fee changes apply to sales from their effective date; past sales keep the rate they were charged.</p>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs">
              <h2 className="text-sm font-black mb-2">Fee rule history (platform and plans)</h2>
              <ul className="space-y-1">
                {plans.feeRules.map((r) => <li key={r.id}>{r.scope}{r.plan_key ? ` ${r.plan_key}` : ''}: {r.exempt ? 'exempt' : pct(r.rate_bps)} from {new Date(r.effective_from).toLocaleDateString('en-ZA')}{r.effective_to ? ` to ${new Date(r.effective_to).toLocaleDateString('en-ZA')}` : ''} — {r.reason}</li>)}
              </ul>
            </section>
          </div>
        ) : tab === 'audit' ? (
          <div className="space-y-2">
            <a className="inline-flex items-center gap-1 text-xs font-bold underline" href="/api/admin/pos/export?type=audit"><Download className="h-3.5 w-3.5" /> CSV</a>
            <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white text-xs">
              {audit.map((a) => (
                <li key={a.id} className="p-3"><b>{a.action}</b> · {a.company_name ?? 'platform'} · {a.actor_email ?? a.actor_role} · {new Date(a.created_at).toLocaleString('en-ZA')}{a.detail ? <span className="block text-slate-500 font-mono break-all">{JSON.stringify(a.detail)}</span> : null}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Merchant drill-down (read-only) */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-2xl rounded-3xl bg-white p-6 max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">{detail.merchant.company_name}</DialogTitle>
                <DialogDescription className="text-xs">{detail.merchant.plan_key ?? 'no plan'} · {detail.merchant.status ?? 'no subscription'} · activated {detail.merchant.activated_at ? new Date(detail.merchant.activated_at).toLocaleDateString('en-ZA') : '—'} · this view is logged</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-xs">
                <p>Inventory: {detail.inventory.products} products, {zar(detail.inventory.cost_value_cents)} at cost, {detail.inventory.out_of_stock} out of stock.</p>
                <div><p className="font-black mb-1">Recent sales</p>{detail.recentSales.slice(0, 15).map((s: Row) => <p key={s.id}>{s.receipt_number} · {zar(s.total_cents)} · fee {zar(s.platform_fee_cents)} · {s.payment_method} · {s.payment_status}{s.review_reason ? ' ⚠' : ''}</p>)}</div>
                <div><p className="font-black mb-1">Payments to VerifiedBizLink</p>{detail.charges.map((c: Row) => <p key={c.id}>{new Date(c.created_at).toLocaleDateString('en-ZA')} · {c.kind} · {zar(c.amount_cents)}</p>)}</div>
                <div><p className="font-black mb-1">Negotiated fee rules</p>{detail.feeRules.length ? detail.feeRules.map((r: Row) => <p key={r.id}>{r.exempt ? 'exempt' : pct(r.rate_bps)} from {new Date(r.effective_from).toLocaleDateString('en-ZA')} — {r.reason}</p>) : <p>Plan rate</p>}</div>
                <div><p className="font-black mb-1">Audit</p>{detail.audit.slice(0, 20).map((a: Row) => <p key={a.id}>{new Date(a.created_at).toLocaleString('en-ZA')} · {a.action} · {a.actor_role}</p>)}</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Audited actions */}
      <Dialog open={!!action} onOpenChange={(o) => { if (!o && !busy) setAction(null); }}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          {action && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">{({ suspend: 'Suspend POS', reactivate: 'Reactivate POS', change_plan: 'Change plan (no charge)', fee_override: 'Set a negotiated fee', plan_fee: 'Change plan fee', update_plan: 'Edit plan pricing', waive: 'Waive statement' } as Record<string, string>)[action.kind]}</DialogTitle>
                <DialogDescription className="text-xs">{action.target.company_name ?? action.target.name ?? action.target.statement_number}. Finance administrators only; recorded in the audit log.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-xs">
                {action.kind === 'change_plan' && (
                  <Input value={form.planKey ?? ''} onChange={(e) => setForm((f) => ({ ...f, planKey: e.target.value }))} placeholder="Plan key (starter, business, enterprise)" aria-label="Plan key" className="rounded-xl" />
                )}
                {(action.kind === 'fee_override' || action.kind === 'plan_fee') && (
                  <>
                    <label className="block font-bold">Fee per sale (%)<Input value={form.ratePercent ?? ''} onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))} type="number" step="0.01" className="rounded-xl mt-1" /></label>
                    <label className="block font-bold">Effective from (blank = now)<Input value={form.effectiveFrom ?? ''} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} type="date" className="rounded-xl mt-1" /></label>
                  </>
                )}
                {action.kind === 'fee_override' && (
                  <>
                    <label className="block font-bold">Ends (optional, e.g. a promotion)<Input value={form.effectiveTo ?? ''} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} type="date" className="rounded-xl mt-1" /></label>
                    <label className="block font-bold">Cap per sale in R (optional)<Input value={form.capRand ?? ''} onChange={(e) => setForm((f) => ({ ...f, capRand: e.target.value }))} type="number" className="rounded-xl mt-1" /></label>
                    <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.exempt === 'yes'} onChange={(e) => setForm((f) => ({ ...f, exempt: e.target.checked ? 'yes' : 'no' }))} /> No fee at all (exempt)</label>
                  </>
                )}
                {action.kind === 'update_plan' && (
                  <div className="grid grid-cols-2 gap-2">
                    {([['monthly', 'Monthly (R)'], ['setup', 'Setup fee (R)'], ['tills', 'Max tills'], ['staff', 'Max staff'], ['trial', 'Trial days']] as const).map(([k, l]) => (
                      <label key={k} className="font-bold">{l}<Input value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} type="number" className="rounded-xl mt-1" /></label>
                    ))}
                    <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.active === 'yes'} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked ? 'yes' : 'no' }))} /> On sale</label>
                  </div>
                )}
                {action.kind !== 'update_plan' && (
                  <Input value={form.reason ?? ''} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason (required)" aria-label="Reason" className="rounded-xl" />
                )}
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAction(null)} className="rounded-xl text-xs">Cancel</Button><Button onClick={runAction} disabled={busy} className="rounded-xl bg-slate-900 text-white text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminBackground>
  );
}

function Grid({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black text-slate-900">{title}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{l}</p><p className="mt-1 text-lg font-black text-slate-900">{v}</p></div>
        ))}
      </div>
    </section>
  );
}
