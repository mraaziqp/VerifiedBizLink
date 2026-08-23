'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Users, TrendingUp, Wallet, Trophy, LogOut,
  Copy, Check, Mail, MessageSquare, Plus, Search, Award,
  Calendar, Sparkles, Share2, Activity,
  Calculator, FileText, RefreshCw, LayoutGrid,
  ListFilter, Building2, Flame, ShieldCheck, Repeat,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentSupportPanel } from '@/components/agent/agent-support-panel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';
import {
  DEFAULT_MILESTONES, OFFICIAL_WEEKLY_TIERS, MONTHLY_RETENTION_RATE,
  nextMilestone, progressToNext, formatRand,
  type Milestone, getWeeklyTierRate
} from '@/lib/commission';
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

interface Signup {
  businessId: string;
  companyName: string;
  packageType: string;
  status: string;
  signedUpAt: string;
  ownerName: string;
  ownerEmail: string;
  emailVerified: boolean;
  converted: boolean;
  firstPaymentCents: number;
  commissionCents: number;
  reference: string | null;
  paidAt: string | null;
}

interface Referral {
  code: string | null;
  link: string | null;
  qrUrl: string | null;
}

interface Totals {
  signups: number;
  sales: number;
  weeklySales?: number;
  pending: number;
  awaitingPayment: number;
  revenueCents: number;
  commissionCents: number;
  retentionMonthlyCents?: number;
}

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'new' | 'contacted' | 'interested' | 'closed' | 'lost';
  notes: string | null;
  next_followup_at: string | null;
  created_at: string;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  description: string;
  target_user_id: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  unregistered: 'bg-slate-100 text-slate-700 border-slate-200',
};

const LEAD_STAGES: { id: Lead['status']; label: string; bg: string; border: string; text: string; dot: string }[] = [
  { id: 'new', label: 'New Lead', bg: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', bg: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  { id: 'interested', label: 'High Interest', bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  { id: 'closed', label: 'Converted (Won)', bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { id: 'lost', label: 'Archived', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' },
];

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—';

