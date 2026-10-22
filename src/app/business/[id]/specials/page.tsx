'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2,
  MapPin, MessageSquare, Plus, Share2, ShieldCheck, Sparkles,
  Trash2, Edit3, ShoppingBag, Utensils, Briefcase, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';
import { cn } from '@/lib/utils';

interface ShowcaseItem {
  id: string;
  template: 'retail' | 'food' | 'services' | 'deals';
  title: string;
  description: string | null;
  priceRand: number;
  specialPriceRand: number | null;
  category: string;
  imageUrl: string | null;
  isInStock: boolean;
  isFeatured: boolean;
}

interface BusinessInfo {
  id: string;
  name: string;
  status: string;
  logoUrl: string | null;
  trustScore: number | null;
  phone: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
}

const TEMPLATE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  retail: { label: 'Retail & Product Catalog', icon: ShoppingBag, description: 'Products, prices, discounts & WhatsApp ordering' },
  food: { label: 'Restaurant & Menu Deals', icon: Utensils, description: 'Dishes, chef specials, daily menus & dining deals' },
  services: { label: 'Services & Pricing Packages', icon: Briefcase, description: 'Service tiers, hourly/fixed packages & consultations' },
  deals: { label: 'Flash Deals & Promotions', icon: Zap, description: 'Limited-time discounts, clearance & special offers' },
};

