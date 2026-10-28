'use client';

import { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  ArrowLeft, Briefcase, Check, Edit3, Eye, EyeOff, Flame, Globe, Loader2, Lock, MapPin, MessageSquare, Palette, Plus,
  QrCode, Share2, ShieldCheck, ShoppingBag, Sparkles, Trash2, Utensils, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUploader } from '@/components/media/image-uploader';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { startPayfastCheckout } from '@/lib/payfast-checkout';
import { cn } from '@/lib/utils';

/**
 * A business's storefront: its products, menu, packages or deals, hosted on
 * VerifiedBizLink. Visitors see it once it is published; the owner (and
 * staff) set it up here — choose and buy a template, design it, add items,
 * publish. Before Build Studio is live the API answers staff only.
 */

type Template = 'retail' | 'food' | 'services' | 'deals';
type Accent = 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'slate';

interface Item {
  id: string;
  title: string;
  description: string | null;
  priceRand: number;
  specialPriceRand: number | null;
  category: string;
  imageUrl: string | null;
  isInStock: boolean;
  isFeatured: boolean;
}

interface Business {
  id: string;
  name: string;
  verified: boolean;
  logoUrl: string | null;
  phone: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
}

interface Storefront {
  template: Template;
  headline: string | null;
  tagline: string | null;
  accent: Accent;
  coverUrl: string | null;
  whatsapp: string | null;
  published: boolean;
  siteUrl: string | null;
  siteTitle: string | null;
  owned: Template[];
}

interface TemplateOffer {
  id: Template;
  label: string;
  summary: string;
  listPrice: number;
  memberPrice: number;
  yourPrice: number;
  owned: boolean;
}

interface StorefrontData {
  business: Business;
  storefront: Storefront;
  canManage: boolean;
  free: boolean;
  templates: TemplateOffer[];
}

const TEMPLATES: Record<Template, { label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  retail: { label: 'Product Catalogue', icon: ShoppingBag, blurb: 'A photo grid of products with prices, sale tags and stock.' },
  food: { label: 'Restaurant Menu', icon: Utensils, blurb: 'A menu by section, with today’s specials up top.' },
  services: { label: 'Service Packages', icon: Briefcase, blurb: 'Side-by-side packages with what each includes.' },
  deals: { label: 'Flash Deals', icon: Zap, blurb: 'Big discount badges, the best deal first, sold-out tags.' },
};

/** Full class names (Tailwind only keeps classes it can see written out). */
const ACCENTS: Record<Accent, { swatch: string; button: string; text: string; soft: string; ring: string; hero: string; chip: string }> = {
  amber: { swatch: 'bg-amber-400', button: 'bg-amber-400 text-slate-950 hover:bg-amber-300', text: 'text-amber-600', soft: 'bg-amber-50', ring: 'ring-amber-400', hero: 'from-slate-950 via-slate-900 to-amber-950', chip: 'bg-amber-400 text-slate-950' },
  emerald: { swatch: 'bg-emerald-500', button: 'bg-emerald-500 text-white hover:bg-emerald-400', text: 'text-emerald-600', soft: 'bg-emerald-50', ring: 'ring-emerald-500', hero: 'from-slate-950 via-slate-900 to-emerald-950', chip: 'bg-emerald-500 text-white' },
  sky: { swatch: 'bg-sky-500', button: 'bg-sky-500 text-white hover:bg-sky-400', text: 'text-sky-600', soft: 'bg-sky-50', ring: 'ring-sky-500', hero: 'from-slate-950 via-slate-900 to-sky-950', chip: 'bg-sky-500 text-white' },
  rose: { swatch: 'bg-rose-500', button: 'bg-rose-500 text-white hover:bg-rose-400', text: 'text-rose-600', soft: 'bg-rose-50', ring: 'ring-rose-500', hero: 'from-slate-950 via-slate-900 to-rose-950', chip: 'bg-rose-500 text-white' },
  violet: { swatch: 'bg-violet-500', button: 'bg-violet-500 text-white hover:bg-violet-400', text: 'text-violet-600', soft: 'bg-violet-50', ring: 'ring-violet-500', hero: 'from-slate-950 via-slate-900 to-violet-950', chip: 'bg-violet-500 text-white' },
  slate: { swatch: 'bg-slate-700', button: 'bg-slate-900 text-white hover:bg-slate-800', text: 'text-slate-700', soft: 'bg-slate-100', ring: 'ring-slate-500', hero: 'from-slate-950 via-slate-900 to-slate-800', chip: 'bg-slate-900 text-white' },
};

