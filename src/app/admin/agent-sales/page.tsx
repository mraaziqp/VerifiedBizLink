'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy, Users, TrendingUp, Search, ShieldCheck, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { AdminBackground, AdminCard, AdminPageHeader, SectionTitle } from '@/components/admin/ui';

interface AgentSignup {
  id: string;
  company_name: string;
  assisted_by: string | null;
  package_type: string | null;
  status: string;
  created_at: string;
  owner_name: string;
}

interface Tier {
  key: string;
  name: string;
}

interface AgentSummary {
  agent: string;
  total: number;
  verified: number;
  byTier: Record<string, number>;
  businesses: AgentSignup[];
}

export default function AgentSalesPage() {
  const { user, loading: authLoading } = useAuth();
  const [signups, setSignups] = useState<AgentSignup[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    let active = true;
    (async () => {
      try {
        const [signupsRes, tiersRes] = await Promise.all([
          fetch('/api/admin/agent-signups'),
          fetch('/api/admin/tiers'),
        ]);
        if (signupsRes.ok) {
          const data = await signupsRes.json();
          if (active) setSignups(data.signups || []);
        }
        if (tiersRes.ok) {
          const data = await tiersRes.json();
          if (active) setTiers(data.tiers || []);
        }
      } catch (error) {
        console.error('Failed to load agent sales data:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authLoading, user]);

  const tierName = (key: string | null) => tiers.find((t) => t.key === key)?.name || key || 'Free';

  const summaries = useMemo<AgentSummary[]>(() => {
    const byAgent = new Map<string, AgentSummary>();
    for (const s of signups) {
      const agent = (s.assisted_by || 'Organic / Unassigned').trim() || 'Organic / Unassigned';
      if (!byAgent.has(agent)) {
        byAgent.set(agent, { agent, total: 0, verified: 0, byTier: {}, businesses: [] });
      }
      const entry = byAgent.get(agent)!;
      entry.total += 1;
      if (s.status === 'verified') entry.verified += 1;
      const tierKey = s.package_type || 'free';
      entry.byTier[tierKey] = (entry.byTier[tierKey] || 0) + 1;
      entry.businesses.push(s);
    }
    return Array.from(byAgent.values()).sort((a, b) => b.total - a.total);
  }, [signups]);

  const filteredSummaries = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((s) =>
      s.agent.toLowerCase().includes(q) ||
      s.businesses.some((b) => b.company_name.toLowerCase().includes(q) || b.owner_name.toLowerCase().includes(q))
    );
  }, [summaries, search]);

  const totalAssisted = signups.length;
  const totalVerified = signups.filter((s) => s.status === 'verified').length;

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
        title="Marketer &amp; Agent Sales Performance"
        subtitle="Assisted business signups, conversion rates, and revenue distribution across all registered marketers"
      >
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-900 bg-white hover:bg-amber-50">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-slate-200 bg-white shadow-xs p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Marketers</span>
            <p className="text-3xl font-black text-slate-900">{summaries.length}</p>
            <p className="text-xs text-slate-400">Marketers generating business signups</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Assisted Signups</span>
            <p className="text-3xl font-black text-amber-600">{totalAssisted}</p>
            <p className="text-xs text-slate-400">Businesses registered via tracking links</p>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-xs p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Businesses</span>
            <p className="text-3xl font-black text-emerald-600">{totalVerified}</p>
            <p className="text-xs text-slate-400">
              {totalAssisted > 0 ? Math.round((totalVerified / totalAssisted) * 100) : 0}% verification conversion rate
            </p>
          </Card>
        </div>

        {/* Filter / Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by marketer name or client business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-slate-200 rounded-xl"
          />
        </div>

        {/* Leaderboard Card */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-500" /> Loading sales leaderboard…
          </div>
        ) : filteredSummaries.length === 0 ? (
          <AdminCard>
            <p className="text-center py-10 text-slate-500">No marketer records found.</p>
          </AdminCard>
        ) : (
          <AdminCard>
            <SectionTitle icon={Trophy}>Marketer Sales Leaderboard</SectionTitle>
            <div className="space-y-3">
              {filteredSummaries.map((s, idx) => {
                const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                const isExpanded = expanded === s.agent;
                return (
                  <div key={s.agent} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : s.agent)}
                      className="w-full flex items-center justify-between gap-4 p-4.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg font-black shrink-0 w-8 text-center">{rankMedal}</span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-base">{s.agent}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {s.total} sign up{s.total === 1 ? '' : 's'} · <span className="font-bold text-emerald-600">{s.verified} verified</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex flex-wrap gap-1.5 justify-end">
                          {Object.entries(s.byTier).map(([tierKey, count]) => (
                            <span key={tierKey} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                              {tierName(tierKey)}: {count}
                            </span>
                          ))}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100 p-2">
                        {s.businesses.map((b) => (
                          <div key={b.id} className="flex items-center justify-between px-3 py-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{b.company_name}</span>
                              <span className="text-slate-500"> — {b.owner_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {tierName(b.package_type)}
                              </Badge>
                              <span className="text-slate-400">{new Date(b.created_at).toLocaleDateString('en-ZA')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AdminCard>
        )}
      </div>
    </AdminBackground>
  );
}
