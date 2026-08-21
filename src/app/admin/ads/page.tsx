'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Sparkles, Megaphone, Play, Pause, Trash2, Clock,
  Search, ShieldCheck, Eye, MousePointerClick, Settings, Coins, Plus,
  CheckCircle2, AlertCircle, RefreshCw, LayoutGrid, Calendar, Sliders, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { AdminBackground, AdminCard, AdminPageHeader, SectionTitle } from '@/components/admin/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface AdminAd {
  id: string;
  business_id: string;
  title: string;
  description: string;
  business_name: string;
  company_name: string;
  owner_name: string;
  owner_email: string;
  cta_text: string;
  cta_url: string | null;
  badge: string | null;
  is_boosted: boolean;
  is_active: boolean;
  status: string;
  slot_placement: string;
  image_url: string | null;
  credits_spent: number;
  impressions: number;
  clicks: number;
  duration_days: number | null;
  created_at: string;
  expires_at: string | null;
  admin_notes: string | null;
}

interface BizCreditInfo {
  id: string;
  company_name: string;
  status: string;
  package_type: string;
  ad_credits: number;
  email: string;
  full_name: string;
  total_ads: number;
  active_ads: number;
}

interface AdTotals {
  totalAds: number;
  activeAds: number;
  pausedAds: number;
  totalImpressions: number;
  totalClicks: number;
  totalCreditsSpent: number;
}