const money = (rand: number) => `R${rand.toLocaleString('en-ZA', { minimumFractionDigits: rand % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** A number WhatsApp can open: digits, South African numbers in international form. */
const waNumber = (phone: string | null) => {
  const digits = (phone ?? '').replace(/[^0-9]/g, '');
  if (digits.length < 9) return null;
  return digits.startsWith('0') ? `27${digits.slice(1)}` : digits;
};

const BLANK_ITEM: Partial<Item> = { title: '', description: '', priceRand: undefined, specialPriceRand: null, category: '', imageUrl: '', isInStock: true, isFeatured: false };

export default function StorefrontPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Loading />}>
      <StorefrontView id={id} />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
  );
}

function StorefrontView({ id }: { id: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const search = useSearchParams();

  const [data, setData] = useState<StorefrontData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [category, setCategory] = useState('All');
  const [preview, setPreview] = useState(false);

  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const load = useCallback(async () => {
    const [front, list] = await Promise.all([
      fetch(`/api/business/storefront?businessId=${encodeURIComponent(id)}`, { cache: 'no-store' }).catch(() => null),
      fetch(`/api/business/showcase?businessId=${encodeURIComponent(id)}`, { cache: 'no-store' }).catch(() => null),
    ]);
    if (!front?.ok) {
      setState('unavailable');
      return null;
    }
    const next = (await front.json()) as StorefrontData;
    setData(next);
    if (list?.ok) setItems(((await list.json()) as { items: Item[] }).items ?? []);
    setState('ready');
    return next;
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from PayFast: the template arrives when PayFast's notification does, usually within seconds.
  useEffect(() => {
    if (search.get('cancelled')) {
      toast({ title: 'Payment cancelled', description: 'Nothing was charged. You can choose a template any time.' });
      router.replace(`/business/${id}/specials`);
      return;
    }
    if (!search.get('paid')) return;
    let tries = 0;
    let alive = true;
    const startOwned = data?.storefront.owned.length ?? 0;
    toast({ title: 'Payment received', description: 'Setting up your template…' });
    const tick = async () => {
      const next = await load();
      if (!alive) return;
      if (next && next.storefront.owned.length > startOwned) {
        toast({ title: 'Your template is ready', description: 'Add your products, then publish it.' });
        router.replace(`/business/${id}/specials`);
        return;
      }
      if (++tries < 15) setTimeout(tick, 2000);
      else toast({ title: 'Still confirming your payment', description: 'It will appear here as soon as PayFast confirms it. You can refresh in a minute.' });
    };
    void tick();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the page opens from PayFast
  }, [search]);

  // ?template=food from Build Studio: open the chooser on that template.
  useEffect(() => {
    if (data?.canManage && search.get('template') && !search.get('paid')) setChooserOpen(true);
  }, [data?.canManage, search]);

  const storefront = data?.storefront;
  const owner = Boolean(data?.canManage) && !preview;
  const accent = ACCENTS[storefront?.accent ?? 'amber'];
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items]);
  const shown = items.filter((item) => category === 'All' || item.category === category);
  const whatsapp = waNumber(storefront?.whatsapp ?? data?.business.phone ?? null);

  const orderLink = (item: Item | null) => {
    if (!whatsapp || !data) return null;
    const text = item
      ? `Hi ${data.business.name}, I saw "${item.title}" (${money(item.specialPriceRand ?? item.priceRand)}) on your VerifiedBizLink storefront.`
      : `Hi ${data.business.name}, I found you on VerifiedBizLink.`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  };

  const saveItem = async () => {
    if (!editing?.title?.trim() || editing.priceRand === undefined || editing.priceRand === null || Number.isNaN(editing.priceRand)) {
      toast({ title: 'Add a name and a price', variant: 'destructive' });
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch('/api/business/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_item', businessId: id, item: editing }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Could not save', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: editing.id ? 'Saved' : 'Added to your storefront' });
      setEditing(null);
      await load();
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async (item: Item) => {
    if (!confirm(`Remove "${item.title}" from your storefront?`)) return;
    const res = await fetch('/api/business/showcase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_item', businessId: id, itemId: item.id }),
    }).catch(() => null);
    if (res?.ok) {
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      toast({ title: 'Removed' });
    } else {
      toast({ title: 'Could not remove it', variant: 'destructive' });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/business/${id}/specials`;
    if (navigator.share) {
      await navigator.share({ title: data?.business.name, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    toast({ title: 'Link copied' });
  };

  const downloadQr = async () => {
    const url = `${window.location.origin}/business/${id}/specials`;
    const png = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
    const a = document.createElement('a');
    a.href = png;
    a.download = `${(data?.business.name ?? 'storefront').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`;
    a.click();
  };

  if (state === 'loading') return <Loading />;

  if (state === 'unavailable' || !data || !storefront) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-3 text-lg font-black text-slate-900">This storefront is not available</h1>
          <p className="mt-1 text-sm text-slate-500">It may not be published yet.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/business/${id}`}>Business profile</Link>
            </Button>
            <Button asChild className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
              <Link href="/explore">Explore businesses</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { business } = data;
  const hasTemplate = storefront.owned.length > 0;
  const Layout = { retail: RetailGrid, food: FoodMenu, services: ServicePackages, deals: DealsBoard }[storefront.template];

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/business/${id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> {business.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={share} className="rounded-xl text-xs font-bold">
              <Share2 className="mr-1 h-3.5 w-3.5" /> Share
            </Button>
            {data.canManage && hasTemplate && (
              <Button type="button" variant="outline" size="sm" onClick={downloadQr} className="rounded-xl text-xs font-bold">
                <QrCode className="mr-1 h-3.5 w-3.5" /> QR code
              </Button>
            )}
            {data.canManage && hasTemplate && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPreview((p) => !p)} className="rounded-xl text-xs font-bold">
                {preview ? <><EyeOff className="mr-1 h-3.5 w-3.5" /> Back to editing</> : <><Eye className="mr-1 h-3.5 w-3.5" /> See it as a visitor</>}
              </Button>
            )}
          </div>
        </div>

        {/* Owner's setup bar */}
        {owner && hasTemplate && (
          <div className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between', storefront.published ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
            <div className="text-sm">
              <p className="font-black text-slate-900">
                {storefront.published ? 'Your storefront is live' : 'Your storefront is a draft'}
              </p>
              <p className="text-xs text-slate-600">
                {storefront.published
                  ? 'Visitors see it from your business profile. Changes show straight away.'
                  : 'Only you and VerifiedBizLink staff can see it. Add your items, then publish.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDesignOpen(true)} className="rounded-xl bg-white text-xs font-bold">
                <Palette className="mr-1 h-3.5 w-3.5" /> Design
              </Button>
              <Button type="button" size="sm" onClick={() => setEditing({ ...BLANK_ITEM })} className={cn('rounded-xl text-xs font-extrabold', accent.button)}>
                <Plus className="mr-1 h-4 w-4" /> Add item
              </Button>
            </div>
          </div>
        )}

        {/* No template yet: choose one */}
        {owner && !hasTemplate && (
          <TemplateChooser data={data} businessId={id} onDone={load} inline />
        )}

        {(hasTemplate || !owner) && (
          <>
            {/* Hero */}
            <header className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-r p-6 text-white shadow-md sm:p-10', accent.hero)}>
              {storefront.coverUrl && (
                <>
                  <img src={storefront.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
                </>
              )}
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                  {business.logoUrl ? (
                    <img src={business.logoUrl} alt={business.name} className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/20 bg-white object-cover shadow-md" />
                  ) : (
                    <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-md', accent.chip)}>
                      {business.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-white/80">{business.name}</p>
                      {business.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[11px] font-extrabold">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified business
                        </span>
                      )}
                    </div>
                    <h1 className="mt-1 text-2xl font-black leading-tight sm:text-4xl">{storefront.headline || business.name}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-white/80">{storefront.tagline || business.description || TEMPLATES[storefront.template].blurb}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                      {business.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {business.location}</span>}
                      {business.industry && <span>{business.industry}</span>}
                    </div>
                  </div>
                </div>
                {orderLink(null) && (
                  <Button asChild className="shrink-0 rounded-xl bg-emerald-500 font-extrabold text-white shadow-md hover:bg-emerald-400">
                    <a href={orderLink(null)!} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="mr-1.5 h-4 w-4" /> WhatsApp us
                    </a>
                  </Button>
                )}
              </div>
            </header>

            {storefront.siteUrl && (
              <a href={storefront.siteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xs hover:border-slate-300">
                <span className="flex items-center gap-2 font-bold text-slate-900">
                  <Globe className={cn('h-4 w-4', accent.text)} /> Visit our website{storefront.siteTitle ? `: ${storefront.siteTitle}` : ''}
                </span>
                <span className="text-xs font-semibold text-slate-500">Opens in a new tab</span>
              </a>
            )}

            {categories.length > 2 && storefront.template !== 'food' && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn('shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition', category === cat ? accent.chip : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {shown.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center shadow-xs">
                {(() => {
                  const Icon = TEMPLATES[storefront.template].icon;
                  return <Icon className="mx-auto h-12 w-12 text-slate-300" />;
                })()}
                <h2 className="mt-3 text-lg font-bold text-slate-900">{owner ? 'Add your first item' : 'Nothing listed yet'}</h2>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                  {owner ? 'Products, dishes, packages or deals: each gets a price, an optional special price and a photo.' : 'Check back soon.'}
                </p>
                {owner && (
                  <Button onClick={() => setEditing({ ...BLANK_ITEM })} className={cn('mt-5 rounded-xl font-extrabold', accent.button)}>
                    <Plus className="mr-1 h-4 w-4" /> Add item
                  </Button>
                )}
              </div>
            ) : (
              <Layout items={shown} accent={accent} orderLink={orderLink} contactLink={orderLink(null)} owner={owner} onEdit={setEditing} onDelete={deleteItem} />
            )}

            <p className="pb-2 text-center text-[11px] text-slate-400">
              Hosted on VerifiedBizLink{business.verified ? ' · a verified business' : ''}. Orders and questions go straight to the business on WhatsApp.
            </p>
          </>
        )}
      </div>

      <ItemEditor editing={editing} saving={savingItem} accent={accent} onChange={setEditing} onSave={saveItem} />
      {owner && hasTemplate && (
        <DesignDialog
          open={designOpen}
          onOpenChange={setDesignOpen}
          data={data}
          businessId={id}
          onSaved={(next) => setData((current) => (current ? { ...current, storefront: next } : current))}
          onMoreLayouts={() => {
            setDesignOpen(false);
            setChooserOpen(true);
          }}
        />
      )}
      {owner && hasTemplate && (
        <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
          <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">Storefront templates</DialogTitle>
              <DialogDescription>Each template is a different layout for the same items. Switch between the ones you have in Design.</DialogDescription>
            </DialogHeader>
            <TemplateChooser data={data} businessId={id} onDone={async () => { await load(); setChooserOpen(false); }} />
          </DialogContent>
        </Dialog>
      )}
    </GlassBackground>
  );
}

/* ─── choosing and buying a template ─── */

function TemplateChooser({ data, businessId, onDone, inline = false }: { data: StorefrontData; businessId: string; onDone: () => unknown; inline?: boolean }) {
  const { toast } = useToast();
  const search = useSearchParams();
  const [busy, setBusy] = useState<Template | null>(null);
  const highlighted = search.get('template');

  const get = async (offer: TemplateOffer) => {
    setBusy(offer.id);
    if (offer.yourPrice <= 0) {
      const res = await fetch('/api/business/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', businessId, template: offer.id }),
      }).catch(() => null);
      const result = await res?.json().catch(() => ({}));
      setBusy(null);
      if (!res?.ok) {
        toast({ title: 'Could not add the template', description: result?.error, variant: 'destructive' });
        return;
      }
      toast({ title: `${offer.label} added`, description: 'Now add your items and publish.' });
      await onDone();
      return;
    }
    // Paid: off to PayFast; this page picks the template up on the way back.
    const failure = await startPayfastCheckout({ template: offer.id }, '/api/business/storefront/purchase');
    toast({ title: 'Could not start the payment', description: failure.error, variant: 'destructive' });
    setBusy(null);
  };

  return (
    <section className={cn('space-y-4', inline && 'rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8')}>
      {inline && (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
            <Sparkles className="h-3.5 w-3.5" /> Your storefront on VerifiedBizLink
          </span>
          <h1 className="pt-2 text-2xl font-black text-slate-900">Choose how your storefront looks</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Pick a template, add your products and prices, and publish. It is hosted here, linked from your profile, and every order comes to you on WhatsApp.
            {data.free ? ' As a VerifiedBizLink account, templates are free for you.' : ' You pay once per template.'}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.templates.map((offer) => {
          const meta = TEMPLATES[offer.id];
          const Icon = meta.icon;
          return (
            <article
              key={offer.id}
              className={cn('flex flex-col rounded-2xl border bg-white p-5 transition', highlighted === offer.id ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200')}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-300">
                  <Icon className="h-5 w-5" />
                </span>
                {offer.owned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                    <Check className="h-3.5 w-3.5" /> Yours
                  </span>
                ) : (
                  <div className="text-right">
                    {offer.yourPrice > 0 && offer.yourPrice < offer.listPrice && <p className="text-xs text-slate-400 line-through">{money(offer.listPrice)}</p>}
                    <p className="text-lg font-black text-slate-900">{offer.yourPrice > 0 ? money(offer.yourPrice) : 'Free for you'}</p>
                  </div>
                )}
              </div>
              <h3 className="mt-3 font-extrabold text-slate-900">{offer.label}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600">{meta.blurb}</p>
              {!offer.owned && (
                <Button type="button" onClick={() => get(offer)} disabled={busy !== null} className="mt-4 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
                  {busy === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : offer.yourPrice > 0 ? <>Buy · {money(offer.yourPrice)}</> : 'Add this template'}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-slate-500">
        <Lock className="mr-1 inline h-3 w-3" /> Payments are processed securely by PayFast. A template is yours to keep and edit.
      </p>
    </section>
  );
}

/* ─── design ─── */

function DesignDialog({
  open,
  onOpenChange,
  data,
  businessId,
  onSaved,
  onMoreLayouts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: StorefrontData;
  businessId: string;
  onSaved: (storefront: Storefront) => void;
  onMoreLayouts: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Storefront>(data.storefront);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(data.storefront);
  }, [open, data.storefront]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          businessId,
          template: draft.template,
          headline: draft.headline ?? '',
          tagline: draft.tagline ?? '',
          accent: draft.accent,
          coverUrl: draft.coverUrl ?? '',
          whatsapp: draft.whatsapp ?? '',
          published: draft.published,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Could not save the design', description: result.error, variant: 'destructive' });
        return;
      }
      onSaved(result.storefront);
      toast({ title: result.storefront.published ? 'Saved — your storefront is live' : 'Saved as a draft' });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Design your storefront</DialogTitle>
          <DialogDescription>How it looks to visitors. Your items stay the same whatever the layout.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label className="text-xs font-bold text-slate-700">Layout</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(Object.keys(TEMPLATES) as Template[]).map((key) => {
                const owned = draft.owned.includes(key);
                const Icon = TEMPLATES[key].icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => (owned ? setDraft({ ...draft, template: key }) : onMoreLayouts())}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition',
                      draft.template === key ? 'border-slate-900 bg-slate-900 text-white' : owned ? 'border-slate-200 bg-white hover:border-slate-400' : 'border-dashed border-slate-300 text-slate-400 hover:text-slate-600',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{TEMPLATES[key].label}</span>
                    {!owned && <Lock className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700" htmlFor="sf-headline">Headline</Label>
            <Input id="sf-headline" value={draft.headline ?? ''} maxLength={80} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} placeholder={data.business.name} className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700" htmlFor="sf-tagline">Tagline</Label>
            <Textarea id="sf-tagline" value={draft.tagline ?? ''} maxLength={240} rows={2} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="What you are known for, in a sentence." className="mt-1 rounded-xl" />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700">Colour</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(Object.keys(ACCENTS) as Accent[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  onClick={() => setDraft({ ...draft, accent: key })}
                  className={cn('h-9 w-9 rounded-full ring-offset-2 transition', ACCENTS[key].swatch, draft.accent === key ? 'ring-2 ring-slate-900' : 'hover:scale-105')}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700">Cover photo</Label>
            {draft.coverUrl ? (
              <div className="relative mt-1.5 aspect-[3/1] overflow-hidden rounded-2xl border border-slate-200">
                <img src={draft.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setDraft({ ...draft, coverUrl: null })} className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white hover:bg-rose-600" title="Remove cover">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-1.5">
                <ImageUploader
                  onImageSelect={(url) => setDraft((current) => ({ ...current, coverUrl: url }))}
                  label="Upload a wide photo"
                  buttonClassName="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700" htmlFor="sf-whatsapp">WhatsApp number for orders</Label>
            <Input id="sf-whatsapp" inputMode="tel" value={draft.whatsapp ?? ''} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} placeholder={data.business.phone ?? '082 123 4567'} className="mt-1 rounded-xl" />
            <p className="mt-1 text-[11px] text-slate-500">Leave empty to use your business phone number.</p>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
            <span>
              <span className="block text-sm font-bold text-slate-900">Published</span>
              <span className="block text-xs text-slate-500">Visitors can see it and it is linked from your profile.</span>
            </span>
            <Switch checked={draft.published} onCheckedChange={(published) => setDraft({ ...draft, published })} />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving} className="rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save design'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── items ─── */

function ItemEditor({
  editing,
  saving,
  accent,
  onChange,
  onSave,
}: {
  editing: Partial<Item> | null;
  saving: boolean;
  accent: (typeof ACCENTS)[Accent];
  onChange: (item: Partial<Item> | null) => void;
  onSave: () => void;
}) {
  const set = (patch: Partial<Item>) => onChange(editing ? { ...editing, ...patch } : editing);
  const numberOrNull = (value: string) => (value === '' ? null : Number(value));
  return (
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && !saving && onChange(null)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">{editing?.id ? 'Edit item' : 'Add an item'}</DialogTitle>
        </DialogHeader>
        {editing && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-700" htmlFor="it-title">Name</Label>
              <Input id="it-title" value={editing.title ?? ''} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Burger combo, Logo design, Winter jacket" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700" htmlFor="it-category">Section</Label>
              <Input id="it-category" value={editing.category ?? ''} maxLength={40} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Mains, Drinks, Packages, Clearance" className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700" htmlFor="it-price">Price (R)</Label>
                <Input id="it-price" type="number" min="0" step="0.01" inputMode="decimal" value={editing.priceRand ?? ''} onChange={(e) => set({ priceRand: numberOrNull(e.target.value) ?? undefined })} placeholder="150" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700" htmlFor="it-special">Special price (R)</Label>
                <Input id="it-special" type="number" min="0" step="0.01" inputMode="decimal" value={editing.specialPriceRand ?? ''} onChange={(e) => set({ specialPriceRand: numberOrNull(e.target.value) })} placeholder="Optional" className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700" htmlFor="it-description">Description</Label>
              <Textarea id="it-description" value={editing.description ?? ''} maxLength={1500} rows={4} onChange={(e) => set({ description: e.target.value })} placeholder="What it is. For packages, put each thing included on its own line." className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Photo</Label>
              {editing.imageUrl ? (
                <div className="relative mt-1.5 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img src={editing.imageUrl} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set({ imageUrl: '' })} className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white hover:bg-rose-600" title="Remove photo">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-1.5">
                  <ImageUploader
                    onImageSelect={(url) => set({ imageUrl: url })}
                    label="Upload a photo"
                    buttonClassName="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                  />
                </div>
              )}
            </div>
            <label className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span>
                <span className="block text-xs font-bold text-slate-900">Featured</span>
                <span className="block text-[11px] text-slate-500">Shown first, with a highlight.</span>
              </span>
              <Switch checked={editing.isFeatured === true} onCheckedChange={(isFeatured) => set({ isFeatured })} />
            </label>
            <label className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span>
                <span className="block text-xs font-bold text-slate-900">Available</span>
                <span className="block text-[11px] text-slate-500">Switch off when it is sold out.</span>
              </span>
              <Switch checked={editing.isInStock !== false} onCheckedChange={(isInStock) => set({ isInStock })} />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onChange(null)} className="rounded-xl" disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={saving} className={cn('rounded-xl font-extrabold', accent.button)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── the four layouts ─── */

interface LayoutProps {
  items: Item[];
  accent: (typeof ACCENTS)[Accent];
  orderLink: (item: Item) => string | null;
  /** WhatsApp without a particular item, or null when the business has no number. */
  contactLink: string | null;
  owner: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

function OwnerControls({ item, owner, onEdit, onDelete, dark = false }: { item: Item; owner: boolean; onEdit: (item: Item) => void; onDelete: (item: Item) => void; dark?: boolean }) {
  if (!owner) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => onEdit(item)} className={cn('rounded-lg p-2', dark ? 'text-white/70 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')} title="Edit">
        <Edit3 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onDelete(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Remove">
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  );
}

function OrderButton({ item, orderLink, accent, label = 'Order on WhatsApp', className }: { item: Item; orderLink: (item: Item) => string | null; accent: (typeof ACCENTS)[Accent]; label?: string; className?: string }) {
  const href = orderLink(item);
  if (!href || !item.isInStock) return null;
  return (
    <Button asChild size="sm" className={cn('rounded-xl text-xs font-extrabold', accent.button, className)}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageSquare className="mr-1 h-3.5 w-3.5" /> {label}
      </a>
    </Button>
  );
}

function Price({ item, accent, large = false }: { item: Item; accent: (typeof ACCENTS)[Accent]; large?: boolean }) {
  const special = item.specialPriceRand !== null && item.specialPriceRand < item.priceRand;
  return special ? (
    <span className="flex items-baseline gap-2">
      <span className={cn('font-black', accent.text, large ? 'text-3xl' : 'text-lg')}>{money(item.specialPriceRand!)}</span>
      <span className="text-xs text-slate-400 line-through">{money(item.priceRand)}</span>
    </span>
  ) : (
    <span className={cn('font-black text-slate-900', large ? 'text-3xl' : 'text-lg')}>{money(item.priceRand)}</span>
  );
}

/** Retail: a photo grid. */
function RetailGrid({ items, accent, orderLink, owner, onEdit, onDelete }: LayoutProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.id} className={cn('group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md', item.isFeatured ? cn('ring-2', accent.ring) : 'border-slate-200')}>
          <div className="relative aspect-square bg-slate-100">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} loading="lazy" className={cn('h-full w-full object-cover transition duration-300 group-hover:scale-105', !item.isInStock && 'grayscale')} />
            ) : (
              <div className={cn('flex h-full items-center justify-center', accent.soft)}>
                <ShoppingBag className={cn('h-10 w-10 opacity-40', accent.text)} />
              </div>
            )}
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {item.isFeatured && <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase', accent.chip)}>Featured</span>}
              {item.specialPriceRand !== null && item.specialPriceRand < item.priceRand && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">Sale</span>
              )}
            </div>
            {!item.isInStock && <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 py-1.5 text-center text-xs font-bold text-white">Sold out</span>}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-extrabold text-slate-900">{item.title}</h3>
              <OwnerControls item={item} owner={owner} onEdit={onEdit} onDelete={onDelete} />
            </div>
            {item.description && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.description}</p>}
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <Price item={item} accent={accent} />
              <OrderButton item={item} orderLink={orderLink} accent={accent} label="Order" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Food: a menu by section, specials first. */
function FoodMenu({ items, accent, contactLink, owner, onEdit, onDelete }: LayoutProps) {
  const specials = items.filter((item) => item.isFeatured);
  const sections = Array.from(new Set(items.map((item) => item.category || 'Menu')));
  return (
    <div className="space-y-6">
      {specials.length > 0 && (
        <section className={cn('rounded-3xl p-5 sm:p-6', accent.soft)}>
          <h2 className={cn('flex items-center gap-2 text-sm font-black uppercase tracking-wider', accent.text)}>
            <Flame className="h-4 w-4" /> Today’s specials
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specials.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-xs">
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <OwnerControls item={item} owner={owner} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                  {item.description && <p className="line-clamp-2 text-xs text-slate-600">{item.description}</p>}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <Price item={item} accent={accent} />
                    {!item.isInStock && <span className="text-[11px] font-bold text-rose-600">Sold out</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-8">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          {sections.map((section) => (
            <section key={section}>
              <h2 className="border-b-2 border-slate-900 pb-2 text-lg font-black uppercase tracking-wide text-slate-900">{section}</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {items
                  .filter((item) => (item.category || 'Menu') === section)
                  .map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className={cn('font-bold text-slate-900', !item.isInStock && 'text-slate-400 line-through')}>{item.title}</h3>
                          <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-slate-300" />
                          <Price item={item} accent={accent} />
                        </div>
                        {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}
                        {!item.isInStock && <p className="text-[11px] font-bold text-rose-600">Not available today</p>}
                      </div>
                      <OwnerControls item={item} owner={owner} onEdit={onEdit} onDelete={onDelete} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
        {contactLink && (
          <div className="mt-8 flex justify-center">
            <Button asChild className={cn('rounded-xl px-6 font-extrabold', accent.button)}>
              <a href={contactLink} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-1.5 h-4 w-4" /> Order from the menu on WhatsApp
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Services: packages side by side, with what each includes. */
function ServicePackages({ items, accent, orderLink, owner, onEdit, onDelete }: LayoutProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const lines = (item.description ?? '').split('\n').map((line) => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
        const intro = lines[0] ?? '';
        const included = lines.slice(1);
        return (
          <article key={item.id} className={cn('relative flex flex-col rounded-3xl border bg-white p-6 shadow-xs', item.isFeatured ? cn('ring-2', accent.ring) : 'border-slate-200')}>
            {item.isFeatured && <span className={cn('absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-black uppercase', accent.chip)}>Most popular</span>}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn('text-[11px] font-bold uppercase tracking-wider', accent.text)}>{item.category}</p>
                <h3 className="mt-0.5 text-lg font-black text-slate-900">{item.title}</h3>
              </div>
              <OwnerControls item={item} owner={owner} onEdit={onEdit} onDelete={onDelete} />
            </div>
            <div className="mt-4">
              <Price item={item} accent={accent} large />
            </div>
            {intro && <p className="mt-3 text-sm text-slate-600">{intro}</p>}
            {included.length > 0 && (
              <ul className="mt-4 space-y-2">
                {included.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', accent.text)} /> {line}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-6">
              {item.isInStock ? (
                <OrderButton item={item} orderLink={orderLink} accent={accent} label="Book on WhatsApp" className="w-full" />
              ) : (
                <p className="rounded-xl bg-slate-100 py-2 text-center text-xs font-bold text-slate-500">Fully booked</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Deals: the biggest saving first, big badges. */
function DealsBoard({ items, accent, orderLink, owner, onEdit, onDelete }: LayoutProps) {
  const saving = (item: Item) => (item.specialPriceRand !== null && item.priceRand > 0 ? Math.round(((item.priceRand - item.specialPriceRand) / item.priceRand) * 100) : 0);
  const sorted = [...items].sort((a, b) => Number(b.isInStock) - Number(a.isInStock) || Number(b.isFeatured) - Number(a.isFeatured) || saving(b) - saving(a));
  const [hero, ...rest] = sorted;
  return (
    <div className="space-y-5">
      {hero && (
        <article className="relative grid overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg md:grid-cols-2">
          <div className="relative min-h-56 bg-slate-800">
            {hero.imageUrl && <img src={hero.imageUrl} alt={hero.title} className="absolute inset-0 h-full w-full object-cover" />}
            {saving(hero) > 0 && (
              <span className={cn('absolute left-4 top-4 flex h-20 w-20 -rotate-12 flex-col items-center justify-center rounded-full text-center font-black shadow-lg', accent.chip)}>
                <span className="text-2xl leading-none">{saving(hero)}%</span>
                <span className="text-[10px] uppercase">off</span>
              </span>
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-white/60">{hero.isFeatured ? 'Deal of the day' : 'Top deal'}</span>
              <OwnerControls item={hero} owner={owner} onEdit={onEdit} onDelete={onDelete} dark />
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">{hero.title}</h2>
            {hero.description && <p className="text-sm text-white/70">{hero.description}</p>}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black">{money(hero.specialPriceRand ?? hero.priceRand)}</span>
              {hero.specialPriceRand !== null && <span className="text-lg text-white/50 line-through">{money(hero.priceRand)}</span>}
            </div>
            {hero.isInStock ? (
              <OrderButton item={hero} orderLink={orderLink} accent={accent} label="Claim this deal" className="w-fit px-5" />
            ) : (
              <span className="w-fit rounded-xl bg-white/10 px-4 py-2 text-sm font-bold">Sold out</span>
            )}
          </div>
        </article>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((item) => (
          <article key={item.id} className={cn('relative flex gap-4 overflow-hidden rounded-2xl border bg-white p-4 shadow-xs', !item.isInStock && 'opacity-60', item.isFeatured ? cn('ring-2', accent.ring) : 'border-slate-200')}>
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" /> : <Zap className={cn('m-8 h-8 w-8 opacity-40', accent.text)} />}
              {saving(item) > 0 && <span className="absolute left-1 top-1 rounded-md bg-rose-500 px-1.5 py-0.5 text-[11px] font-black text-white">-{saving(item)}%</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                <OwnerControls item={item} owner={owner} onEdit={onEdit} onDelete={onDelete} />
              </div>
              <Price item={item} accent={accent} />
              <div className="mt-auto pt-2">
                {item.isInStock ? <OrderButton item={item} orderLink={orderLink} accent={accent} label="Claim" /> : <span className="text-xs font-black uppercase text-rose-600">Sold out</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
