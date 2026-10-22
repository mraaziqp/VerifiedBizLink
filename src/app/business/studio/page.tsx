'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, BadgeCheck, Clock, Coins, ExternalLink, Gift, Layers, Loader2, Lock, Rocket, Search, ShieldCheck,
  Sparkles, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';
import { StageBadge, ProgressBar, rand } from '@/components/studio/studio-ui';
import type { StudioCredits, StudioItem, StudioOrder } from '@/lib/studio';

interface Access {
  allowed: boolean;
  tier: string | null;
  businessId?: string | null;
  businessName: string | null;
  reason: 'signed_out' | 'no_business' | 'not_subscribed' | null;
  staff: boolean;
}

interface StudioState {
  access: Access;
  configured: boolean;
  ordersOpen?: boolean;
  items?: StudioItem[];
  credits?: StudioCredits | null;
  error?: string;
}

interface Quote {
  listPrice: number;
  price: number;
  credit: number;
  cash: number;
}

const KIND_LABEL: Record<StudioItem['kind'], string> = { website: 'Website', app: 'App', template: 'Ready-made' };

export default function BuildStudioPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <BuildStudio />
    </Suspense>
  );
}

function BuildStudio() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<StudioState | null>(null);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [ordering, setOrdering] = useState<StudioItem | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/studio', { cache: 'no-store' }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as StudioState | null;
    setState(data ?? { access: { allowed: false, tier: null, businessName: null, reason: null, staff: false }, configured: true, error: 'The studio could not be reached. Please refresh in a moment.' });
    if (data?.access.allowed && data.configured && !data.error) {
      const mine = await fetch('/api/studio/orders', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setOrders(mine?.orders ?? []);
      if (mine?.credits) setState((s) => (s ? { ...s, credits: mine.credits } : s));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Back from the payment page: straight to the project.
  useEffect(() => {
    const orderId = params.get('order');
    if (orderId) router.replace(`/business/studio/orders/${encodeURIComponent(orderId)}?welcome=1`);
  }, [params, router]);

  const items = useMemo(() => state?.items ?? [], [state?.items]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const shown = items.filter((item) => {
    if (filter !== 'All' && item.category !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${item.name} ${item.summary} ${item.category} ${item.features.join(' ')}`.toLowerCase().includes(q);
  });

  if (!state) return <StudioSkeleton />;
  const { access } = state;
  const canOrder = access.allowed && state.configured && !state.error;
  const credits = state.credits;
  const bestSaving = items.reduce((max, item) => Math.max(max, item.listPrice - item.price), 0);

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-12">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Build Studio · for VerifiedBizLink members
              </span>
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                Your website, app or online shop,
                <span className="block bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent">built for you.</span>
              </h1>
              <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                Pick a design, tell us about your business, and our studio builds it — hosted, live and yours to edit from here. Member pricing on every plan.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5"><Rocket className="h-4 w-4 text-amber-400" /> First version in days</span>
                <span className="flex items-center gap-1.5"><Wand2 className="h-4 w-4 text-amber-400" /> Edit words, colours &amp; sections yourself</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-400" /> Secure PayFast checkout</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              {canOrder ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your studio credit</p>
                  <p className="mt-1 flex items-center gap-2 text-3xl font-black">
                    <Coins className="h-7 w-7 text-amber-400" />
                    {credits?.unlimited ? 'Unlimited' : rand(credits?.total ?? 0)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {credits && credits.total > 0 ? 'Goes towards any order automatically — pay the rest by card.' : 'Credit from your plan or promotions shows here and comes off your orders.'}
                  </p>
                  {access.tier && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black uppercase text-slate-950">
                      <BadgeCheck className="h-3.5 w-3.5" /> {access.tier} member pricing
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Member pricing</p>
                  <p className="mt-1 text-2xl font-black">{bestSaving > 0 ? `Save up to ${rand(bestSaving)}` : 'Included with every paid plan'}</p>
                  <p className="mt-2 text-xs text-slate-400">Build Studio is part of every paid VerifiedBizLink plan, with monthly credit on selected plans.</p>
                  <Button asChild className="mt-4 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                    <Link href={access.reason === 'no_business' ? '/business/create' : '/pricing'}>
                      {access.reason === 'no_business' ? 'List your business' : 'See plans'} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {state.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900">{state.error}</div>
        )}
        {!state.configured && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            <p className="font-bold">The studio is being connected.</p>
            <p className="mt-1">Everything opens here shortly. Check back soon.</p>
          </div>
        )}
        {canOrder && state.ordersOpen === false && (
          <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
            <div>
              <p className="font-bold">Orders open soon.</p>
              <p className="mt-0.5">Browse and preview every design now — your member prices are already showing.</p>
            </div>
          </div>
        )}

        {/* My projects */}
        {orders.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Layers className="h-5 w-5 text-amber-500" /> Your projects</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/business/studio/orders/${order.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">{order.businessName}</p>
                      <p className="truncate text-xs text-slate-500">{order.itemName}</p>
                    </div>
                    <StageBadge stage={order.stage} />
                  </div>
                  <ProgressBar value={order.progress} stage={order.stage} className="mt-4" />
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">{order.latestNote ?? 'Open to see progress, preview and changes.'}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Hosted Products, Prices & Specials Showcase Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-300/90 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 p-6 sm:p-8 text-slate-950 shadow-md">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Instant Digital Storefront
              </span>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                Post your products, prices &amp; specials online.
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm font-semibold text-slate-900/80 leading-relaxed">
                Pick a template (Retail Catalog, Restaurant Menu, Service Packages or Flash Deals), have it hosted live on VerifiedBizLink, and start taking WhatsApp orders. You keep 80% — VerifiedBizLink handles the verified hosting and trust verification.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button asChild className="rounded-xl bg-slate-950 font-black text-white hover:bg-slate-900 shadow-md px-6 h-11">
                <Link href={access.businessId ? `/business/${access.businessId}/specials` : '/business/create'}>
                  <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" />
                  {access.businessId ? 'Open My Specials Showcase' : 'List Business to Launch'}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Catalogue */}
        {items.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-black text-slate-900">Choose what to build</h2>
              <div className="relative md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs…" className="rounded-xl bg-white pl-9" />
              </div>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    filter === category ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-amber-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500">Nothing matches that. Try another word.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    businessId={access.businessId}
                    member={access.allowed}
                    canOrder={canOrder && state.ordersOpen !== false}
                    onOrder={() => setOrdering(item)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <p className="pb-4 text-center text-[11px] text-slate-400">
          Build Studio is delivered by ARP Cloud Solutions for VerifiedBizLink members. Payments are processed securely by PayFast.
        </p>
      </div>

      <OrderDialog
        item={ordering}
        businessName={access.businessName ?? ''}
        onClose={() => setOrdering(null)}
        onPlaced={(result) => {
          if (result.payUrl) {
            window.location.href = result.payUrl;
            return;
          }
          toast({ title: 'Order placed — your build is starting', description: 'Paid with your studio credit.' });
          router.push(`/business/studio/orders/${result.orderId}?welcome=1`);
        }}
      />
    </GlassBackground>
  );
}

function ItemCard({
  item,
  businessId,
  member,
  canOrder,
  onOrder,
}: {
  item: StudioItem;
  businessId?: string | null;
  member: boolean;
  canOrder: boolean;
  onOrder: () => void;
}) {
  const [imageOk, setImageOk] = useState(Boolean(item.coverUrl));
  const saving = item.listPrice - item.price;
  const isShowcase = item.id.startsWith('vbl-showcase');
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900">
        {imageOk && item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={`${item.name} preview`}
            loading="lazy"
            onError={() => setImageOk(false)}
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-10 w-10 text-amber-400/70" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-800 shadow-xs backdrop-blur">
          {KIND_LABEL[item.kind] ?? item.category}
        </span>
        {member && saving > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950 shadow-xs">
            Save {rand(saving)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{item.category}</p>
        <h3 className="mt-0.5 text-base font-extrabold text-slate-900">{item.name}</h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-slate-600">{item.summary}</p>
        {item.features.length > 0 && (
          <ul className="mt-3 space-y-1">
            {item.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex items-start gap-1.5 text-xs text-slate-600">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              {member && saving > 0 && <p className="text-xs font-semibold text-slate-400 line-through">{rand(item.listPrice)}</p>}
              <p className="text-2xl font-black text-slate-900">{rand(item.price)}</p>
              {item.timeframe && <p className="text-[11px] font-medium text-slate-500">{item.timeframe}</p>}
            </div>
            {item.previewUrl && (
              <a
                href={item.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Live preview <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {isShowcase ? (
            <Button asChild className="mt-4 w-full rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 shadow-xs">
              <Link href={businessId ? `/business/${businessId}/specials` : '/business/create'}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Launch My Showcase
              </Link>
            </Button>
          ) : member ? (
            <Button onClick={onOrder} disabled={!canOrder} className="mt-4 w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
              {canOrder ? <>Start this build <ArrowRight className="ml-1.5 h-4 w-4" /></> : <><Clock className="mr-1.5 h-4 w-4" /> Opening soon</>}
            </Button>
          ) : (
            <Button asChild variant="outline" className="mt-4 w-full rounded-xl border-amber-300 font-bold text-amber-900 hover:bg-amber-50">
              <Link href="/pricing"><Lock className="mr-1.5 h-4 w-4" /> Members get it for less</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function OrderDialog({
  item,
  businessName,
  onClose,
  onPlaced,
}: {
  item: StudioItem | null;
  businessName: string;
  onClose: () => void;
  onPlaced: (result: { orderId: string; paid: boolean; payUrl?: string }) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(businessName);
  const [brief, setBrief] = useState('');
  const [useCredits, setUseCredits] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName((current) => current || businessName);
    let alive = true;
    setQuote(null);
    setQuoteError(null);
    fetch('/api/studio/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: item.id, useCredits }) })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setQuote(data);
        else setQuoteError(data.error ?? 'Could not price this just now.');
      })
      .catch(() => alive && setQuoteError('Could not reach the studio. Check your connection.'));
    return () => {
      alive = false;
    };
  }, [item, useCredits, businessName]);

  const place = async () => {
    if (!item) return;
    setPlacing(true);
    try {
      const res = await fetch('/api/studio/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, businessName: name, brief, useCredits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Could not place the order', description: data.error, variant: 'destructive' });
        return;
      }
      onPlaced(data);
    } finally {
      setPlacing(false);
    }
  };

  const price = quote?.price ?? item?.price ?? 0;
  const credit = quote?.credit ?? 0;
  const cash = quote?.cash ?? price;
  const ready = name.trim().length >= 2 && brief.trim().length >= 20;

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && !placing && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Start your {item.name}</DialogTitle>
              <DialogDescription>Tell the studio what it is for. You can change words, colours and sections yourself once it is built.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="studio-name">Business or project name</label>
                <Input id="studio-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" htmlFor="studio-brief">What do you need?</label>
                <Textarea
                  id="studio-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  maxLength={4000}
                  rows={5}
                  placeholder="What you sell or do, who it is for, the pages you want, your colours, anything you love on other sites…"
                  className="rounded-xl"
                />
                <p className="text-right text-[11px] text-slate-400">{brief.trim().length < 20 ? `${20 - brief.trim().length} more characters` : 'Looks good'}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1.5 text-sm">
                  {quote && quote.listPrice > price && (
                    <Row label="List price" value={<span className="text-slate-400 line-through">{rand(quote.listPrice)}</span>} />
                  )}
                  <Row label="Your member price" value={<span className="font-bold text-slate-900">{rand(price)}</span>} />
                  {credit > 0 && <Row label={<span className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-emerald-600" /> Studio credit</span>} value={<span className="font-bold text-emerald-700">−{rand(credit)}</span>} />}
                  <div className="my-2 border-t border-slate-200" />
                  <Row label={<span className="font-bold text-slate-900">{cash > 0 ? 'To pay by card' : 'To pay'}</span>} value={<span className="text-lg font-black text-slate-900">{quote ? rand(cash) : '…'}</span>} />
                </div>
                <label className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
                  Use my studio credit
                  <Switch checked={useCredits} onCheckedChange={setUseCredits} />
                </label>
              </div>

              {quoteError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{quoteError}</p>}
              <Button onClick={place} disabled={!ready || placing || !quote} className="h-11 w-full rounded-xl bg-amber-400 text-sm font-black text-slate-950 hover:bg-amber-300">
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : cash > 0 ? <>Continue to secure payment · {rand(cash)}</> : <>Place order with credit</>}
              </Button>
              <p className="text-center text-[11px] text-slate-500">
                {cash > 0 ? 'You will pay on PayFast and come straight back here to follow your build.' : 'Your build starts as soon as you place the order.'}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      {value}
    </div>
  );
}

function StudioSkeleton() {
  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    </GlassBackground>
  );
}
