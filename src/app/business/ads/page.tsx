'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Zap, Trash2, Pause, Play, Loader2, Sparkles, Eye, MousePointerClick } from 'lucide-react';
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
  impressions: number;
  clicks: number;
}

const BOOST_PRICE = 100;

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
  const [formData, setFormData] = useState({ title: '', description: '', ctaText: 'Learn More', ctaUrl: '' });

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/business/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
        setLimit(data.limit || 0);
        setActive(data.active || 0);
        setPackageType(data.packageType || 'free');
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
        setFormData({ title: '', description: '', ctaText: 'Learn More', ctaUrl: '' });
        setShowCreateForm(false);
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
      <div className="bg-slate-950/70 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 p-4">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Business Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Sponsored Listings</h1>
            <p className="text-slate-400 mt-1">
              {loading ? 'Loading your plan…' : `${active} of ${limit} active — ${packageType === 'free' ? 'Free plan' : packageType} plan`}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={limit === 0}
            className="gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Ad
          </Button>
        </div>

        {limit === 0 && !loading && (
          <Card className="bg-yellow-400/10 border-yellow-400/30">
            <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-400 shrink-0" />
                <p className="text-slate-200 text-sm">
                  Sponsored listings appear across VerifiedBizLink to boost your visibility. Upgrade your plan to create one.
                </p>
              </div>
              <Link href="/pricing">
                <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 shrink-0">View Plans</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Create Ad Form */}
        {showCreateForm && (
          <Card className="bg-slate-900/60 backdrop-blur-xl border-white/5">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Create New Sponsored Listing</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Sale 2026"
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you're promoting"
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Button Text</label>
                  <Input
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Learn More"
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Link (optional)</label>
                  <Input
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="https://yourbusiness.co.za"
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAd}
                  disabled={saving || !formData.title.trim() || !formData.description.trim()}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Ad'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ads List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Ads ({ads.length})</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
            </div>
          ) : ads.length === 0 ? (
            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/5">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No sponsored listings yet.</p>
              </CardContent>
            </Card>
          ) : (
            ads.map((ad) => (
              <Card key={ad.id} className="bg-slate-900/60 backdrop-blur-xl border-white/5 hover:border-yellow-400/30 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{ad.title}</h3>
                        {ad.is_boosted && ad.boost_expires_at && new Date(ad.boost_expires_at) > new Date() && (
                          <Badge className="bg-yellow-400/20 text-yellow-400 gap-1">
                            <Zap className="h-3 w-3" /> Boosted until {new Date(ad.boost_expires_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{ad.description}</p>
                    </div>
                    <Badge className={ad.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                      {ad.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-5 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Eye className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold">{(ad.impressions ?? 0).toLocaleString()}</span>
                      <span className="text-slate-500">impressions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MousePointerClick className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold">{(ad.clicks ?? 0).toLocaleString()}</span>
                      <span className="text-slate-500">clicks</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">CTR</span>
                      <span className="font-semibold">
                        {ad.impressions > 0 ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                    <Button
                      size="sm"
                      onClick={() => handleToggleStatus(ad)}
                      disabled={togglingId === ad.id}
                      className={`gap-2 ${ad.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {togglingId === ad.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ad.is_active ? (
                        <><Pause className="h-4 w-4" /> Pause</>
                      ) : (
                        <><Play className="h-4 w-4" /> Resume</>
                      )}
                    </Button>
                    {!(ad.is_boosted && ad.boost_expires_at && new Date(ad.boost_expires_at) > new Date()) && (
                      <Button
                        size="sm"
                        onClick={() => handleBoostAd(ad)}
                        disabled={boostingId === ad.id}
                        className="gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold"
                      >
                        {boostingId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Boost — R{BOOST_PRICE}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleDeleteAd(ad.id)}
                      disabled={deletingId === ad.id}
                      className="gap-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 ml-auto"
                    >
                      {deletingId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </GlassBackground>
  );
}