const SLOT_NAMES: Record<string, { label: string; color: string }> = {
  feed_inline: { label: 'In-Feed Sponsored', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  top_banner: { label: 'Top Header Banner', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  sidebar_spotlight: { label: 'Sidebar Spotlight', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—';

export default function AdminAdsManagerPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'placements' | 'credits'>('campaigns');
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [totals, setTotals] = useState<AdTotals | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');

  // Placement Settings State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Business Credits State
  const [businesses, setBusinesses] = useState<BizCreditInfo[]>([]);
  const [creditSearch, setCreditSearch] = useState('');
  const [selectedBizForCredit, setSelectedBizForCredit] = useState<BizCreditInfo | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(50);
  const [grantReason, setGrantReason] = useState('Promotional Bonus');
  const [granting, setGranting] = useState(false);

  // Load Ads Data
  const loadAds = async () => {
    try {
      const res = await fetch('/api/admin/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
        setTotals(data.totals || null);
      }
    } catch (e) {
      console.error('Failed to load ads:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/ads/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error('Failed to load ad settings:', e);
    }
  };

  // Load Businesses Credits
  const loadBusinesses = async () => {
    try {
      const res = await fetch('/api/admin/ads/credits');
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch (e) {
      console.error('Failed to load business credits:', e);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    loadAds();
    loadSettings();
    loadBusinesses();
  }, [authLoading, user]);

  const handleUpdateAd = async (id: string, updates: Partial<AdminAd> & { extendDays?: number }) => {
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        toast({ title: 'Ad updated successfully' });
        loadAds();
      } else {
        toast({ title: 'Failed to update ad', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this ad?')) return;
    try {
      const res = await fetch(`/api/admin/ads?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Ad deleted' });
        setAds((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/ads/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        toast({ title: 'Placement rules saved!' });
      }
    } catch {
      toast({ title: 'Could not save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedBizForCredit || !grantAmount) return;
    setGranting(true);
    try {
      const res = await fetch('/api/admin/ads/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBizForCredit.id,
          amount: Number(grantAmount),
          reason: grantReason,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: data.message });
        setSelectedBizForCredit(null);
        loadBusinesses();
      }
    } catch {
      toast({ title: 'Failed to update credits', variant: 'destructive' });
    } finally {
      setGranting(false);
    }
  };

  const filteredAds = useMemo(() => {
    return ads.filter((a) => {
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.company_name.toLowerCase().includes(search.toLowerCase()) ||
        a.owner_email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchSlot = slotFilter === 'all' || a.slot_placement === slotFilter;
      return matchSearch && matchStatus && matchSlot;
    });
  }, [ads, search, statusFilter, slotFilter]);

  const filteredBusinesses = useMemo(() => {
    if (!creditSearch.trim()) return businesses;
    const q = creditSearch.toLowerCase();
    return businesses.filter(
      (b) => b.company_name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)
    );
  }, [businesses, creditSearch]);

  if (!authLoading && user && user.role !== 'admin') {
    return (
      <AdminBackground>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Admins only.</p>
        </div>
      </AdminBackground>
    );
  }

  return (
    <AdminBackground>
      <AdminPageHeader
        title="Ad Placement &amp; Credit Command Center"
        subtitle="Manage sponsored campaigns, placement slots, feed rotation frequencies, and business ad credits"
      >
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-900 bg-white hover:bg-amber-50 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border border-slate-200 bg-white shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Ads</span>
            <p className="text-2xl font-black text-slate-900">{totals?.totalAds ?? 0}</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Active Live</span>
            <p className="text-2xl font-black text-emerald-600">{totals?.activeAds ?? 0}</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Paused / Expired</span>
            <p className="text-2xl font-black text-amber-600">{totals?.pausedAds ?? 0}</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Impressions</span>
            <p className="text-2xl font-black text-slate-900">{totals?.totalImpressions.toLocaleString() ?? 0}</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Clicks</span>
            <p className="text-2xl font-black text-blue-600">{totals?.totalClicks.toLocaleString() ?? 0}</p>
          </Card>

          <Card className="border border-amber-300 bg-amber-50/70 shadow-xs p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase text-amber-900">Credits Spent</span>
            <p className="text-2xl font-black text-amber-950">{totals?.totalCreditsSpent.toLocaleString() ?? 0}</p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {[
            { id: 'campaigns', label: `All Campaigns (${ads.length})`, icon: Megaphone },
            { id: 'placements', label: 'Placement Rules & Limits', icon: Sliders },
            { id: 'credits', label: `Business Credit Ledger (${businesses.length})`, icon: Coins },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ======================= TAB 1: ALL CAMPAIGNS ======================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search campaigns by business name, title, owner email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white border-slate-200 rounded-xl"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="paused">Paused Only</option>
                <option value="completed">Completed / Expired</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="all">All Placements</option>
                <option value="feed_inline">In-Feed Sponsored</option>
                <option value="top_banner">Top Header Banner</option>
                <option value="sidebar_spotlight">Sidebar Spotlight</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-500" /> Loading campaigns…
              </div>
            ) : filteredAds.length === 0 ? (
              <AdminCard>
                <p className="text-center py-10 text-slate-500">No campaigns match your filters.</p>
              </AdminCard>
            ) : (
              <div className="space-y-3">
                {filteredAds.map((ad) => {
                  const slotMeta = SLOT_NAMES[ad.slot_placement] || SLOT_NAMES.feed_inline;
                  const isExpired = ad.expires_at ? new Date(ad.expires_at) < new Date() : false;
                  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={ad.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-base text-slate-900">{ad.title}</h3>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${slotMeta.color}`}>
                              {slotMeta.label}
                            </span>
                            <Badge
                              variant={ad.is_active && !isExpired ? 'default' : 'secondary'}
                              className={ad.is_active && !isExpired ? 'bg-emerald-500 text-white font-bold text-[10px]' : 'text-[10px] font-bold'}
                            >
                              {ad.is_active && !isExpired ? 'Active Live' : isExpired ? 'Expired' : 'Paused'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            <span className="font-bold text-slate-800">{ad.company_name}</span> · Owner: {ad.owner_name} ({ad.owner_email})
                          </p>
                        </div>

                        {/* Performance Stats */}
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs">
                          <div className="text-center">
                            <span className="text-[10px] text-slate-400 font-bold block">IMPRESSIONS</span>
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

                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {ad.description}
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Created: {when(ad.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Expires: <strong className={isExpired ? 'text-red-500' : 'text-slate-800'}>{when(ad.expires_at)}</strong>
                          </span>
                        </div>

                        {/* Admin Action Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={ad.slot_placement}
                            onChange={(e) => handleUpdateAd(ad.id, { slot_placement: e.target.value })}
                            className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg p-1.5"
                          >
                            <option value="feed_inline">In-Feed</option>
                            <option value="top_banner">Top Banner</option>
                            <option value="sidebar_spotlight">Sidebar</option>
                          </select>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                            onClick={() => handleUpdateAd(ad.id, { status: ad.is_active ? 'paused' : 'active' })}
                          >
                            {ad.is_active ? <Pause className="h-3.5 w-3.5 text-amber-500" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                            {ad.is_active ? 'Pause' : 'Activate'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleUpdateAd(ad.id, { extendDays: 7 })}
                            title="Add 7 days duration"
                          >
                            <Plus className="h-3.5 w-3.5" /> +7 Days
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                            onClick={() => handleDeleteAd(ad.id)}
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
        )}

        {/* ======================= TAB 2: PLACEMENT RULES ======================= */}
        {activeTab === 'placements' && (
          <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-500" />
                Global Ad Placement &amp; Rotation Engine
              </h2>
              <p className="text-xs text-slate-500">Configure how often and where ads are displayed across the platform.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <Label className="font-bold text-slate-900 text-sm">Global Ad Delivery Status</Label>
                <p className="text-slate-500">Master switch to pause or resume all ads across the marketplace.</p>
                <select
                  value={settings.ads_enabled || 'true'}
                  onChange={(e) => setSettings({ ...settings, ads_enabled: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="true">✅ Enabled (Ads are actively served)</option>
                  <option value="false">⏸️ Globally Disabled (No ads shown)</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <Label className="font-bold text-slate-900 text-sm">In-Feed Ad Frequency</Label>
                <p className="text-slate-500">Number of normal feed posts between each sponsored post.</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.feed_ad_frequency || '5'}
                    onChange={(e) => setSettings({ ...settings, feed_ad_frequency: e.target.value })}
                    className="bg-white border-slate-200 rounded-xl w-24 font-bold text-sm"
                  />
                  <span className="text-slate-600 font-medium">Show 1 sponsored ad every {settings.feed_ad_frequency || '5'} posts</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <Label className="font-bold text-slate-900 text-sm">Top Banner Max Concurrent Limit</Label>
                <p className="text-slate-500">Maximum number of rotating banners in the top header slot.</p>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.top_banner_max || '3'}
                  onChange={(e) => setSettings({ ...settings, top_banner_max: e.target.value })}
                  className="bg-white border-slate-200 rounded-xl w-24 font-bold text-sm"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <Label className="font-bold text-slate-900 text-sm">Sidebar Spotlight Limit</Label>
                <p className="text-slate-500">Maximum concurrent businesses featured in the sidebar spotlight widget.</p>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.sidebar_spotlight_max || '2'}
                  onChange={(e) => setSettings({ ...settings, sidebar_spotlight_max: e.target.value })}
                  className="bg-white border-slate-200 rounded-xl w-24 font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl shadow-xs px-6"
              >
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Placement Settings
              </Button>
            </div>
          </Card>
        )}

        {/* ======================= TAB 3: BUSINESS CREDIT LEDGER ======================= */}
        {activeTab === 'credits' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search businesses by name, owner email..."
                  value={creditSearch}
                  onChange={(e) => setCreditSearch(e.target.value)}
                  className="pl-10 bg-white border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Business &amp; Owner</th>
                      <th className="px-5 py-3.5">Tier</th>
                      <th className="px-5 py-3.5">Ad Credits Balance</th>
                      <th className="px-5 py-3.5">Active Ads</th>
                      <th className="px-5 py-3.5 text-right">Credit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{b.company_name}</div>
                          <div className="text-xs text-slate-500">{b.full_name} · {b.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs font-bold capitalize">
                            {b.package_type || 'Free'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-black text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs">
                            {b.ad_credits} Credits
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                          {b.active_ads} live / {b.total_ads} total
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs gap-1.5 shadow-xs"
                            onClick={() => {
                              setSelectedBizForCredit(b);
                              setGrantAmount(50);
                            }}
                          >
                            <Coins className="h-3.5 w-3.5" /> Adjust Credits
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Grant / Deduct Credits Modal */}
            <Dialog open={!!selectedBizForCredit} onOpenChange={(open) => !open && setSelectedBizForCredit(null)}>
              <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" />
                    Adjust Ad Credits for {selectedBizForCredit?.company_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Current balance: <strong className="text-slate-900">{selectedBizForCredit?.ad_credits} Credits</strong>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                  <div>
                    <Label className="font-bold text-slate-800">Credits Adjustment (positive to grant, negative to deduct)</Label>
                    <Input
                      type="number"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(Number(e.target.value))}
                      className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800">Reason / Reference Note</Label>
                    <Input
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-xs"
                      placeholder="e.g. Promotional Bonus or Monthly Top-up"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedBizForCredit(null)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGrantCredits}
                    disabled={granting}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl"
                  >
                    {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Adjustment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AdminBackground>
  );
}