export default function AgentPortalPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'leads' | 'activity' | 'toolkit' | 'support'>('overview');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Core Data
  const [totals, setTotals] = useState<Totals | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [currentWeeklyTier, setCurrentWeeklyTier] = useState<{ weeklySales: number; tierName: string; ratePercent: number }>({
    weeklySales: 0,
    tierName: 'Tier 1 (1–10/wk)',
    ratePercent: 20,
  });
  const [scheme, setScheme] = useState<{ ratePercent: number; milestones: Milestone[] }>({
    ratePercent: 20,
    milestones: DEFAULT_MILESTONES,
  });
  const [paidCents, setPaidCents] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Leads CRM State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [newLead, setNewLead] = useState({
    businessName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    nextFollowupAt: '',
  });

  // Activity Log State
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  // Starts true: the first fetch is already on its way from the mount effect,
  // so the spinner is the honest initial state.
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Toolkit Simulator State
  const [simWeeklySales, setSimWeeklySales] = useState<number>(12);
  const [simAvgPackage, setSimAvgPackage] = useState<number>(299);
  const [simActiveClients, setSimActiveClients] = useState<number>(30);

  // Outreach Channels
  const [pitchChannel, setPitchChannel] = useState<'whatsapp' | 'email' | 'call'>('whatsapp');

  // Auth Guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role, AGENT_PORTAL_ROLES)) router.replace('/');
  }, [authLoading, user, router]);

  // Load Data
  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/agent/dashboard');
      if (res.ok) {
        const data = await res.json();
        setTotals(data.totals);
        setSignups(data.signups || []);
        setReferral(data.referral ?? null);
        if (data.currentWeeklyTier) setCurrentWeeklyTier(data.currentWeeklyTier);
        if (data.scheme) setScheme(data.scheme);
        setPaidCents(Number(data.payouts?.paidCents) || 0);
      }
    } catch (e) {
      console.error('Failed to load agent dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await fetch('/api/agent/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error('Failed to load leads:', e);
    }
  };

  const loadActivities = async () => {
    try {
      const res = await fetch('/api/agent/activity');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.events || []);
      }
    } catch (e) {
      console.error('Failed to load activity:', e);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([loadDashboard(), loadLeads(), loadActivities()]);
    })();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.businessName) {
      toast({ title: 'Business name is required', variant: 'destructive' });
      return;
    }
    setCreatingLead(true);
    try {
      const res = await fetch('/api/agent/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        toast({ title: 'Prospect added to CRM pipeline!' });
        setIsAddLeadOpen(false);
        setNewLead({ businessName: '', contactName: '', contactEmail: '', contactPhone: '', notes: '', nextFollowupAt: '' });
        loadLeads();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Could not create prospect', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to add prospect', variant: 'destructive' });
    } finally {
      setCreatingLead(false);
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: Lead['status']) => {
    try {
      const res = await fetch('/api/agent/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
        toast({ title: `Status updated to ${LEAD_STAGES.find(s => s.id === status)?.label || status}` });
      }
    } catch {
      toast({ title: 'Could not update status', variant: 'destructive' });
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.business_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        (l.contact_name && l.contact_name.toLowerCase().includes(leadSearch.toLowerCase())) ||
        (l.contact_phone && l.contact_phone.includes(leadSearch));
      const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, leadSearch, leadStatusFilter]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="mr-2 h-7 w-7 animate-spin text-amber-500" /> Loading Business Advisor Command Center…
      </div>
    );
  }

  const sales = totals?.sales ?? 0;
  const weeklySales = totals?.weeklySales ?? 0;
  const signupsCount = totals?.signups ?? 0;
  const conversionRate = signupsCount > 0 ? Math.round((sales / signupsCount) * 100) : 0;
  const milestoneNext = nextMilestone(sales, scheme.milestones);
  const milestoneProgress = progressToNext(sales, scheme.milestones);

  // Policy Simulator calculations
  const simWeeklyTier = getWeeklyTierRate(simWeeklySales);
  const simWeeklyAcquisitionCommission = simWeeklySales * simAvgPackage * simWeeklyTier.rate;
  const simMonthlyAcquisition = simWeeklyAcquisitionCommission * 4.33;
  const simMonthlyRetention = simActiveClients * simAvgPackage * MONTHLY_RETENTION_RATE;
  const simTotalMonthlyEarnings = simMonthlyAcquisition + simMonthlyRetention;

  // Outreach pitches
  const whatsappPitch = `Hi! I noticed your business and wanted to invite you to join VerifiedBizLink — South Africa's official verified business directory. Get your Gold Verified Badge and boost your Google & local customer visibility. Register directly with my partner link here: ${referral?.link || 'https://verifiedbizlink.co.za'}`;
  const emailPitchSubject = `Get Verified on VerifiedBizLink — Increase Customer Trust & Inquiries`;
  const emailPitchBody = `Hi,\n\nI'm reaching out from VerifiedBizLink (https://verifiedbizlink.co.za) to help you get your business officially verified and ranked.\n\nWhy top South African businesses get verified:\n• Official Gold Verified Badge on your company profile\n• Higher visibility in search results for local clients\n• Photo & video product showcase with verified reviews\n\nRegister your profile in 2 minutes: ${referral?.link || 'https://verifiedbizlink.co.za'}\n\nKind regards,\n${user.fullName || 'Business Advisor'}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-slate-50/60 to-white text-slate-900 pb-20">
      {/* Top Header with Safe Area Padding */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/95 border-b border-slate-200 shadow-xs pt-[max(env(safe-area-inset-top,0px),1.25rem)] sm:pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-bold shadow-xs">
              <Flame className="h-5 w-5 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Business Advisor Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {user.fullName || user.email} · Partner Code: <span className="font-bold text-amber-600">{referral?.code || '—'}</span> · Active Tier: <span className="font-extrabold text-slate-900">{currentWeeklyTier.ratePercent}%</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-xs"
              onClick={() => {
                loadDashboard();
                loadLeads();
                setLoadingActivities(true);
                loadActivities();
                toast({ title: 'Data refreshed' });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Policy Highlights Banner */}
        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-100/60 via-amber-50/40 to-white p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <span>Official Business Advisor Commission Policy (Version 1.0)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Earn <span className="font-bold text-slate-900">20% to 50% weekly tiered acquisition commission</span> on new business subscriptions + <span className="font-bold text-amber-700">5% monthly recurring retention commission</span> for 12 consecutive months!
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <code className="flex-1 md:w-80 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 truncate select-all shadow-xs">
              {referral?.link || 'https://verifiedbizlink.co.za'}
            </code>
            <Button
              size="sm"
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-1.5 shrink-0 rounded-xl shadow-xs"
              onClick={async () => {
                if (!referral?.link) return;
                await navigator.clipboard.writeText(referral.link);
                setCopied(true);
                toast({ title: 'Partner tracking link copied!' });
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {([
            { id: 'overview', label: 'Overview & Targets', icon: TrendingUp },
            { id: 'policy', label: 'Commission Policy & Tiers', icon: FileText },
            { id: 'leads', label: `Pipeline CRM (${leads.length})`, icon: Users },
            { id: 'activity', label: 'Live Activity Stream', icon: Activity },
            { id: 'toolkit', label: 'Earnings Simulator & Pitches', icon: Sparkles },
            { id: 'support', label: 'My Details & Contact Directors', icon: LifeBuoy },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ======================= TAB 1: OVERVIEW ======================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">This Week&apos;s Sales</span>
                  <Flame className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {loading ? '—' : weeklySales}
                </div>
                <p className="text-[11px] text-amber-700 font-bold">
                  Active Tier: {currentWeeklyTier.ratePercent}% Rate
                </p>
              </Card>

              <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Converted Sales</span>
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-emerald-600">
                  {loading ? '—' : sales}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {conversionRate}% conversion rate
                </p>
              </Card>

              <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">5% Monthly Retention</span>
                  <Repeat className="h-4.5 w-4.5 text-purple-500" />
                </div>
                <div className="text-3xl font-black text-purple-700">
                  {loading ? '—' : formatRand(totals?.retentionMonthlyCents ?? 0)}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Recurring monthly for 12 mos</p>
              </Card>

              <Card className="border border-amber-300 bg-amber-50/70 shadow-xs rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Commission</span>
                  <Wallet className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <div className="text-3xl font-black text-amber-950">
                  {loading ? '—' : formatRand(totals?.commissionCents ?? 0)}
                </div>
                <p className="text-[11px] text-amber-800 font-semibold">
                  Paid out: {formatRand(paidCents)}
                </p>
              </Card>
            </div>

            {/* Weekly Tier Boost Tracker */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-base text-slate-900">Weekly Tiered Acquisition Ladder</h3>
                </div>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                  Current Week: {currentWeeklyTier.tierName} ({currentWeeklyTier.ratePercent}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {OFFICIAL_WEEKLY_TIERS.map((tier) => {
                  const isCurrent = currentWeeklyTier.ratePercent === tier.percent;
                  return (
                    <div
                      key={tier.percent}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-50/90 shadow-xs ring-2 ring-amber-400/30'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-sm ${isCurrent ? 'text-amber-950' : 'text-slate-700'}`}>
                          {tier.tierName}
                        </span>
                        {isCurrent ? (
                          <Badge className="bg-amber-500 text-slate-950 text-[10px] font-extrabold">Active</Badge>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">{tier.percent}%</span>
                        )}
                      </div>
                      <p className="text-2xl font-black text-slate-900 mt-1">{tier.percent}%</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {tier.maxSales ? `${tier.minSales} – ${tier.maxSales} sales/week` : `${tier.minSales}+ sales/week`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Milestone bonuses — set by admins on the fly, so this reflects
                whatever the scheme currently is rather than a hard-coded ladder. */}
            {scheme.milestones.length > 0 && (
              <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <h3 className="font-extrabold text-base text-slate-900">Milestone Bonuses</h3>
                  </div>
                  {milestoneNext ? (
                    <span className="text-xs font-bold text-slate-600">
                      {Math.max(0, milestoneNext.sales - sales)} more sale
                      {milestoneNext.sales - sales === 1 ? '' : 's'} to {milestoneNext.name}
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-emerald-700">Every milestone reached</span>
                  )}
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all"
                    style={{ width: `${milestoneProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {scheme.milestones.map((m) => {
                    const reached = sales >= m.sales;
                    return (
                      <div
                        key={m.sales}
                        className={`rounded-xl border p-3 ${
                          reached ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-bold ${reached ? 'text-emerald-800' : 'text-slate-700'}`}>
                            {m.name}
                          </span>
                          {reached && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-500">{m.reward}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Attributed Signups Ledger */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-amber-500" />
                    Attributed Business Accounts
                  </h3>
                  <p className="text-xs text-slate-500">Businesses registered and verified via your tracking link</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {signups.length} Registered
                </Badge>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                  Loading attributed sign-ups…
                </div>
              ) : signups.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm font-semibold text-slate-600">No attributed businesses yet.</p>
                  <p className="text-xs text-slate-400">Share your partner link or add prospects to start earning weekly commission!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3.5">Business &amp; Owner</th>
                        <th className="px-5 py-3.5">Registration Date</th>
                        <th className="px-5 py-3.5">Package</th>
                        <th className="px-5 py-3.5">Acquisition Payment</th>
                        <th className="px-5 py-3.5">Acquisition Comm.</th>
                        <th className="px-5 py-3.5">5% Monthly Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {signups.map((s) => (
                        <tr key={s.businessId} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{s.companyName}</div>
                            <div className="text-xs text-slate-500">{s.ownerName} · {s.ownerEmail}</div>
                            <span className={`inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] || STATUS_STYLES.unregistered}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 font-medium">
                            {when(s.signedUpAt)}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-700">
                            {s.packageType || 'Free Tier'}
                          </td>
                          <td className="px-5 py-4">
                            {s.converted ? (
                              <div>
                                <span className="font-extrabold text-slate-900">{formatRand(s.firstPaymentCents)}</span>
                                <div className="text-[10px] text-slate-400">{when(s.paidAt)}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Pending payment</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {s.converted ? (
                              <span className="font-bold text-emerald-600">{formatRand(s.commissionCents)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {s.converted ? (
                              <span className="font-bold text-purple-700">{formatRand(Math.floor(s.firstPaymentCents * MONTHLY_RETENTION_RATE))} / mo</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ======================= TAB 2: COMMISSION POLICY ======================= */}
        {activeTab === 'policy' && (
          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-bold shadow-xs">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Business Advisor Commission &amp; Incentive Policy
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Official Version 1.0 · VerifiedBizLink (Pty) Ltd</p>
                </div>
              </div>

              {/* Policy Section 4: Weekly Tiered Commission */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Trophy className="h-4.5 w-4.5 text-amber-500" />
                  1. Weekly Tiered Acquisition Commission
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your weekly acquisition commission is determined by the number of qualifying new paying businesses secured during the commission week. The percentage applies to the total subscription value for new businesses for that week:
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tier</th>
                        <th className="p-3">Qualifying New Paying Businesses / Week</th>
                        <th className="p-3">Commission Rate</th>
                        <th className="p-3">Example Weekly Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Tier 1</td>
                        <td className="p-3">1 – 10 businesses</td>
                        <td className="p-3 font-extrabold text-amber-600">20%</td>
                        <td className="p-3 text-slate-600">8 businesses @ R10,000 value = <span className="font-bold text-slate-900">R2,000</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Tier 2</td>
                        <td className="p-3">11 – 15 businesses</td>
                        <td className="p-3 font-extrabold text-amber-600">30%</td>
                        <td className="p-3 text-slate-600">14 businesses @ R18,000 value = <span className="font-bold text-slate-900">R5,400</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Tier 3</td>
                        <td className="p-3">16 – 20 businesses</td>
                        <td className="p-3 font-extrabold text-amber-600">40%</td>
                        <td className="p-3 text-slate-600">18 businesses @ R25,000 value = <span className="font-bold text-slate-900">R10,000</span></td>
                      </tr>
                      <tr className="bg-amber-50/50">
                        <td className="p-3 font-bold text-amber-950">Tier 4</td>
                        <td className="p-3 font-bold text-amber-950">21+ businesses</td>
                        <td className="p-3 font-extrabold text-amber-700">50%</td>
                        <td className="p-3 text-amber-900">22 businesses @ R30,000 value = <span className="font-bold text-amber-950">R15,000</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Policy Section 8 & 9: Monthly Retention */}
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Repeat className="h-4.5 w-4.5 text-purple-600" />
                  2. Monthly Recurring Retention Commission
                </h3>
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2 text-xs text-purple-950 leading-relaxed">
                  <p>
                    • In addition to weekly acquisition commission, Advisors receive a recurring retention commission equal to <span className="font-bold">5% of each monthly subscription payment</span> received from every qualifying business originally registered by that Advisor.
                  </p>
                  <p>
                    • <span className="font-bold">Duration:</span> Payable for a maximum of <span className="font-bold">12 consecutive months</span> from the customer&apos;s first successful payment while the account remains active.
                  </p>
                  <p>
                    • <span className="font-bold">Example:</span> For a business paying R500/month, the Advisor receives 5% × R500 = <span className="font-bold">R25/month</span>. Active for 12 months = <span className="font-bold">R300 total retention commission</span> from that single customer.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================= TAB 3: PIPELINE CRM ======================= */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  Prospect &amp; Lead Management CRM
                </h2>
                <p className="text-xs text-slate-500">Track local business owners and convert them to verified members.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* The pipeline gets long fast — a marketer standing in a mall
                    needs to find one shop by name, not scroll five columns. */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Find a prospect…"
                    className="h-9 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 sm:w-56"
                  />
                </div>

                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  <option value="all">All stages</option>
                  {LEAD_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                <div className="flex rounded-xl border border-slate-200 p-1 bg-white shadow-xs">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      viewMode === 'kanban' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" /> Kanban
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      viewMode === 'table' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter className="h-4 w-4" /> Table
                  </button>
                </div>

                <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-1.5 rounded-xl shadow-xs">
                      <Plus className="h-4 w-4" /> Add Prospect
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-lg rounded-2xl">
                    <form onSubmit={handleCreateLead}>
                      <DialogHeader>
                        <DialogTitle className="font-extrabold text-lg">Add New Business Prospect</DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs">
                          Record contact details to follow up and convert with your referral link.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3.5 py-4">
                        <div>
                          <Label className="text-xs font-bold text-slate-700">Business / Trade Name *</Label>
                          <Input
                            placeholder="e.g. Cape Town Artisans"
                            value={newLead.businessName}
                            onChange={(e) => setNewLead({ ...newLead, businessName: e.target.value })}
                            className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-slate-700">Contact Person</Label>
                            <Input
                              placeholder="e.g. John Doe"
                              value={newLead.contactName}
                              onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                              className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-slate-700">Phone / WhatsApp</Label>
                            <Input
                              placeholder="e.g. 0821234567"
                              value={newLead.contactPhone}
                              onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                              className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                            <Input
                              type="email"
                              placeholder="john@example.co.za"
                              value={newLead.contactEmail}
                              onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                              className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-slate-700">Next Follow-up Date</Label>
                            <Input
                              type="date"
                              value={newLead.nextFollowupAt}
                              onChange={(e) => setNewLead({ ...newLead, nextFollowupAt: e.target.value })}
                              className="bg-slate-50 border-slate-200 rounded-xl mt-1 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-700">Notes</Label>
                          <textarea
                            placeholder="Interested in R49 verification fee..."
                            value={newLead.notes}
                            onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 mt-1 min-h-[70px]"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creatingLead} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl">
                          {creatingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Prospect'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Kanban / Table Rendering */}
            {viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {LEAD_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
                  return (
                    <div key={stage.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/60 p-3 min-h-[400px]">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                          <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                        </div>
                        <span className="text-xs font-extrabold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2.5 overflow-y-auto">
                        {stageLeads.length === 0 ? (
                          <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                            Empty
                          </div>
                        ) : (
                          stageLeads.map((lead) => {
                            const cleanPhone = lead.contact_phone?.replace(/\D/g, '') || '';
                            return (
                              <div
                                key={lead.id}
                                className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2 hover:border-amber-400 transition-all"
                              >
                                <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{lead.business_name}</h4>
                                {lead.contact_name && <p className="text-[11px] text-slate-500">{lead.contact_name}</p>}
                                {lead.notes && <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg line-clamp-2 italic">&quot;{lead.notes}&quot;</p>}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                  {lead.next_followup_at ? (
                                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {when(lead.next_followup_at)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">No date</span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    {cleanPhone && (
                                      <a
                                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappPitch)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                        title="WhatsApp"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    {lead.contact_email && (
                                      <a
                                        href={`mailto:${lead.contact_email}?subject=${encodeURIComponent(emailPitchSubject)}&body=${encodeURIComponent(emailPitchBody)}`}
                                        className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        title="Email"
                                      >
                                        <Mail className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-1">
                                  <select
                                    value={lead.status}
                                    onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                    className="w-full text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700"
                                  >
                                    <option value="new">Move to New</option>
                                    <option value="contacted">Move to Contacted</option>
                                    <option value="interested">Move to High Interest</option>
                                    <option value="closed">Move to Converted</option>
                                    <option value="lost">Move to Archived</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3.5">Business / Contact</th>
                        <th className="px-5 py-3.5">Stage</th>
                        <th className="px-5 py-3.5">Follow-up</th>
                        <th className="px-5 py-3.5">Notes</th>
                        <th className="px-5 py-3.5 text-right">Outreach</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => {
                        const cleanPhone = lead.contact_phone?.replace(/\D/g, '') || '';
                        return (
                          <tr key={lead.id} className="hover:bg-amber-50/20 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-900">{lead.business_name}</div>
                              {lead.contact_name && <div className="text-xs text-slate-500">{lead.contact_name}</div>}
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={lead.status}
                                onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold bg-white"
                              >
                                <option value="new">New Lead</option>
                                <option value="contacted">Contacted</option>
                                <option value="interested">High Interest</option>
                                <option value="closed">Converted (Won)</option>
                                <option value="lost">Archived</option>
                              </select>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500">{when(lead.next_followup_at)}</td>
                            <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate">{lead.notes || '—'}</td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {cleanPhone && (
                                  <a href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappPitch)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                    <MessageSquare className="h-4 w-4" />
                                  </a>
                                )}
                                {lead.contact_email && (
                                  <a href={`mailto:${lead.contact_email}?subject=${encodeURIComponent(emailPitchSubject)}&body=${encodeURIComponent(emailPitchBody)}`} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
                                    <Mail className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ======================= TAB 4: ACTIVITY STREAM ======================= */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-amber-500" />
                Live Attribution &amp; Event Stream
              </h2>
              {loadingActivities ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                  Loading activity stream…
                </div>
              ) : activities.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No activity events logged yet.</div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((ev) => (
                    <div key={ev.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white bg-amber-400 shadow-xs flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase text-amber-800 tracking-wider">
                            {ev.event_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{when(ev.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ======================= TAB 6: MY DETAILS & SUPPORT ======================= */}
        {activeTab === 'support' && <AgentSupportPanel />}

        {/* ======================= TAB 5: TOOLKIT & SIMULATOR ======================= */}
        {activeTab === 'toolkit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Policy Commission Simulator */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">Policy Earnings Simulator</h3>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-700 mb-1.5">
                    <span>New Businesses Signed Up / Week:</span>
                    <span className="text-amber-600 font-black">{simWeeklySales} / week ({simWeeklyTier.percent}% Tier Rate)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={simWeeklySales}
                    onChange={(e) => setSimWeeklySales(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 mb-1.5">
                    <span>Average Package Price / Subscription:</span>
                    <span className="text-amber-600 font-black">R{simAvgPackage}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: 'Verification Fee (R49)', val: 49 },
                      { label: 'Growth Plan (R299)', val: 299 },
                      { label: 'Scale Plan (R699)', val: 699 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setSimAvgPackage(p.val)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          simAvgPackage === p.val
                            ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 mb-1.5">
                    <span>Active Retained Clients (5% Monthly Recurring):</span>
                    <span className="text-purple-700 font-black">{simActiveClients} active businesses</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simActiveClients}
                    onChange={(e) => setSimActiveClients(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-100/70 to-amber-50 p-5 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-extrabold text-amber-900">Total Projected Monthly Earnings</p>
                <p className="text-3xl font-black text-slate-900">
                  R{Math.round(simTotalMonthlyEarnings).toLocaleString()} / mo
                </p>
                <p className="text-xs text-slate-600 font-medium pt-1">
                  Weekly Acquisition: <span className="font-bold text-amber-900">R{Math.round(simWeeklyAcquisitionCommission).toLocaleString()} / wk</span> · Monthly Retention: <span className="font-bold text-purple-800">R{Math.round(simMonthlyRetention).toLocaleString()} / mo</span>
                </p>
              </div>
            </Card>

            {/* Outreach Pitch Kit & QR Code */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">Advisor Collateral &amp; Outreach</h3>
              </div>

              {referral?.qrUrl && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referral.qrUrl} alt="Referral QR" className="h-18 w-18 rounded-lg bg-white p-1 border border-slate-200 shrink-0 shadow-xs" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">Advisor Direct QR Code</p>
                    <p className="text-[11px] text-slate-500">Present this QR code on your phone when meeting business owners in person.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <button
                    onClick={() => setPitchChannel('whatsapp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pitchChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    WhatsApp Pitch
                  </button>
                  <button
                    onClick={() => setPitchChannel('email')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pitchChannel === 'email' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Email Script
                  </button>
                  <button
                    onClick={() => setPitchChannel('call')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pitchChannel === 'call' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    In-Person Script
                  </button>
                </div>

                {pitchChannel === 'whatsapp' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 font-mono leading-relaxed">
                      {whatsappPitch}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs rounded-xl font-bold border-slate-200"
                      onClick={async () => {
                        await navigator.clipboard.writeText(whatsappPitch);
                        toast({ title: 'WhatsApp pitch copied!' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy WhatsApp Message
                    </Button>
                  </div>
                )}

                {pitchChannel === 'email' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 font-mono whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                      {emailPitchBody}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs rounded-xl font-bold border-slate-200"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`Subject: ${emailPitchSubject}\n\n${emailPitchBody}`);
                        toast({ title: 'Email template copied!' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy Email Template
                    </Button>
                  </div>
                )}

                {pitchChannel === 'call' && (
                  <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">Key Value Props to Highlight:</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>&quot;VerifiedBizLink gives your business the official Gold Verified Badge.&quot;</li>
                      <li>&quot;Free registration + only R49 once-off to get verified with higher search ranking.&quot;</li>
                      <li>&quot;Upload high-res product photos, customer testimonials, and direct WhatsApp contact buttons.&quot;</li>
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
