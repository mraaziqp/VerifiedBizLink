'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Banknote, CheckCircle2, Clock, Coins, EyeOff, Gift, Loader2, Percent, PiggyBank, Plug, RotateCcw, Save, ShoppingBag,
  Sparkles, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, GlassCard, GlassPageHeader, SectionTitle, StatCard } from '@/components/shared/glass-ui';
import { rand } from '@/components/studio/studio-ui';
import type { StudioItem } from '@/lib/studio';

interface ItemRule { price?: number | null; discountPct?: number | null; hidden?: boolean }
interface Pricing { defaultDiscountPct: number; tierDiscountPct: Record<string, number>; items: Record<string, ItemRule>; updatedAt: number | null; updatedBy: string | null }
interface LedgerLine { id: string; at: number; itemName: string; businessName: string; customerEmail: string; listPrice: number; price: number; cash: number; creditsApplied: Record<string, number>; partnerEarning: number; ownerEarning: number; test: boolean }
interface Statement {
  sharePct: number;
  month: string | null;
  lines: LedgerLine[];
  totals: { orders: number; sales: number; cash: number; partnerEarning: number; ownerEarning: number };
  payouts: Array<{ id: string; amount: number; reference: string; note: string; at: number }>;
  balance: number;
}
interface AdminState {
  configured: boolean;
  ordersOpen?: boolean;
  settings: { monthlyCredits: Record<string, number> };
  sharePct?: number;
  allowBelowFloor?: boolean;
  pricing?: Pricing;
  items?: StudioItem[];
  statement?: Statement;
  error?: string;
}

const TIERS = ['verified', 'standard', 'premium', 'enterprise'];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

/** The hub's partnerPrice, for the live preview. The hub re-checks every save. */
function previewPrice(item: StudioItem, pricing: Pricing, sharePct: number, allowBelowFloor: boolean, tier: string | null) {
  const rule = pricing.items[item.id] ?? {};
  if (rule.hidden) return null;
  const floor = Math.ceil(item.listPrice * (1 - sharePct / 100));
  let wanted: number;
  if (typeof rule.price === 'number' && rule.price > 0) wanted = rule.price;
  else {
    const off = typeof rule.discountPct === 'number' ? rule.discountPct : tier && typeof pricing.tierDiscountPct[tier] === 'number' ? pricing.tierDiscountPct[tier] : pricing.defaultDiscountPct;
    wanted = item.listPrice * (1 - Math.min(100, Math.max(0, off)) / 100);
  }
  wanted = Math.round(wanted);
  const atFloor = wanted < floor && !allowBelowFloor;
  return { price: Math.max(atFloor ? floor : wanted, 5), floor, atFloor };
}

const numOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export default function AdminStudioPage() {
  const { toast } = useToast();
  const [state, setState] = useState<AdminState | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(thisMonth());
  const [busy, setBusy] = useState<string | null>(null);
  const [grant, setGrant] = useState({ email: '', amount: '', note: '' });
  const [previewTier, setPreviewTier] = useState<string>('standard');

  const load = useCallback(async (m: string) => {
    const res = await fetch(`/api/admin/studio${m ? `?month=${m}` : ''}`, { cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as AdminState | null;
    if (!res.ok || !data) {
      setState({ configured: false, settings: { monthlyCredits: {} }, error: (data as { error?: string } | null)?.error ?? 'Could not load.' });
      return;
    }
    setState(data);
    setCredits(data.settings.monthlyCredits);
    if (data.pricing) setPricing(data.pricing);
  }, []);

  useEffect(() => {
    load(month);
  }, [load, month]);

  const post = async (action: string, body: Record<string, unknown>) => {
    setBusy(action);
    try {
      const res = await fetch('/api/admin/studio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Not saved', description: data.error, variant: 'destructive' });
        return null;
      }
      return data;
    } finally {
      setBusy(null);
    }
  };

  const sharePct = state?.sharePct ?? 20;
  const allowBelowFloor = state?.allowBelowFloor ?? false;
  const items = state?.items ?? [];
  const dirty = useMemo(() => JSON.stringify(pricing) !== JSON.stringify(state?.pricing), [pricing, state?.pricing]);
  const maxPct = allowBelowFloor ? 100 : sharePct;

  const setRule = (itemId: string, patch: ItemRule) => {
    if (!pricing) return;
    const next = { ...(pricing.items[itemId] ?? {}), ...patch };
    const clean: ItemRule = {};
    if (next.hidden) clean.hidden = true;
    if (typeof next.price === 'number' && Number.isFinite(next.price)) clean.price = next.price;
    if (typeof next.discountPct === 'number' && Number.isFinite(next.discountPct)) clean.discountPct = next.discountPct;
    const items = { ...pricing.items };
    if (Object.keys(clean).length) items[itemId] = clean;
    else delete items[itemId];
    setPricing({ ...pricing, items });
  };

  const savePricing = async () => {
    if (!pricing) return;
    const data = await post('pricing', { pricing: { defaultDiscountPct: pricing.defaultDiscountPct, tierDiscountPct: pricing.tierDiscountPct, items: pricing.items } });
    if (data) {
      toast({ title: 'Prices saved', description: 'Members see the new prices straight away.' });
      load(month);
    }
  };

  const saveCredits = async () => {
    const data = await post('settings', { monthlyCredits: credits });
    if (data) {
      toast({ title: 'Monthly credit saved' });
      setState((s) => (s ? { ...s, settings: data.settings } : s));
    }
  };

  const runAllowances = async () => {
    const data = await post('allowances', {});
    if (data) toast({ title: `Allowances for ${data.month}`, description: `${data.granted} given, ${data.skipped} already had it${data.failed ? `, ${data.failed} failed` : ''}.` });
  };

  const giveCredit = async () => {
    const data = await post('grant', { email: grant.email, amount: Number(grant.amount), note: grant.note });
    if (data) {
      toast({ title: Number(grant.amount) > 0 ? 'Credit given' : 'Credit taken back', description: `${data.name} now has ${rand(data.credits?.total ?? 0)} of studio credit.` });
      setGrant({ email: '', amount: '', note: '' });
    }
  };

  if (!state) {
    return (
      <GlassBackground>
        <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      </GlassBackground>
    );
  }

  const statement = state.statement;

  return (
    <GlassBackground>
      <GlassPageHeader title="Build Studio" subtitle={`Websites, apps and games by ARP Cloud Solutions, sold to members · VerifiedBizLink keeps ${sharePct}% of list`}>
        <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10" asChild>
          <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Admin</Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/business/studio"><Sparkles className="h-4 w-4 text-amber-500" /> View as member</Link>
        </Button>
      </GlassPageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Connection */}
        {!state.configured ? (
          <GlassCard>
            <SectionTitle icon={Plug}>Connect the studio</SectionTitle>
            <p className="text-sm text-gray-600">
              Add <code className="rounded bg-gray-100 px-1">HUB_PARTNER_KEY</code> (from ARP&apos;s Admin → Partners) to this app&apos;s environment, then redeploy. Until then members see “being connected”.
            </p>
          </GlassCard>
        ) : state.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900">{state.error}</div>
        ) : (
          <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${state.ordersOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-cyan-200 bg-cyan-50 text-cyan-950'}`}>
            {state.ordersOpen ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-cyan-700" />}
            <p>
              <span className="font-bold">{state.ordersOpen ? 'Live — members can order.' : 'Connected · orders open soon.'}</span>{' '}
              {state.ordersOpen ? 'Prices, credit and earnings below are live.' : 'Members can browse and see their prices; ARP opens ordering when ready. Staff accounts can test now.'}
            </p>
          </div>
        )}

        {/* Earnings */}
        {statement && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label={month ? `Your earnings · ${monthName(month)}` : 'Your earnings · all time'} value={rand(statement.totals.partnerEarning)} icon={TrendingUp} gradient="from-amber-500 to-yellow-400" />
              <StatCard label="Member sales" value={rand(statement.totals.sales)} icon={ShoppingBag} gradient="from-cyan-500 to-blue-500" />
              <StatCard label="Orders" value={statement.totals.orders} icon={Sparkles} gradient="from-violet-500 to-indigo-500" />
              <StatCard
                label={statement.balance >= 0 ? 'Owed to VerifiedBizLink' : 'Owed to ARP'}
                value={rand(Math.abs(statement.balance))}
                icon={PiggyBank}
                gradient={statement.balance >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'}
              />
            </div>

            <GlassCard className="!p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
                <SectionTitle icon={Banknote}>Earnings statement</SectionTitle>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="min-w-0 flex-1 rounded-xl sm:w-40 sm:flex-none" aria-label="Statement month" />
                  <Button variant="outline" size="sm" onClick={() => setMonth('')} className={month ? '' : 'bg-gray-100'}>All time</Button>
                </div>
              </div>
              {statement.lines.length === 0 ? (
                <p className="px-6 pb-8 text-sm text-gray-500">No paid orders {month ? 'this month' : 'yet'}.</p>
              ) : (
                <div>
                  <div className="hidden grid-cols-[4.5rem_minmax(0,2fr)_minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-3 border-t border-gray-200 px-5 py-3 text-xs font-medium text-gray-500 lg:grid">
                    <span>Date</span><span>Member</span><span>Build</span>
                    <span className="text-right">List</span><span className="text-right">Sold at</span><span className="text-right">Card</span><span className="text-right">Credit</span><span className="text-right">You earn</span>
                  </div>
                  <ul>
                    {statement.lines.map((line) => {
                      const credit = Object.values(line.creditsApplied ?? {}).reduce((sum, value) => sum + value, 0);
                      const date = new Date(line.at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
                      const earned = <span className={`font-bold ${line.partnerEarning < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{rand(line.partnerEarning)}</span>;
                      return (
                        <li key={line.id} className={`border-t border-gray-200 px-5 py-3 text-sm ${line.test ? 'opacity-50' : ''}`}>
                          {/* Phone and tablet: one card per order */}
                          <div className="flex items-start justify-between gap-3 lg:hidden">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">{line.businessName}</p>
                              <p className="truncate text-xs text-gray-500">{line.itemName} · {date}{line.test ? ' · TEST' : ''}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {rand(line.price)}
                                {line.listPrice > line.price ? <span className="line-through"> {rand(line.listPrice)}</span> : null} · card {rand(line.cash)}
                                {credit ? ` · credit ${rand(credit)}` : ''}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[10px] uppercase tracking-wide text-gray-400">You earn</p>
                              {earned}
                            </div>
                          </div>
                          {/* Desktop: the full row */}
                          <div className="hidden grid-cols-[4.5rem_minmax(0,2fr)_minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] items-center gap-3 lg:grid">
                            <span className="text-xs text-gray-500">{date}</span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-gray-900">{line.businessName}</span>
                              <span className="block truncate text-xs text-gray-500">{line.customerEmail}</span>
                            </span>
                            <span className="truncate text-gray-600">
                              {line.itemName}
                              {line.test && <span className="ml-1.5 rounded bg-gray-100 px-1.5 text-[10px] font-bold">TEST</span>}
                            </span>
                            <span className="text-right text-gray-500">{rand(line.listPrice)}</span>
                            <span className="text-right text-gray-900">{rand(line.price)}</span>
                            <span className="text-right text-gray-600">{rand(line.cash)}</span>
                            <span className="text-right text-gray-600">{credit ? rand(credit) : '—'}</span>
                            <span className="text-right">{earned}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {statement.payouts.length > 0 && (
                <div className="border-t border-gray-200 p-5 sm:p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Settlements</p>
                  <ul className="space-y-1.5 text-sm">
                    {statement.payouts.map((payout) => (
                      <li key={payout.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
                        <span className="text-gray-600">{new Date(payout.at).toLocaleDateString('en-ZA')} · {payout.reference}{payout.note ? ` · ${payout.note}` : ''}</span>
                        <span className="font-semibold text-gray-900">{payout.amount >= 0 ? `Paid to you ${rand(payout.amount)}` : `Paid to ARP ${rand(-payout.amount)}`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="border-t border-gray-200 px-5 py-3 text-[11px] text-gray-500 sm:px-6">
                At list price you earn {sharePct}%. Discounts and credit you give come out of your share; credit ARP gives comes out of theirs. ARP settles the balance monthly.
              </p>
            </GlassCard>
          </>
        )}

        {/* Pricing */}
        {pricing && items.length > 0 && (
          <GlassCard>
            <SectionTitle
              icon={Percent}
              action={
                <div className="flex gap-2">
                  {dirty && (
                    <Button variant="outline" size="sm" onClick={() => setPricing(state.pricing ?? null)} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Undo</Button>
                  )}
                  <Button size="sm" onClick={savePricing} disabled={!dirty || busy === 'pricing'} className="gap-1.5 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                    {busy === 'pricing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save prices
                  </Button>
                </div>
              }
            >
              Member prices &amp; discounts
            </SectionTitle>
            <p className="-mt-2 mb-5 text-xs text-gray-500">
              Discounts come out of your {sharePct}% share, so the lowest price on anything is its list price less {sharePct}%{allowBelowFloor ? ' (ARP has allowed you to go lower)' : ''}.
              {pricing.updatedAt ? ` Last changed ${new Date(pricing.updatedAt).toLocaleString('en-ZA')}${pricing.updatedBy ? ` by ${pricing.updatedBy}` : ''}.` : ''}
            </p>

            <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
              <div className="space-y-1.5 rounded-2xl border border-gray-200 bg-white p-4">
                <label className="text-xs font-bold text-gray-700">Off everything, for every member</label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={maxPct} value={pricing.defaultDiscountPct} onChange={(e) => setPricing({ ...pricing, defaultDiscountPct: Number(e.target.value) || 0 })} className="w-24 rounded-xl" />
                  <span className="text-sm text-gray-500">% (max {maxPct}%)</span>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-700">Or by plan (overrides the above)</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TIERS.map((tier) => (
                    <div key={tier} className="space-y-1">
                      <span className="text-[11px] font-semibold capitalize text-gray-500">{tier}</span>
                      <Input
                        type="number"
                        min={0}
                        max={maxPct}
                        placeholder="—"
                        value={pricing.tierDiscountPct[tier] ?? ''}
                        onChange={(e) => {
                          const tierDiscountPct = { ...pricing.tierDiscountPct };
                          const value = numOrNull(e.target.value);
                          if (value === null) delete tierDiscountPct[tier];
                          else tierDiscountPct[tier] = value;
                          setPricing({ ...pricing, tierDiscountPct });
                        }}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-900">Per item</p>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Preview prices for
                <select value={previewTier} onChange={(e) => setPreviewTier(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold capitalize">
                  {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="hidden grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_8rem_6rem_minmax(0,1.2fr)_4rem] items-center gap-3 px-4 py-3 text-xs font-medium text-gray-500 lg:grid">
                <span>Item</span>
                <span className="text-right">List</span>
                <span className="text-right">Lowest</span>
                <span>Fixed price</span>
                <span>Or % off</span>
                <span className="text-right">Member pays</span>
                <span className="text-center">Offer</span>
              </div>
              <ul className="divide-y divide-gray-100 lg:border-t lg:border-gray-100">
                {items.map((item) => {
                  const rule = pricing.items[item.id] ?? {};
                  const preview = previewPrice(item, pricing, sharePct, allowBelowFloor, previewTier);
                  const lowest = Math.ceil(item.listPrice * (1 - sharePct / 100));
                  const priceTooLow = typeof rule.price === 'number' && rule.price < lowest && !allowBelowFloor;
                  const pctTooHigh = typeof rule.discountPct === 'number' && rule.discountPct > maxPct;
                  const pays = preview ? (
                    <span className="font-bold text-gray-900">
                      {rand(preview.price)}
                      {preview.atFloor && <span className="ml-1 text-[10px] font-semibold text-amber-700">(lowest)</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <EyeOff className="h-3.5 w-3.5" /> Hidden
                    </span>
                  );
                  const offer = <Switch checked={!rule.hidden} onCheckedChange={(on) => setRule(item.id, { hidden: !on })} aria-label={`Offer ${item.name}`} />;
                  const fixed = (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      placeholder="—"
                      aria-label={`Fixed price for ${item.name}`}
                      value={rule.price ?? ''}
                      onChange={(e) => setRule(item.id, { price: numOrNull(e.target.value) })}
                      className={`rounded-lg ${priceTooLow ? 'border-rose-400 ring-1 ring-rose-200' : ''}`}
                    />
                  );
                  const off = (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={maxPct}
                      placeholder="—"
                      aria-label={`Percent off ${item.name}`}
                      value={rule.discountPct ?? ''}
                      onChange={(e) => setRule(item.id, { discountPct: numOrNull(e.target.value) })}
                      disabled={typeof rule.price === 'number'}
                      className={`rounded-lg ${pctTooHigh ? 'border-rose-400 ring-1 ring-rose-200' : ''}`}
                    />
                  );
                  return (
                    <li key={item.id} className={`px-4 py-3 text-sm ${rule.hidden ? 'bg-gray-50' : ''}`}>
                      {/* Phone and tablet */}
                      <div className="space-y-3 lg:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`font-semibold ${rule.hidden ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.category} · list {rand(item.listPrice)} · lowest {rand(lowest)}
                            </p>
                          </div>
                          {offer}
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                          <label className="space-y-1 text-[11px] font-semibold text-gray-500">
                            Fixed price
                            {fixed}
                          </label>
                          <label className="space-y-1 text-[11px] font-semibold text-gray-500">
                            Or % off
                            {off}
                          </label>
                          <div className="pb-2 text-right">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Member pays</p>
                            {pays}
                          </div>
                        </div>
                        {priceTooLow && <p className="text-xs font-medium text-rose-700">Below the lowest price ({rand(lowest)}).</p>}
                      </div>
                      {/* Desktop */}
                      <div className="hidden grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_8rem_6rem_minmax(0,1.2fr)_4rem] items-center gap-3 lg:grid">
                        <span className="min-w-0">
                          <span className={`block truncate font-semibold ${rule.hidden ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                          <span className="block truncate text-xs text-gray-500">{item.category}</span>
                        </span>
                        <span className="text-right">{rand(item.listPrice)}</span>
                        <span className="text-right text-gray-500">{rand(lowest)}</span>
                        {fixed}
                        {off}
                        <span className="text-right">{pays}</span>
                        <span className="flex justify-center">{offer}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            {dirty && (
              <div className="sticky bottom-24 z-20 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
                <p className="text-xs font-semibold text-gray-700">Unsaved price changes</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPricing(state.pricing ?? null)}>Undo</Button>
                  <Button size="sm" onClick={savePricing} disabled={busy === 'pricing'} className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                    {busy === 'pricing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly credit */}
          <GlassCard>
            <SectionTitle icon={Coins}>Monthly member credit</SectionTitle>
            <p className="-mt-2 mb-4 text-xs text-gray-500">
              Studio credit each active member gets on the 1st, by plan. It comes off their orders and out of your share when spent. Given once a month — safe to run again.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TIERS.map((tier) => (
                <div key={tier} className="space-y-1">
                  <span className="text-xs font-semibold capitalize text-gray-600">{tier}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-500">R</span>
                    <Input type="number" min={0} max={20000} value={credits[tier] ?? 0} onChange={(e) => setCredits({ ...credits, [tier]: Number(e.target.value) || 0 })} className="rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveCredits} disabled={busy === 'settings' || JSON.stringify(credits) === JSON.stringify(state.settings.monthlyCredits)} className="gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800">
                {busy === 'settings' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
              <Button variant="outline" onClick={runAllowances} disabled={busy === 'allowances' || !state.configured} className="gap-1.5">
                {busy === 'allowances' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Give this month&apos;s now
              </Button>
            </div>
          </GlassCard>

          {/* One-off credit */}
          <GlassCard>
            <SectionTitle icon={Gift}>Give a member credit</SectionTitle>
            <p className="-mt-2 mb-4 text-xs text-gray-500">A promotion, an apology or a free build. A negative amount takes your credit back.</p>
            <div className="space-y-3">
              <Input type="email" placeholder="Member's email" value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} className="rounded-xl" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-center gap-1.5">
                  <span className="text-sm text-gray-500">R</span>
                  <Input type="number" placeholder="Amount" value={grant.amount} onChange={(e) => setGrant({ ...grant, amount: e.target.value })} className="rounded-xl" />
                </div>
                <Input placeholder="Note (they see it)" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} className="rounded-xl sm:flex-[2]" />
              </div>
              <Button onClick={giveCredit} disabled={busy === 'grant' || !grant.email || !Number(grant.amount) || !state.configured} className="w-full gap-1.5 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                {busy === 'grant' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} {Number(grant.amount) < 0 ? 'Take back credit' : 'Give credit'}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </GlassBackground>
  );
}
