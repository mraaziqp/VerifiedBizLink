'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Download, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { startPayfastCheckout } from '@/lib/payfast-checkout';
import { zar, pct } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';
import { cn } from '@/lib/utils';

interface Plan {
  plan_key: string;
  name: string;
  monthly_price_cents: number;
  setup_fee_cents: number;
  fee_rate_bps: number;
  max_tills: number;
  max_staff: number;
  trial_days: number;
  features: string[];
}

interface Statement {
  id: string;
  statement_number: string;
  period_start: string;
  period_end: string;
  sales_count: number;
  eligible_sales_cents: number;
  fees_accrued_cents: number;
  fee_reversals_cents: number;
  carried_forward_cents: number;
  net_due_cents: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
}

interface Summary {
  grossSalesCents: number;
  refundsCents: number;
  feesAccruedLifetimeCents: number;
  feesReversedLifetimeCents: number;
  unbilledFeesCents: number;
  outstandingCents: number;
  overdueCents: number;
  feesCollectedCents: number;
  feesWaivedCents: number;
  creditCents: number;
  carriedForwardCents: number;
  subscriptionPaidCents: number;
  setupFeePaidCents: number;
  statements: Statement[];
  billingCharges: { id: string; kind: string; amount_cents: number; payment_reference: string; created_at: string }[];
  subscription: Record<string, unknown> | null;
  currentFee: { rateBps: number; fixedCents: number; minFeeCents: number | null; maxFeeCents: number | null; exempt: boolean; scope: string };
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Due', paid: 'Paid', waived: 'Waived', credit: 'Credit to you', zero: 'Nothing due', carried: 'Under R5 — added to next statement',
};
const KIND_LABEL: Record<string, string> = { setup_fee: 'Setup fee', subscription: 'Monthly subscription', fee_statement: 'Transaction fees' };
const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function PosFeesPage() {
  const { toast } = useToast();
  const { ctx, can } = usePosContext();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ statement: Statement; sales: Record<string, unknown>[]; refunds: Record<string, unknown>[] } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      fetch('/api/pos/subscription').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/pos/fees').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setPlans(p?.plans ?? []);
    setSummary(f);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid')) toast({ title: 'Payment received by PayFast', description: 'It shows here as soon as PayFast confirms it — usually within a minute.' });
    if (params.get('cancelled')) toast({ title: 'Payment cancelled', description: 'Nothing was charged.' });
  }, [load, toast]);

  const sub = summary?.subscription as { plan_key?: string; plan_name?: string; status?: string; renews_at?: string; cancel_at_period_end?: boolean; setup_fee_paid?: boolean; recurring_amount_cents?: number } | null;

  const activate = async (planKey: string) => {
    setBusy(planKey);
    const r = await startPayfastCheckout({ action: 'activate', planKey }, '/api/pos/subscription');
    setBusy(null);
    toast({ title: 'Could not start the payment', description: r.error, variant: 'destructive' });
  };

  const trial = async (planKey: string) => {
    setBusy(planKey);
    const res = await fetch('/api/pos/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start_trial', planKey }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) toast({ title: data.error || 'Could not start the trial', variant: 'destructive' });
    else { toast({ title: 'Free trial started' }); location.reload(); }
  };

  const payStatement = async (id: string) => {
    setBusy(id);
    const r = await startPayfastCheckout({ action: 'pay_statement', statementId: id }, '/api/pos/fees');
    setBusy(null);
    toast({ title: 'Could not start the payment', description: r.error, variant: 'destructive' });
  };

  const cancel = async () => {
    setBusy('cancel');
    const res = await fetch('/api/pos/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirmCancel(false);
    if (!res.ok) toast({ title: data.error || 'Could not cancel', variant: 'destructive' });
    else { toast({ title: 'Subscription cancelled', description: 'Your till stays open until the end of the paid month.' }); load(); }
  };

  const openStatement = async (id: string) => {
    const r = await fetch(`/api/pos/fees?statementId=${id}`);
    if (r.ok) setDetail(await r.json());
  };

  const fee = summary?.currentFee;
  const canManage = can('billing.manage');

  return (
    <GlassBackground>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <PosHeader title="Payments & Fees" subtitle="What you pay VerifiedBizLink for POS, and why." ctx={ctx} />

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : (
          <>
            {/* How fees work */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><Info className="h-4 w-4 text-amber-600" /> How you are charged</h2>
              <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <li className="rounded-2xl bg-slate-50 p-4"><b className="block text-slate-900">Setup fee — once</b>Charged with your first month when you activate.</li>
                <li className="rounded-2xl bg-slate-50 p-4"><b className="block text-slate-900">Monthly subscription</b>Billed by PayFast each month until you cancel.</li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <b className="block text-slate-900">{fee ? (fee.exempt ? 'No transaction fee' : `${pct(fee.rateBps)} per completed sale`) : 'Transaction fee'}</b>
                  Added up each month on a statement you pay through PayFast. Refunds give the fee back. Your customers&apos; money always goes to you, not to us.
                  {fee && (fee.minFeeCents || fee.maxFeeCents || fee.fixedCents) ? <span className="block text-xs text-slate-500 mt-1">{fee.fixedCents ? `+ ${zar(fee.fixedCents)} per sale. ` : ''}{fee.minFeeCents ? `Minimum ${zar(fee.minFeeCents)}. ` : ''}{fee.maxFeeCents ? `Capped at ${zar(fee.maxFeeCents)}.` : ''}</span> : null}
                </li>
              </ul>
            </section>

            {/* Subscription */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Your plan</h2>
                  <p className="text-xs text-slate-500">
                    {sub?.status === 'active' || sub?.status === 'grace'
                      ? `${sub.plan_name} · ${sub.cancel_at_period_end ? `ends ${d(sub.renews_at)}` : `renews ${d(sub.renews_at)}`}${sub.recurring_amount_cents ? ` · ${zar(sub.recurring_amount_cents)}/month` : ''}`
                      : sub?.status === 'trial' ? 'Free trial' : 'Not active yet'}
                  </p>
                </div>
                {canManage && (sub?.status === 'active' || sub?.status === 'grace') && !sub.cancel_at_period_end && (
                  <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setConfirmCancel(true)}>Cancel subscription</Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {plans.map((p) => {
                  const current = sub?.plan_key === p.plan_key && (sub?.status === 'active' || sub?.status === 'grace') && !sub?.cancel_at_period_end;
                  const setup = sub?.setup_fee_paid ? 0 : p.setup_fee_cents;
                  return (
                    <div key={p.plan_key} className={cn('flex flex-col justify-between rounded-3xl border bg-white p-6', current ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-200')}>
                      <div className="space-y-3">
                        <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                        <p><span className="text-3xl font-black">{zar(p.monthly_price_cents)}</span><span className="text-xs text-slate-500"> / month</span></p>
                        <p className="text-xs text-slate-600">{setup ? `${zar(setup)} once-off setup · ` : ''}{pct(p.fee_rate_bps)} per sale · {p.max_tills} till{p.max_tills === 1 ? '' : 's'} · {p.max_staff} staff</p>
                        <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                          {(Array.isArray(p.features) ? p.features : []).map((f) => (
                            <li key={f} className="flex gap-2 text-xs text-slate-600"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-5 space-y-2">
                        {current ? (
                          <Button disabled className="w-full rounded-xl text-xs">Your plan</Button>
                        ) : canManage ? (
                          <>
                            <Button onClick={() => activate(p.plan_key)} disabled={busy !== null} className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs">
                              {busy === p.plan_key ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${zar(setup + p.monthly_price_cents)} with PayFast`}
                            </Button>
                            {p.trial_days > 0 && !sub && (
                              <Button variant="outline" onClick={() => trial(p.plan_key)} disabled={busy !== null} className="w-full rounded-xl text-xs">Start {p.trial_days}-day free trial</Button>
                            )}
                          </>
                        ) : (
                          <p className="text-center text-xs text-slate-500">Only the business owner can change the plan.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {sub?.plan_key && (sub.status === 'active' || sub.status === 'grace') && (
                <p className="text-xs text-slate-500">Changing plan starts a new PayFast subscription at the new price and cancels the old one once the new one is paid.</p>
              )}
            </section>

            {summary && (
              <>
                {/* Fee totals */}
                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Tile label="Fees not yet billed" value={zar(summary.unbilledFeesCents)} hint="Accrued this month — billed on your next statement" />
                  <Tile label="Due now" value={zar(summary.outstandingCents + summary.carriedForwardCents)} hint={summary.overdueCents ? `${zar(summary.overdueCents)} overdue` : summary.carriedForwardCents ? `${zar(summary.carriedForwardCents)} under R5, carried forward` : 'On open statements'} tone={summary.overdueCents ? 'bad' : undefined} />
                  <Tile label="Fees paid" value={zar(summary.feesCollectedCents)} hint={summary.creditCents ? `${zar(summary.creditCents)} credit for refunds` : 'Lifetime'} />
                  <Tile label="Subscription & setup paid" value={zar(summary.subscriptionPaidCents + summary.setupFeePaidCents)} hint={`incl. ${zar(summary.setupFeePaidCents)} setup`} />
                </section>
                <p className="text-xs text-slate-500">
                  Lifetime: {zar(summary.grossSalesCents)} in sales, {zar(summary.refundsCents)} refunded. Fees charged {zar(summary.feesAccruedLifetimeCents)}, given back on refunds {zar(summary.feesReversedLifetimeCents)}{summary.feesWaivedCents ? `, waived ${zar(summary.feesWaivedCents)}` : ''}. Card-machine charges from your own provider are between you and them and are not included.
                </p>

                {/* Statements */}
                <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-black text-slate-900">Monthly fee statements</h2>
                    {can('export') && <a className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline" href="/api/pos/export?type=fee_statements"><Download className="h-3.5 w-3.5" /> CSV</a>}
                  </div>
                  {summary.statements.length === 0 ? (
                    <p className="text-sm text-slate-500">No statements yet. Your first one is issued at the start of next month.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500"><tr><th className="py-2 pr-3">Period</th><th className="pr-3">Sales</th><th className="pr-3">Fees</th><th className="pr-3">Refunds</th><th className="pr-3">Brought fwd</th><th className="pr-3">Due</th><th className="pr-3">Status</th><th /></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {summary.statements.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2 pr-3 whitespace-nowrap"><button className="font-bold text-slate-900 hover:underline" onClick={() => openStatement(s.id)}>{String(s.period_start).slice(0, 7)}</button></td>
                              <td className="pr-3">{s.sales_count} · {zar(s.eligible_sales_cents)}</td>
                              <td className="pr-3">{zar(s.fees_accrued_cents)}</td>
                              <td className="pr-3">−{zar(s.fee_reversals_cents)}</td>
                              <td className="pr-3">{Number(s.carried_forward_cents) ? zar(s.carried_forward_cents) : '—'}</td>
                              <td className="pr-3 font-black">{zar(s.net_due_cents)}</td>
                              <td className="pr-3"><span className={cn('rounded-full px-2 py-0.5 font-bold', s.status === 'open' ? (s.due_at && new Date(s.due_at) < new Date() ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900') : 'bg-slate-100 text-slate-700')}>{STATUS_LABEL[s.status] ?? s.status}{s.status === 'open' && s.due_at ? ` by ${d(s.due_at)}` : ''}</span></td>
                              <td className="text-right">
                                {s.status === 'open' && canManage && (
                                  <Button size="sm" onClick={() => payStatement(s.id)} disabled={busy !== null} className="h-8 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs">{busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pay'}</Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Payments to VerifiedBizLink */}
                <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
                  <h2 className="text-base font-black text-slate-900">Payments you have made to VerifiedBizLink</h2>
                  {summary.billingCharges.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
                    <ul className="divide-y divide-slate-100 text-xs">
                      {summary.billingCharges.map((c) => (
                        <li key={c.id} className="flex justify-between gap-3 py-2">
                          <span>{d(c.created_at)} · {KIND_LABEL[c.kind] ?? c.kind} <span className="text-slate-400">({c.payment_reference})</span></span>
                          <b>{zar(c.amount_cents)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-lg rounded-3xl bg-white p-6">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Statement {detail.statement.statement_number}</DialogTitle>
                <DialogDescription className="text-xs">{d(detail.statement.period_start)} – {d(detail.statement.period_end)} · {STATUS_LABEL[detail.statement.status] ?? detail.statement.status}</DialogDescription>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto text-xs space-y-3">
                <table className="w-full">
                  <thead className="text-slate-500"><tr><th className="text-left py-1">Receipt</th><th className="text-right">Sale</th><th className="text-right">Rate</th><th className="text-right">Fee</th></tr></thead>
                  <tbody>
                    {detail.sales.map((s) => (
                      <tr key={String(s.id)}><td className="py-0.5">{String(s.receipt_number)}</td><td className="text-right">{zar(s.total_cents as number)}</td><td className="text-right">{pct(s.fee_rate_bps as number)}</td><td className="text-right">{zar(s.platform_fee_cents as number)}</td></tr>
                    ))}
                    {detail.refunds.map((r) => (
                      <tr key={String(r.id)} className="text-emerald-700"><td className="py-0.5">Refund {String(r.receipt_number)}</td><td className="text-right">−{zar(r.amount_cents as number)}</td><td /><td className="text-right">−{zar(r.fee_reversal_cents as number)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t pt-2 flex justify-between font-black"><span>Total due</span><span>{zar(detail.statement.net_due_cents)}</span></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-sm rounded-3xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Cancel POS subscription?</DialogTitle>
            <DialogDescription className="text-xs">PayFast stops billing you. Your till stays open until {d(sub?.renews_at)}, then becomes read-only. Your sales, stock and reports are kept and you can export them any time. Fees already accrued are still billed.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(false)} className="rounded-xl text-xs">Keep my plan</Button>
            <Button onClick={cancel} disabled={busy === 'cancel'} className="rounded-xl bg-rose-600 text-white text-xs">{busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel subscription'}</Button>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1"><ExternalLink className="h-3 w-3" /> You will not be charged again after cancelling.</p>
        </DialogContent>
      </Dialog>
    </GlassBackground>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'bad' }) {
  return (
    <div className={cn('rounded-2xl border bg-white p-4', tone === 'bad' ? 'border-rose-300' : 'border-slate-200')}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-1 text-xl font-black', tone === 'bad' ? 'text-rose-700' : 'text-slate-900')}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
