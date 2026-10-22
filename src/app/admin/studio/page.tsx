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
import { cn } from '@/lib/utils';
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
  settings: { isLive?: boolean; monthlyCredits: Record<string, number> };
  sharePct?: number;
  allowBelowFloor?: boolean;
  pricing?: Pricing;
  items?: StudioItem[];
  statement?: Statement;
  error?: string;
}

const TIERS = ['verified', 'standard', 'premium', 'enterprise'];
const thisMonth = () => new Date().toISOString().slice(0, 7);

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
  const [isLive, setIsLive] = useState<boolean>(false);
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
    setIsLive(Boolean(data.settings?.isLive));
    setCredits(data.settings?.monthlyCredits || {});
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

  const toggleLive = async (checked: boolean) => {
    setIsLive(checked);
    const data = await post('toggle_live', { isLive: checked });
    if (data) {
      toast({
        title: checked ? 'Build Studio is now LIVE!' : 'Build Studio switched to Maintenance',
        description: checked ? 'VerifiedBizLink members can now view and access Build Studio.' : 'Members will see the "being connected / opening shortly" notice.',
      });
      load(month);
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
        {/* Master Live Switch */}
        <div className="overflow-hidden rounded-3xl border border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={isLive ? 'h-3 w-3 rounded-full bg-emerald-500 animate-pulse' : 'h-3 w-3 rounded-full bg-amber-500'} />
                <h3 className="text-base font-black text-slate-900">
                  Build Studio Member Availability Switch
                </h3>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase border', isLive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300')}>
                  {isLive ? 'Currently Live' : 'Maintenance / Coming Soon'}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                Switch ON to open Build Studio for all verified members. Switch OFF to display the &ldquo;The studio is being connected&rdquo; notice. Staff accounts can preview anytime. VerifiedBizLink retains 20% of list price.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Make Live</span>
              <Switch
                checked={isLive}
                onCheckedChange={toggleLive}
                disabled={busy === 'toggle_live'}
              />
            </div>
          </div>
        </div>

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
              <StatCard label={month ? `Your earnings · ${month}` : 'Your earnings · all time'} value={rand(statement.totals.partnerEarning)} icon={TrendingUp} gradient="from-amber-500 to-yellow-400" />
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
                <div className="flex items-center gap-2">
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 rounded-xl" />
                  <Button variant="outline" size="sm" onClick={() => setMonth('')} className={month ? '' : 'bg-gray-100'}>All time</Button>
                </div>
              </div>
              {statement.lines.length === 0 ? (
                <p className="px-6 pb-8 text-sm text-gray-500">No paid orders {month ? 'this month' : 'yet'}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-gray-200 text-left text-gray-500">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Member</th>
                        <th className="px-5 py-3 font-medium">Build</th>
                        <th className="px-5 py-3 text-right font-medium">List</th>
                        <th className="px-5 py-3 text-right font-medium">Sold at</th>
                        <th className="px-5 py-3 text-right font-medium">Card</th>
                        <th className="px-5 py-3 text-right font-medium">Credit</th>
                        <th className="px-5 py-3 text-right font-medium">You earn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.lines.map((line) => {
                        const credit = Object.values(line.creditsApplied ?? {}).reduce((sum, value) => sum + value, 0);
                        return (
                          <tr key={line.id} className={`border-t border-gray-200 ${line.test ? 'opacity-50' : ''}`}>
                            <td className="px-5 py-3 text-xs text-gray-500">{new Date(line.at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}</td>
                            <td className="px-5 py-3"><div className="font-medium text-gray-900">{line.businessName}</div><div className="text-xs text-gray-500">{line.customerEmail}</div></td>
                            <td className="px-5 py-3 text-gray-600">{line.itemName}{line.test && <span className="ml-1.5 rounded bg-gray-100 px-1.5 text-[10px] font-bold">TEST</span>}</td>
                            <td className="px-5 py-3 text-right text-gray-500">{rand(line.listPrice)}</td>
                            <td className="px-5 py-3 text-right text-gray-900">{rand(line.price)}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{rand(line.cash)}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{credit ? rand(credit) : '—'}</td>
                            <td className={`px-5 py-3 text-right font-bold ${line.partnerEarning < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{rand(line.partnerEarning)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {statement.payouts.length > 0 && (
                <div className="border-t border-gray-200 p-5 sm:p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Settlements</p>
                  <ul className="space-y-1.5 text-sm">
                    {statement.payouts.map((payout) => (
                      <li key={payout.id} className="flex justify-between gap-3">
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
            <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 text-right font-medium">List</th>
                    <th className="px-4 py-3 text-right font-medium">Lowest</th>
                    <th className="px-4 py-3 font-medium">Fixed price</th>
                    <th className="px-4 py-3 font-medium">Or % off</th>
                    <th className="px-4 py-3 text-right font-medium">Member pays</th>
                    <th className="px-4 py-3 text-center font-medium">Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const rule = pricing.items[item.id] ?? {};
                    const preview = previewPrice(item, pricing, sharePct, allowBelowFloor, previewTier);
                    const priceTooLow = typeof rule.price === 'number' && rule.price < Math.ceil(item.listPrice * (1 - sharePct / 100)) && !allowBelowFloor;
                    const pctTooHigh = typeof rule.discountPct === 'number' && rule.discountPct > maxPct;
                    return (
                      <tr key={item.id} className={`border-t border-gray-100 ${rule.hidden ? 'bg-gray-50 text-gray-400' : ''}`}>
                        <td className="px-4 py-3"><div className="font-semibold text-gray-900">{item.name}</div><div className="text-xs text-gray-500">{item.category}</div></td>
                        <td className="px-4 py-3 text-right">{rand(item.listPrice)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{rand(Math.ceil(item.listPrice * (1 - sharePct / 100)))}</td>
                        <td className="px-4 py-3">
                          <Input type="number" min={5} placeholder="—" value={rule.price ?? ''} onChange={(e) => setRule(item.id, { price: numOrNull(e.target.value) })} className={`w-28 rounded-lg ${priceTooLow ? 'border-rose-400 ring-1 ring-rose-200' : ''}`} />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" min={0} max={maxPct} placeholder="—" value={rule.discountPct ?? ''} onChange={(e) => setRule(item.id, { discountPct: numOrNull(e.target.value) })} disabled={typeof rule.price === 'number'} className={`w-20 rounded-lg ${pctTooHigh ? 'border-rose-400 ring-1 ring-rose-200' : ''}`} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {preview ? (
                            <span className="font-bold text-gray-900">
                              {rand(preview.price)}
                              {preview.atFloor && <span className="ml-1 text-[10px] font-semibold text-amber-700">(lowest)</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs"><EyeOff className="h-3.5 w-3.5" /> Hidden</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch checked={!rule.hidden} onCheckedChange={(on) => setRule(item.id, { hidden: !on })} aria-label={`Offer ${item.name}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-1.5">
                  <span className="text-sm text-gray-500">R</span>
                  <Input type="number" placeholder="Amount" value={grant.amount} onChange={(e) => setGrant({ ...grant, amount: e.target.value })} className="rounded-xl" />
                </div>
                <Input placeholder="Note (they see it)" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} className="flex-[2] rounded-xl" />
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
