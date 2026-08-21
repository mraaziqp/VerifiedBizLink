'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Users, TrendingUp, Wallet, Clock, Trophy, Target, CheckCircle2, LogOut,
  Link2, Copy, Check, QrCode, Phone, Mail, MessageSquare, Plus, Search,
  Calendar, Award, Sparkles, ArrowUpRight, Share2, HelpCircle, Activity,
  ChevronRight, Calculator, FileText, CheckCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard, GlassPageHeader, SectionTitle, StatCard } from '@/components/shared/glass-ui';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';
import {
  DEFAULT_MILESTONES, DEFAULT_COMMISSION_RATE, currentMilestone, nextMilestone,
  progressToNext, formatRand, type Milestone,
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
  pending: number;
  awaitingPayment: number;
  revenueCents: number;
  commissionCents: number;
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
  verified: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  reviewing: 'bg-blue-500/15 text-blue-700 border-blue-300',
  pending: 'bg-amber-500/15 text-amber-700 border-amber-300',
  rejected: 'bg-red-500/15 text-red-700 border-red-300',
  unregistered: 'bg-gray-200 text-gray-700 border-gray-300',
};

const LEAD_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: 'New Lead', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  contacted: { label: 'Contacted', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  interested: { label: 'High Interest', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  closed: { label: 'Converted', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  lost: { label: 'Archived', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600' },
};

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—';

export default function AgentPortalPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'activity' | 'toolkit'>('overview');

  // Core Data
  const [totals, setTotals] = useState<Totals | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [scheme, setScheme] = useState<{ ratePercent: number; milestones: Milestone[] }>({
    ratePercent: Math.round(DEFAULT_COMMISSION_RATE * 100),
    milestones: DEFAULT_MILESTONES,
  });
  const [paidCents, setPaidCents] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Leads CRM state
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

  // Activity Log state
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Toolkit Calculator state
  const [calcSignups, setCalcSignups] = useState<number>(10);
  const [calcPlanPrice, setCalcPlanPrice] = useState<number>(299);

  // Check auth
  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role, AGENT_PORTAL_ROLES)) router.replace('/');
  }, [authLoading, user, router]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/agent/dashboard');
      if (res.ok) {
        const data = await res.json();
        setTotals(data.totals);
        setSignups(data.signups || []);
        setReferral(data.referral ?? null);
        if (data.scheme) setScheme(data.scheme);
        setPaidCents(Number(data.payouts?.paidCents) || 0);
      }
    } catch (e) {
      console.error('Failed to load agent dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Leads
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

  // Load Activity Log
  const loadActivities = async () => {
    setLoadingActivities(true);
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
    loadDashboard();
    loadLeads();
    loadActivities();
  }, []);

  // Handle Add Lead
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
        toast({ title: 'Lead added to your CRM pipeline!' });
        setIsAddLeadOpen(false);
        setNewLead({ businessName: '', contactName: '', contactEmail: '', contactPhone: '', notes: '', nextFollowupAt: '' });
        loadLeads();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Could not create lead', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to add lead', variant: 'destructive' });
    } finally {
      setCreatingLead(false);
    }
  };

  // Handle Update Lead Status
  const handleUpdateLeadStatus = async (id: string, status: Lead['status']) => {
    try {
      const res = await fetch('/api/agent/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
        toast({ title: `Status updated to ${LEAD_STATUS_CONFIG[status]?.label || status}` });
      }
    } catch {
      toast({ title: 'Could not update status', variant: 'destructive' });
    }
  };

  // Filtered leads
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-yellow-400" /> Loading Sales Portal…
      </div>
    );
  }

  const sales = totals?.sales ?? 0;
  const reached = currentMilestone(sales, scheme.milestones);
  const next = nextMilestone(sales, scheme.milestones);
  const progress = progressToNext(sales, scheme.milestones);

  // WhatsApp Pitch template
  const pitchText = `Hi! I noticed your business and wanted to introduce VerifiedBizLink — South Africa's trusted business directory. You can get officially verified and listed to attract verified customers. Register here with my link: ${referral?.link || 'https://verifiedbizlink.co.za'}`;

  return (
    <GlassBackground>
      <GlassPageHeader
        title="Marketer & Sales Command Center"
        subtitle={`${user.fullName || user.email} · Partner Code: ${referral?.code || '—'} · Rate: ${scheme.ratePercent}%`}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
            onClick={() => {
              loadDashboard();
              loadLeads();
              loadActivities();
              toast({ title: 'Data refreshed' });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </GlassPageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Overview & Targets
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${
              activeTab === 'leads'
                ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Users className="h-4 w-4" /> Lead CRM Pipeline
            {leads.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'leads' ? 'bg-slate-950 text-yellow-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                {leads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'activity'
                ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="h-4 w-4" /> Live Activity Stream
          </button>
          <button
            onClick={() => setActiveTab('toolkit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'toolkit'
                ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Marketer Toolkit & Calculator
          </button>
        </div>

        {/* ======================= TAB 1: OVERVIEW ======================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label="Total Sign-ups" value={totals?.signups ?? 0} icon={Users} gradient="from-blue-500 to-cyan-500" loading={loading} />
              <StatCard label="Converted Sales" value={sales} icon={TrendingUp} gradient="from-emerald-500 to-teal-500" loading={loading} />
              <StatCard label="Awaiting Payment" value={totals?.pending ?? 0} icon={Clock} gradient="from-amber-500 to-orange-500" loading={loading} />
              <StatCard label="Commission Earned" value={formatRand(totals?.commissionCents ?? 0)} icon={Wallet} gradient="from-purple-500 to-pink-500" loading={loading} />
            </div>

            {/* Quick Share Banner */}
            {referral?.code && (
              <GlassCard className="border-yellow-400/30 bg-gradient-to-r from-yellow-950/20 via-slate-900/60 to-slate-900/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-bold text-slate-100">Your Personalized Referral Link</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                      Share this direct link. Anyone who signs up is automatically tied to your account with {scheme.ratePercent}% commission.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs font-mono text-yellow-400 max-w-[280px] sm:max-w-md truncate">
                      {referral.link}
                    </code>
                    <Button
                      size="sm"
                      className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold gap-1.5 shrink-0 shadow-md shadow-yellow-400/20"
                      onClick={async () => {
                        if (!referral.link) return;
                        try {
                          await navigator.clipboard.writeText(referral.link);
                          setCopied(true);
                          toast({ title: 'Link copied to clipboard!' });
                          setTimeout(() => setCopied(false), 2000);
                        } catch {
                          toast({ title: 'Could not copy', description: referral.link, variant: 'destructive' });
                        }
                      }}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Target Ladder */}
            <GlassCard>
              <SectionTitle icon={Trophy}>Milestone Rewards</SectionTitle>
              <div className="mb-6">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <p className="text-sm text-slate-300">
                    {next ? (
                      <>
                        <span className="font-bold text-yellow-400">{next.sales - sales}</span>{' '}
                        more {next.sales - sales === 1 ? 'sale' : 'sales'} to reach{' '}
                        <span className="font-bold text-slate-100">{next.name}</span> — {next.reward}
                      </>
                    ) : (
                      <span className="font-bold text-emerald-400">All milestones achieved! Incredible work.</span>
                    )}
                  </p>
                  <span className="shrink-0 text-sm font-bold text-yellow-400">{progress}% Progress</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {scheme.milestones.map((m: Milestone) => {
                  const hit = sales >= m.sales;
                  return (
                    <div
                      key={m.sales}
                      className={`rounded-2xl border p-4 transition-all ${
                        hit
                          ? 'border-yellow-400/40 bg-yellow-950/20 shadow-md shadow-yellow-500/5'
                          : 'border-slate-800 bg-slate-900/40'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`font-bold ${hit ? 'text-yellow-400' : 'text-slate-300'}`}>{m.name}</span>
                        {hit ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-400" />
                        ) : (
                          <Target className="h-5 w-5 shrink-0 text-slate-600" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-100">{m.sales} sales required</p>
                      <p className="mt-0.5 text-xs text-slate-400">{m.reward}</p>
                      {!hit && <p className="mt-2 text-xs text-slate-500 font-medium">{m.sales - sales} more to go</p>}
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Recent Signups Book */}
            <GlassCard className="p-0 overflow-hidden">
              <div className="p-5 sm:p-6 pb-4 flex items-center justify-between">
                <SectionTitle icon={Users}>Attributed Sign-ups</SectionTitle>
                <span className="text-xs text-slate-400">{signups.length} total registered</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-yellow-400" /> Loading your sign-ups…
                </div>
              ) : signups.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No sign-ups attributed yet. Share your referral link or add leads to the CRM!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-slate-800 bg-slate-950/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">Business</th>
                        <th className="px-5 py-3">Registered</th>
                        <th className="px-5 py-3">Package</th>
                        <th className="px-5 py-3">First Payment</th>
                        <th className="px-5 py-3">Your Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {signups.map((s) => (
                        <tr key={s.businessId} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-100">{s.companyName}</div>
                            <div className="text-xs text-slate-400">{s.ownerName} ({s.ownerEmail})</div>
                            <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[s.status] || STATUS_STYLES.unregistered}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400">{when(s.signedUpAt)}</td>
                          <td className="px-5 py-4 text-slate-200 font-medium">{s.packageType || 'Free Tier'}</td>
                          <td className="px-5 py-4">
                            {s.converted ? (
                              <>
                                <div className="font-bold text-slate-100">{formatRand(s.firstPaymentCents)}</div>
                                <div className="text-xs text-slate-500">{when(s.paidAt)}</div>
                              </>
                            ) : (
                              <span className="text-slate-500 text-xs">Pending payment</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {s.converted ? (
                              <span className="font-bold text-emerald-400">{formatRand(s.commissionCents)}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ======================= TAB 2: LEADS CRM ======================= */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Header & Add Lead Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <Users className="h-6 w-6 text-yellow-400" /> Pipeline &amp; Prospects
                </h2>
                <p className="text-sm text-slate-400">Keep track of business owners you meet and convert them to paid members.</p>
              </div>

              <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold gap-2 shadow-lg shadow-yellow-400/20">
                    <Plus className="h-4 w-4" /> Add Prospect / Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
                  <form onSubmit={handleCreateLead}>
                    <DialogHeader>
                      <DialogTitle>Add New Prospect</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Record a business lead you are reaching out to.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-xs text-slate-300 font-bold">Business Name *</Label>
                        <Input
                          placeholder="e.g. Cape Town Artisans"
                          value={newLead.businessName}
                          onChange={(e) => setNewLead({ ...newLead, businessName: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-slate-100 mt-1"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-300 font-bold">Contact Name</Label>
                          <Input
                            placeholder="e.g. John Doe"
                            value={newLead.contactName}
                            onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                            className="bg-slate-950 border-slate-700 text-slate-100 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-300 font-bold">Phone / WhatsApp</Label>
                          <Input
                            placeholder="e.g. 0821234567"
                            value={newLead.contactPhone}
                            onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                            className="bg-slate-950 border-slate-700 text-slate-100 mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-300 font-bold">Email Address</Label>
                        <Input
                          type="email"
                          placeholder="john@example.co.za"
                          value={newLead.contactEmail}
                          onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-slate-100 mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-300 font-bold">Next Follow-up Date</Label>
                          <Input
                            type="date"
                            value={newLead.nextFollowupAt}
                            onChange={(e) => setNewLead({ ...newLead, nextFollowupAt: e.target.value })}
                            className="bg-slate-950 border-slate-700 text-slate-100 mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-300 font-bold">Notes / Conversation context</Label>
                        <textarea
                          placeholder="Interested in R49 verification fee..."
                          value={newLead.notes}
                          onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                          className="w-full rounded-md bg-slate-950 border border-slate-700 p-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-yellow-400 mt-1 min-h-[80px]"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)} className="border-slate-700">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingLead} className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold">
                        {creatingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Prospect'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search prospects by name, contact, or phone..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-10 bg-slate-900/60 border-slate-800 text-slate-100"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'new', 'contacted', 'interested', 'closed', 'lost'].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={leadStatusFilter === st ? 'default' : 'outline'}
                    onClick={() => setLeadStatusFilter(st)}
                    className={`capitalize text-xs rounded-xl ${
                      leadStatusFilter === st
                        ? 'bg-yellow-400 text-slate-950 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>

            {/* Leads Table */}
            <GlassCard className="p-0 overflow-hidden">
              {filteredLeads.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Users className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-base font-semibold text-slate-300">No prospects matching filter</p>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Start adding local businesses you want to pitch to build your recurring commission pipeline.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-slate-800 bg-slate-950/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">Business / Contact</th>
                        <th className="px-5 py-3">Stage</th>
                        <th className="px-5 py-3">Follow-up</th>
                        <th className="px-5 py-3">Notes</th>
                        <th className="px-5 py-3 text-right">Quick Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLeads.map((lead) => {
                        const cfg = LEAD_STATUS_CONFIG[lead.status] || LEAD_STATUS_CONFIG.new;
                        const cleanPhone = lead.contact_phone?.replace(/\D/g, '') || '';
                        return (
                          <tr key={lead.id} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-100">{lead.business_name}</div>
                              {lead.contact_name && <div className="text-xs text-slate-400">{lead.contact_name}</div>}
                              {lead.contact_email && <div className="text-xs text-slate-500">{lead.contact_email}</div>}
                            </td>

                            <td className="px-5 py-4">
                              <select
                                value={lead.status}
                                onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold bg-slate-950 focus:outline-none focus:ring-1 focus:ring-yellow-400 ${cfg.text} ${cfg.bg}`}
                              >
                                <option value="new">New Lead</option>
                                <option value="contacted">Contacted</option>
                                <option value="interested">High Interest</option>
                                <option value="closed">Converted (Won)</option>
                                <option value="lost">Archived</option>
                              </select>
                            </td>

                            <td className="px-5 py-4 text-xs text-slate-400">
                              {lead.next_followup_at ? (
                                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {when(lead.next_followup_at)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs text-slate-400 max-w-xs truncate">
                              {lead.notes || '—'}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pitchText)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    title="Message on WhatsApp"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </a>
                                )}
                                {lead.contact_email && (
                                  <a
                                    href={`mailto:${lead.contact_email}?subject=VerifiedBizLink%20Invitation&body=${encodeURIComponent(pitchText)}`}
                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                    title="Send Email"
                                  >
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
              )}
            </GlassCard>
          </div>
        )}

        {/* ======================= TAB 3: ACTIVITY STREAM ======================= */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Activity className="h-6 w-6 text-yellow-400" /> Live Activity &amp; Commission Stream
              </h2>
              <p className="text-sm text-slate-400">Real-time log of customer signups, verification purchases, and reviews for your accounts.</p>
            </div>

            <GlassCard>
              {loadingActivities ? (
                <div className="flex items-center justify-center p-12 text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-yellow-400" /> Loading stream…
                </div>
              ) : activities.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No activity logged yet. When attributed businesses sign up or pay fees, events appear here instantly.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {activities.map((ev) => (
                    <div key={ev.id} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-slate-900 bg-yellow-400 flex items-center justify-center shadow">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                            {ev.event_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">{when(ev.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-200">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ======================= TAB 4: TOOLKIT & CALCULATOR ======================= */}
        {activeTab === 'toolkit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission Simulator */}
            <GlassCard className="space-y-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-slate-100">Commission Earnings Simulator</h3>
              </div>

              <p className="text-sm text-slate-400">
                Adjust the sliders below to see your potential monthly and yearly earnings based on your {scheme.ratePercent}% commission rate.
              </p>

              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">Businesses signed up per month:</span>
                    <span className="font-bold text-yellow-400">{calcSignups} businesses</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcSignups}
                    onChange={(e) => setCalcSignups(Number(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">Average Package Price:</span>
                    <span className="font-bold text-yellow-400">R{calcPlanPrice} / mo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: 'Verified Fee (R49)', val: 49 },
                      { label: 'Growth Plan (R299)', val: 299 },
                      { label: 'Scale Plan (R699)', val: 699 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setCalcPlanPrice(p.val)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          calcPlanPrice === p.val
                            ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result Callout */}
              <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-950/30 to-slate-900 p-5 text-center space-y-2">
                <p className="text-xs uppercase tracking-widest font-bold text-yellow-400">Estimated Monthly Commission</p>
                <p className="text-4xl font-extrabold text-slate-100">
                  R{Math.round(calcSignups * calcPlanPrice * (scheme.ratePercent / 100)).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">
                  Annual Projection: R{Math.round(calcSignups * calcPlanPrice * (scheme.ratePercent / 100) * 12).toLocaleString()} / year
                </p>
              </div>
            </GlassCard>

            {/* Quick Share & Pitch Generator */}
            <GlassCard className="space-y-6">
              <div className="flex items-center gap-2">
                <Share2 className="h-6 w-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-slate-100">Marketing Assets &amp; Quick Share</h3>
              </div>

              {/* QR Code & Share link */}
              {referral?.qrUrl && (
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referral.qrUrl} alt="Referral QR" className="h-20 w-20 rounded-xl bg-white p-1 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">Your Marketer QR Code</p>
                    <p className="text-xs text-slate-400">Print or present this to business owners to let them register directly on the spot.</p>
                  </div>
                </div>
              )}

              {/* Ready-to-use Pitch */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                  Ready-to-Send WhatsApp Pitch Message
                </Label>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300 relative">
                  <p>{pitchText}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1 text-xs border-slate-700 hover:bg-slate-800"
                    onClick={async () => {
                      await navigator.clipboard.writeText(pitchText);
                      toast({ title: 'Pitch copied to clipboard!' });
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copy Pitch Text
                  </Button>
                </div>
              </div>

              {/* Elevator bullet points */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Why Businesses Say Yes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span>Instant Gold Verified Badge</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span>Builds Trust with Customers</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span>Free Tier + Only R49 for badge</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span>Photo Gallery &amp; Reviews</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
