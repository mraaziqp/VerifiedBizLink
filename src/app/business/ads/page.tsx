'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Zap, Trash2, Pause, Play, Loader2, Sparkles, Eye, MousePointerClick, Pencil, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

const BOOST_PRICE = 100;
const AD_CREDIT_PRICE_PER_DAY = 10;
const DURATION_PRESETS = [7, 14, 30, 60];
const CREDIT_PACKS = [
  { days: 10, price: 10 * AD_CREDIT_PRICE_PER_DAY },
  { days: 30, price: 30 * AD_CREDIT_PRICE_PER_DAY },
  { days: 60, price: 60 * AD_CREDIT_PRICE_PER_DAY },
];

export default function BusinessAdsPage() {
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [limit, setLimit] = useState(0);
  const [active, setActive] = useState(0);
  const [packageType, setPackageType] = useState('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [boostingId, setBoostingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', ctaText: 'Learn More', ctaUrl: '', durationDays: 14 });
  const [adCredits, setAdCredits] = useState(0);
  const [buyingCredits, setBuyingCredits] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', ctaText: '', ctaUrl: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/business/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
        setLimit(data.limit || 0);
        setActive(data.active || 0);
        setPackageType(data.packageType || 'free');
        setAdCredits(data.adCredits || 0);
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleCreateAd = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/business/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ title: '', description: '', ctaText: 'Learn More', ctaUrl: '', durationDays: 14 });
        setShowCreateForm(false);
        setAdCredits(data.adCredits ?? adCredits);
        toast({ title: 'Ad created' });
        fetchAds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not create ad', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not create ad', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBuyCredits = async (days: number, price: number) => {
    setBuyingCredits(days);
    try {
      const res = await fetch('/api/payfast/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          description: `${days} Ad-Day Credits`,
          purchaseType: 'ad_credits_topup',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start payment');
      }
      const { payfastUrl, data, signature } = await res.json();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payfastUrl;
      Object.keys(data).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(data[key]);
        form.appendChild(input);
      });
      const sigInput = document.createElement('input');
      sigInput.type = 'hidden';
      sigInput.name = 'signature';
      sigInput.value = signature;
      form.appendChild(sigInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast({ title: 'Could not start payment', description: err.message, variant: 'destructive' });
      setBuyingCredits(null);
    }
  };

  const handleToggleStatus = async (ad: Ad) => {
    setTogglingId(ad.id);
    try {
      const res = await fetch(`/api/business/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.is_active }),
      });
      if (res.ok) {
        fetchAds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not update ad', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update ad', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteAd = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/ads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAds((prev) => prev.filter((a) => a.id !== id));
        toast({ title: 'Ad deleted' });
      } else {
        toast({ title: 'Could not delete ad', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not delete ad', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (ad: Ad) => {
    setEditingId(ad.id);
    setEditFormData({
      title: ad.title,
      description: ad.description,
      ctaText: ad.cta_text || 'Learn More',
      ctaUrl: ad.cta_url || '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editFormData.title.trim() || !editFormData.description.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/business/ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        setEditingId(null);
        toast({ title: 'Ad updated' });
        fetchAds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not update ad', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update ad', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBoostAd = async (ad: Ad) => {
    setBoostingId(ad.id);
    try {
      const res = await fetch('/api/payfast/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: BOOST_PRICE,
          description: `Boost Ad: ${ad.title}`,
          adId: ad.id,
          purchaseType: 'ad_boost',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start payment');
      }
      const { payfastUrl, data, signature } = await res.json();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payfastUrl;
      Object.keys(data).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(data[key]);
        form.appendChild(input);
      });
      const sigInput = document.createElement('input');
      sigInput.type = 'hidden';
      sigInput.name = 'signature';
      sigInput.value = signature;
      form.appendChild(sigInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast({ title: 'Could not start payment', description: err.message, variant: 'destructive' });
      setBoostingId(null);
    }
  };

  return (
    <GlassBackground>
      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40 p-4">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Business Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20 space-y-5 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sponsored Listings</h1>
            <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
              {loading
                ? 'Loading your plan…'
                : `${active} of ${limit} active — ${packageType === 'free' ? 'Free plan' : `${packageType} plan`}`}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={limit === 0}
            className="gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300 disabled:opacity-50 h-11 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Ad
          </Button>
        </div>

        {/* Ad Credits Balance */}
        <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Ad Credits</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : adCredits} <span className="text-sm font-normal text-gray-500">ad-days</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-400">1 credit = 1 day an ad can run. Your plan tops these up monthly.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {CREDIT_PACKS.map((pack) => (
                <Button
                  key={pack.days}
                  onClick={() => handleBuyCredits(pack.days, pack.price)}
                  disabled={buyingCredits !== null}
                  className="gap-1.5 bg-gray-100 hover:bg-gray-200 border border-yellow-400/30 text-yellow-600 h-11 font-semibold"
                >
                  {buyingCredits === pack.days ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  +{pack.days} days — R{pack.price}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {limit === 0 && !loading && (
          <Card className="bg-yellow-400/10 border-yellow-400/30">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-400 shrink-0" />
                <p className="text-gray-700 text-sm">
                  Sponsored listings appear across VerifiedBizLink to boost your visibility. Upgrade your plan to create one.
                </p>
              </div>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 w-full sm:w-auto h-11">View Plans</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Create Ad Form */}
        {showCreateForm && (
          <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900">Create New Sponsored Listing</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-gray-500 text-sm mb-2 block">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Sale 2026"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="text-gray-500 text-sm mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you're promoting"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-sm mb-2 block">Button Text</label>
                  <Input
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Learn More"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-sm mb-2 block">Link (optional)</label>
                  <Input
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="https://yourbusiness.co.za"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-sm mb-2 block">How long should it run?</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFormData({ ...formData, durationDays: days })}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        formData.durationDays === days
                          ? 'bg-yellow-400 text-slate-900 border-yellow-400'
                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:border-yellow-400/50'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Costs {formData.durationDays} ad-credit{formData.durationDays === 1 ? '' : 's'} — you have {adCredits}.
                  {formData.durationDays > adCredits && (
                    <span className="text-red-700 font-semibold"> Not enough credits — buy more above.</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="border-gray-300 text-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAd}
                  disabled={saving || !formData.title.trim() || !formData.description.trim() || formData.durationDays > adCredits}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Ad'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ads List */}
        <div className="space-y-4 sm:space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Ads ({ads.length})</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
            </div>
          ) : ads.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No sponsored listings yet.</p>
              </CardContent>
            </Card>
          ) : (
            ads.map((ad) => (
              <Card key={ad.id} className="bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-400/30 transition-colors">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {editingId === ad.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-gray-500 text-sm mb-2 block">Title</label>
                        <Input
                          value={editFormData.title}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-sm mb-2 block">Description</label>
                        <Textarea
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-500 text-sm mb-2 block">Button Text</label>
                          <Input
                            value={editFormData.ctaText}
                            onChange={(e) => setEditFormData({ ...editFormData, ctaText: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-sm mb-2 block">Link (optional)</label>
                          <Input
                            value={editFormData.ctaUrl}
                            onChange={(e) => setEditFormData({ ...editFormData, ctaUrl: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <Button onClick={() => setEditingId(null)} variant="outline" size="sm" className="border-gray-300 text-gray-600">
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSaveEdit(ad.id)}
                          disabled={savingEdit || !editFormData.title.trim() || !editFormData.description.trim()}
                          size="sm"
                          className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                        >
                          {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900">{ad.title}</h3>
                          {ad.is_boosted && ad.boost_expires_at && new Date(ad.boost_expires_at) > new Date() && (
                            <Badge className="bg-yellow-400/20 text-yellow-400 gap-1">
                              <Zap className="h-3 w-3" /> Boosted until {new Date(ad.boost_expires_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{ad.description}</p>
                        {ad.expires_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {(() => {
                              const daysLeft = Math.ceil((new Date(ad.expires_at as string).getTime() - Date.now()) / 86400000);
                              return daysLeft > 0
                                ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on its ${ad.duration_days}-day run`
                                : 'Run finished — paused automatically';
                            })()}
                          </p>
                        )}
                      </div>
                      <Badge className={ad.is_active ? 'bg-green-500/20 text-green-700' : 'bg-slate-500/20 text-slate-700'}>
                        {ad.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  )}

                  {editingId !== ad.id && (
                  <div className="flex items-center gap-5 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">{(ad.impressions ?? 0).toLocaleString()}</span>
                      <span className="text-gray-400">impressions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MousePointerClick className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">{(ad.clicks ?? 0).toLocaleString()}</span>
                      <span className="text-gray-400">clicks</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <span className="text-gray-400">CTR</span>
                      <span className="font-semibold">
                        {ad.impressions > 0 ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  )}

                  {editingId !== ad.id && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => handleToggleStatus(ad)}
                      disabled={togglingId === ad.id}
                      className={`gap-2 h-10 ${ad.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {togglingId === ad.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ad.is_active ? (
                        <><Pause className="h-4 w-4" /> Pause</>
                      ) : (
                        <><Play className="h-4 w-4" /> Resume</>
                      )}
                    </Button>
                    <Button
                      onClick={() => startEdit(ad)}
                      className="gap-2 h-10 bg-gray-200 hover:bg-gray-300 text-gray-900"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    {!(ad.is_boosted && ad.boost_expires_at && new Date(ad.boost_expires_at) > new Date()) && (
                      <Button
                        onClick={() => handleBoostAd(ad)}
                        disabled={boostingId === ad.id}
                        className="gap-2 h-10 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold"
                      >
                        {boostingId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Boost — R{BOOST_PRICE}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDeleteAd(ad.id)}
                      disabled={deletingId === ad.id}
                      className="gap-2 h-10 bg-red-600/20 text-red-700 hover:bg-red-600/30 sm:ml-auto"
                    >
                      {deletingId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </GlassBackground>
  );
}