export default function BusinessSpecialsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { toast } = useToast();

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [template, setTemplate] = useState<string>('retail');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Modal editor
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<ShowcaseItem> | null>(null);
  const [savingItem, setSavingItem] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/showcase?businessId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setBusiness(data.business);
        setItems(data.items || []);
        setTemplate(data.template || 'retail');
        setIsOwner(data.isOwner === true);
      } else {
        toast({ title: 'Could not load showcase', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Connection error', description: 'Failed to load showcase', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = ['All', ...Array.from(new Set(items.map((it) => it.category).filter(Boolean)))];

  const filteredItems = items.filter((it) => activeCategory === 'All' || it.category === activeCategory);

  const handleSaveItem = async () => {
    if (!editingItem?.title || editingItem.priceRand === undefined) {
      toast({ title: 'Please provide a title and regular price', variant: 'destructive' });
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch('/api/business/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_item',
          businessId: id,
          item: { ...editingItem, template },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Product / Special saved!' });
        setEditorOpen(false);
        setEditingItem(null);
        loadData();
      } else {
        toast({ title: 'Failed to save', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not save item', variant: 'destructive' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      const res = await fetch('/api/business/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', businessId: id, itemId }),
      });
      if (res.ok) {
        toast({ title: 'Item removed' });
        setItems((prev) => prev.filter((it) => it.id !== itemId));
      }
    } catch {
      toast({ title: 'Error deleting item', variant: 'destructive' });
    }
  };

  const handleSwitchTemplate = async (tmpl: string) => {
    setTemplate(tmpl);
    try {
      await fetch('/api/business/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_template', businessId: id, template: tmpl }),
      });
      toast({ title: `Theme switched to ${TEMPLATE_CONFIG[tmpl]?.label}` });
    } catch {
      /* ignore */
    }
  };

  const sharePage = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Showcase link copied to clipboard.' });
    }
  };

  const formatWhatsAppOrder = (item: ShowcaseItem) => {
    const phone = (business?.phone || '').replace(/[^0-9]/g, '');
    const priceText = item.specialPriceRand ? `R${item.specialPriceRand} (Special)` : `R${item.priceRand}`;
    const text = encodeURIComponent(
      `Hi ${business?.name}! I found your specials on VerifiedBizLink: I'd like to order / inquire about "${item.title}" for ${priceText}.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white p-8 rounded-3xl border border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Showcase not found</h2>
          <Button asChild className="mt-4 rounded-xl bg-amber-400 font-bold text-slate-950">
            <Link href="/explore">Explore Verified Businesses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const TemplateIcon = TEMPLATE_CONFIG[template]?.icon || ShoppingBag;

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/business/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Business Profile
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sharePage}
              className="rounded-xl border-slate-300 text-xs font-bold text-slate-800"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" /> Share Showcase
            </Button>

            {isOwner && (
              <Button
                onClick={() => {
                  setEditingItem({
                    template: template as ShowcaseItem['template'],
                    title: '',
                    description: '',
                    priceRand: 0,
                    specialPriceRand: null,
                    category: 'General',
                    imageUrl: '',
                    isInStock: true,
                    isFeatured: false,
                  });
                  setEditorOpen(true);
                }}
                className="rounded-xl bg-amber-400 text-xs font-extrabold text-slate-950 hover:bg-amber-300 shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Product / Special
              </Button>
            )}
          </div>
        </div>

        {/* Business Header Banner */}
        <header className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-md sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-white/20 bg-white shadow-md"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl shadow-md">
                  {business.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-white sm:text-3xl">{business.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/50 px-2.5 py-0.5 text-xs font-extrabold text-amber-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> CIPC Verified
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm max-w-xl">
                  {business.description || 'Welcome to our official digital catalog and specials showcase.'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {business.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> {business.location}
                    </span>
                  )}
                  {business.industry && <span>· {business.industry}</span>}
                  <span className="text-emerald-400 font-bold">· Hosted on VerifiedBizLink</span>
                </div>
              </div>
            </div>

            {business.phone && (
              <Button asChild className="rounded-xl bg-emerald-500 hover:bg-emerald-400 font-extrabold text-white shadow-md">
                <a
                  href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${business.name}, I'm contacting you via your VerifiedBizLink showcase!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp Business
                </a>
              </Button>
            )}
          </div>

          {/* Owner Template Selector Bar */}
          {isOwner && (
            <div className="mt-6 border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TemplateIcon className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Choose Showcase Style:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TEMPLATE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSwitchTemplate(key)}
                    className={cn(
                      'rounded-xl px-3 py-1 text-xs font-bold transition-all',
                      template === key
                        ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Categories Bar */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  activeCategory === cat
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-xs">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">No items listed in this showcase yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {isOwner
                ? 'Click "Add Product / Special" to showcase your products, prices, and exclusive deals.'
                : 'This business has not posted any products or specials yet.'}
            </p>
            {isOwner && (
              <Button
                onClick={() => {
                  setEditingItem({
                    template: template as ShowcaseItem['template'],
                    title: '',
                    description: '',
                    priceRand: 0,
                    specialPriceRand: null,
                    category: 'General',
                    imageUrl: '',
                    isInStock: true,
                    isFeatured: false,
                  });
                  setEditorOpen(true);
                }}
                className="mt-5 rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Your First Special
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const hasDiscount = item.specialPriceRand !== null && item.specialPriceRand < item.priceRand;
              const savingRand = hasDiscount ? item.priceRand - (item.specialPriceRand ?? 0) : 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-md',
                    item.isFeatured ? 'border-amber-400/90 ring-1 ring-amber-400/50' : 'border-slate-200/90'
                  )}
                >
                  {/* Image or Category Fallback */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 text-amber-700 font-bold">
                        <TemplateIcon className="h-10 w-10 text-amber-500/50" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute left-3 top-3 flex flex-col gap-1.5 items-start">
                      {item.isFeatured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
                          <Sparkles className="h-3 w-3" /> Featured Special
                        </span>
                      )}
                      {hasDiscount && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                          Save R{savingRand}
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-2.5 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {item.category}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          {hasDiscount ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-emerald-600">
                                R{item.specialPriceRand}
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                R{item.priceRand}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-slate-900">
                              R{item.priceRand}
                            </span>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-[11px] font-extrabold',
                            item.isInStock ? 'text-emerald-700' : 'text-rose-600'
                          )}
                        >
                          {item.isInStock ? '● In Stock' : 'Out of stock'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-2">
                        {business.phone ? (
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 shadow-xs text-xs"
                          >
                            <a
                              href={formatWhatsAppOrder(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Order / Inquire
                            </a>
                          </Button>
                        ) : null}

                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setEditorOpen(true);
                              }}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit item"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 20% Partner / Commission Transparency Notice */}
        <section className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-6 text-xs text-slate-600">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 font-black text-amber-950 uppercase tracking-wide">
              <ShieldCheck className="h-4 w-4 text-amber-600" /> VerifiedBizLink Showcase Infrastructure
            </div>
            <span className="font-bold text-amber-900">Platform Share: 20% · Business Retains 80%</span>
          </div>
          <p className="mt-2 text-slate-600 leading-relaxed max-w-4xl">
            This showcase is hosted and cryptographically secured on the VerifiedBizLink network. Business owners can post their products, specials, and menus directly, complete with live WhatsApp lead routing and verified customer trust badges.
          </p>
        </section>

        {/* Modal: Add / Edit Showcase Item */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                {editingItem?.id ? 'Edit Product / Special' : 'Add New Product / Special'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Item Title</Label>
                <Input
                  value={editingItem?.title || ''}
                  onChange={(e) => setEditingItem((it) => ({ ...it, title: e.target.value }))}
                  placeholder="e.g. Deluxe Burger Combo or Web Design Package"
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Category</Label>
                <Input
                  value={editingItem?.category || ''}
                  onChange={(e) => setEditingItem((it) => ({ ...it, category: e.target.value }))}
                  placeholder="e.g. Food, Electronics, Services, Specials"
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Regular Price (R)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingItem?.priceRand || ''}
                    onChange={(e) => setEditingItem((it) => ({ ...it, priceRand: Number(e.target.value) }))}
                    placeholder="150"
                    className="mt-1 rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Special / Sale Price (R)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingItem?.specialPriceRand || ''}
                    onChange={(e) => setEditingItem((it) => ({ ...it, specialPriceRand: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Optional sale price"
                    className="mt-1 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Description / Details</Label>
                <Textarea
                  value={editingItem?.description || ''}
                  onChange={(e) => setEditingItem((it) => ({ ...it, description: e.target.value }))}
                  placeholder="Tell customers about the ingredients, features, or what is included."
                  rows={3}
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Image URL (Optional)</Label>
                <Input
                  value={editingItem?.imageUrl || ''}
                  onChange={(e) => setEditingItem((it) => ({ ...it, imageUrl: e.target.value }))}
                  placeholder="https://example.com/product.jpg"
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">Mark as Featured Special</p>
                  <p className="text-[11px] text-slate-500">Displays with glowing badge at top of page</p>
                </div>
                <Switch
                  checked={Boolean(editingItem?.isFeatured)}
                  onCheckedChange={(checked) => setEditingItem((it) => ({ ...it, isFeatured: checked }))}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">In Stock / Available</p>
                  <p className="text-[11px] text-slate-500">Uncheck if temporarily sold out</p>
                </div>
                <Switch
                  checked={editingItem?.isInStock !== false}
                  onCheckedChange={(checked) => setEditingItem((it) => ({ ...it, isInStock: checked }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={savingItem}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 shadow-xs"
                >
                  {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Item'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </GlassBackground>
  );
}
