'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Pause, Play, Loader2, Coins, Megaphone, History,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta_text: string;
  cta_url: string | null;
  badge: string | null;
  is_boosted: boolean;
  is_active: boolean;
  boost_expires_at: string | null;
  created_at: string;
  expires_at: string | null;
  duration_days: number | null;
  impressions: number;
  clicks: number;
  slot_placement?: string;
  image_url?: string | null;
  credits_spent?: number;
  status?: string;
}

interface CreditPack { id: string; credits: number; price: number; label: string }
interface CreditTx { id: string; delta: number; balanceAfter: number; kind: string; note: string | null; createdAt: string }

const TX_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  monthly_allowance: 'Monthly allowance',
  admin_adjustment: 'Adjustment',
  ad_spend: 'Ad campaign',
  refund: 'Refund',
};

// Display defaults only. The server sends the live prices and packs; these
// are what shows for the split second before that response arrives.
const SLOT_OPTIONS = [
  { id: 'feed_inline', label: 'In-Feed Sponsored Post', cost: 5, desc: 'Displayed directly between timeline posts on the main feed.' },
  { id: 'top_banner', label: 'Top Header Featured Banner', cost: 10, desc: 'High-impact banner pinned at the top of Explore & Marketplace.' },
  { id: 'sidebar_spotlight', label: 'Sidebar Recommended Spotlight', cost: 15, desc: 'Featured permanently on the right-hand sidebar of desktop & tablets.' },
];

const DURATION_PRESETS = [3, 7, 14, 30];

const DEFAULT_PACKS: CreditPack[] = [
  { id: 'starter', credits: 50, price: 49, label: 'Starter Pack' },
  { id: 'popular', credits: 150, price: 129, label: 'Most Popular (Save 15%)' },
  { id: 'value', credits: 400, price: 299, label: 'Best Value (Save 25%)' },
];

export default function BusinessAdsPage() {
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    durationDays: 7,
    slotPlacement: 'feed_inline',
    imageUrl: '',
  });

  const [adCredits, setAdCredits] = useState(0);
  const [buyingCredits, setBuyingCredits] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_PACKS);
  const [history, setHistory] = useState<CreditTx[]>([]);
  const [hasBusiness, setHasBusiness] = useState(true);
  const slotOptions = SLOT_OPTIONS.map((o) => ({ ...o, cost: rates?.[o.id] ?? o.cost }));

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/business/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
        setAdCredits(Number(data.adCredits) || 0);
        if (data.rates) setRates(data.rates);
        if (Array.isArray(data.packs) && data.packs.length) setPacks(data.packs);
        setHistory(Array.isArray(data.history) ? data.history : []);
        setHasBusiness(data.hasBusiness !== false);
      }
    } catch {
      /* keep previous state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const selectedSlot = slotOptions.find((s) => s.id === formData.slotPlacement) || slotOptions[0];
  const totalRequiredCredits = formData.durationDays * selectedSlot.cost;
  const hasEnoughCredits = adCredits >= totalRequiredCredits;

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({ title: 'Title and description are required', variant: 'destructive' });
      return;
    }
    if (!hasEnoughCredits) {
      toast({
        title: 'Not enough ad credits',
        description: `This campaign requires ${totalRequiredCredits} credits. Please top up your balance below.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          title: '',
          description: '',
          ctaText: 'Learn More',
          ctaUrl: '',
          durationDays: 7,
          slotPlacement: 'feed_inline',
          imageUrl: '',
        });
        setShowCreateForm(false);
        setAdCredits(data.adCredits ?? adCredits);
        toast({ title: 'Sponsored campaign launched successfully!' });
        fetchAds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not create ad', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/business/ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentlyActive }),
      });
      if (res.ok) {
        toast({ title: currentlyActive ? 'Campaign paused' : 'Campaign activated' });
        fetchAds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not update campaign', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not toggle ad', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad? Credits already spent on it are not refunded.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/ads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Ad deleted' });
        setAds((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      toast({ title: 'Could not delete ad', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBuyCredits = async (pack: CreditPack) => {
    setBuyingCredits(pack.id);
    try {
      const res = await fetch('/api/payfast/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The server prices the pack; amount is only a fallback for old servers.
        body: JSON.stringify({
          packId: pack.id,
          amount: pack.price,
          description: `${pack.credits} Ad Credits`,
          purchaseType: 'ad_credits_topup',
        }),
      });
      const data = await res.json();
      if (res.ok && data.payfastUrl) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfastUrl;
        Object.entries(data.data).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        });
        const sig = document.createElement('input');
        sig.type = 'hidden';
        sig.name = 'signature';
        sig.value = data.signature;
        form.appendChild(sig);
        document.body.appendChild(form);
        form.submit();
      } else {
        toast({ title: 'Payment initiation error', description: data.error, variant: 'destructive' });
        setBuyingCredits(null);
      }
    } catch {
      toast({ title: 'Payment server error', variant: 'destructive' });
      setBuyingCredits(null);
    }
  };

  return (
    <GlassBackground>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/business/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Business Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Megaphone className="h-7 w-7 text-amber-500" />
              Ad Manager &amp; Sponsored Listings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Boost your reach, acquire new clients, and showcase your business across high-traffic placement slots.
            </p>
          </div>

          {/* Credits Badge & Topup */}
          <div className="flex items-center gap-3 bg-white border border-amber-300 rounded-2xl p-2.5 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-950 font-bold">
              <Coins className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">AVAILABLE BALANCE</span>
              <p className="text-xl font-black text-amber-950">{adCredits} Credits</p>
            </div>
          </div>
        </div>

        {/* Credit Top-up Row */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Coins className="h-4.5 w-4.5 text-amber-500" />
              Top Up Ad Credits (Instant Activation via PayFast)
            </h3>
            <span className="text-xs text-slate-500 font-medium">Credits are added as soon as PayFast confirms payment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-all"
              >
                <div>
                  <Badge variant="outline" className="text-[10px] font-extrabold text-amber-900 border-amber-300 bg-amber-50">
                    {pack.label}
                  </Badge>
                  <p className="text-2xl font-black text-slate-900 mt-2">{pack.credits} Credits</p>
                  <p className="text-xs text-slate-500">Total: R{pack.price}</p>
                </div>
                <Button
                  onClick={() => handleBuyCredits(pack)}
                  disabled={buyingCredits !== null}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                >
                  {buyingCredits === pack.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Buy {pack.credits} Credits
                </Button>
              </div>
            ))}
          </div>
        </div>

        {!loading && !hasBusiness && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            You need a business profile before you can buy credits or run ads.{' '}
            <Link href="/onboarding" className="font-bold underline underline-offset-2">Create your business profile</Link>
          </div>
        )}

        {/* Credit history: every purchase, allowance, spend and refund, newest first. */}
        {history.length > 0 && (
          <details className="group rounded-2xl border border-slate-200 bg-white shadow-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
              <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <History className="h-4 w-4 text-slate-500" /> Credit history
              </span>
              <span className="text-xs font-semibold text-slate-500 group-open:hidden">Show</span>
              <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Hide</span>
            </summary>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {history.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{TX_LABELS[tx.kind] ?? tx.kind}</p>
                    <p className="truncate text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black ${tx.delta > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.delta > 0 ? '+' : ''}{tx.delta}
                    </p>
                    <p className="text-[11px] text-slate-400">Balance {tx.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Campaign Creation / List Action */}
        <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <h2 className="text-lg font-black text-slate-900">Your Active &amp; Past Campaigns</h2>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full min-[480px]:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-2 rounded-xl shadow-xs"
          >
            {showCreateForm ? 'Cancel Campaign' : <><Plus className="h-4 w-4" /> Create New Sponsored Ad</>}
          </Button>
        </div>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <Card className="border border-amber-300 bg-white rounded-2xl p-6 shadow-md animate-in fade-in space-y-6">
            <form onSubmit={handleCreateAd} className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Campaign Details &amp; Placement Slot</h3>
                <p className="text-xs text-slate-500">Customize where and how your sponsored ad is delivered.</p>
              </div>

              {/* Placement Slot Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Choose Placement Slot *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {slotOptions.map((opt) => {
                    const isSelected = formData.slotPlacement === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setFormData({ ...formData, slotPlacement: opt.id })}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{opt.label}</span>
                          <span className="text-xs font-black text-amber-700">{opt.cost} credits/day</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Headline / Ad Title *</label>
                  <Input
                    placeholder="e.g. 20% Off All Solar Installations This Month"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Call-to-Action Text</label>
                  <Input
                    placeholder="e.g. Get Quote, Book Now, Shop Deals"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Ad Copy &amp; Offer Description *</label>
                <Textarea
                  placeholder="Describe your special promotion, service benefits, and why customers should choose you..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-xs min-h-[80px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Destination Link / Website URL</label>
                  <Input
                    placeholder="https://yourwebsite.co.za/promo"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Creative Image / Banner URL (Optional)</label>
                  <Input
                    placeholder="https://... or upload photo"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                  />
                </div>
              </div>

              {/* Duration Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Campaign Duration (Days)</label>
                <div className="flex flex-wrap items-center gap-2">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, durationDays: d })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.durationDays === d
                          ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800">
                    Duration: <strong className="text-slate-900">{formData.durationDays} Days</strong> × {selectedSlot.cost} credits/day ({selectedSlot.label})
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your balance: <strong className="text-slate-900">{adCredits} credits</strong> · Required: <strong className="text-amber-950">{totalRequiredCredits} credits</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-amber-950 text-xl block">
                    {totalRequiredCredits} Credits Total
                  </span>
                  {!hasEnoughCredits && (
                    <span className="text-[11px] font-bold text-red-600">
                      Need {totalRequiredCredits - adCredits} more credits
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !hasEnoughCredits}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Launch Campaign
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Ads List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
            Loading campaigns…
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <Megaphone className="h-10 w-10 text-amber-500 mx-auto" />
            <h3 className="font-extrabold text-base text-slate-900">No campaigns created yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create your first sponsored ad to appear in the Feed, Top Banner, or Sidebar spotlight and drive direct verified inquiries.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-xs text-xs"
            >
              Launch First Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => {
              const isExpired = ad.expires_at ? new Date(ad.expires_at) < new Date() : false;
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={ad.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-amber-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900">{ad.title}</h3>
                        <Badge
                          variant={ad.is_active && !isExpired ? 'default' : 'secondary'}
                          className={ad.is_active && !isExpired ? 'bg-emerald-500 text-white font-bold text-[10px]' : 'text-[10px] font-bold'}
                        >
                          {ad.is_active && !isExpired ? 'Active' : isExpired ? 'Completed' : 'Paused'}
                        </Badge>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          {ad.slot_placement?.replace('_', ' ') || 'In-Feed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{ad.description}</p>
                    </div>

                    {/* Analytics Pills */}
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">VIEWS</span>
                        <span className="font-extrabold text-slate-900">{ad.impressions.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">CLICKS</span>
                        <span className="font-extrabold text-blue-600">{ad.clicks.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">CTR</span>
                        <span className="font-extrabold text-emerald-600">{ctr}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                      <span>Created: {new Date(ad.created_at).toLocaleDateString('en-ZA')}</span>
                      <span>Expires: <strong className={isExpired ? 'text-red-500' : 'text-slate-800'}>{ad.expires_at ? new Date(ad.expires_at).toLocaleDateString('en-ZA') : '—'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingId === ad.id || isExpired}
                        onClick={() => handleToggleActive(ad.id, ad.is_active)}
                        className="h-8 text-xs font-bold gap-1 rounded-xl"
                      >
                        {ad.is_active ? <Pause className="h-3.5 w-3.5 text-amber-500" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                        {ad.is_active ? 'Pause' : 'Resume'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deletingId === ad.id}
                        onClick={() => handleDelete(ad.id)}
                        className="h-8 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
