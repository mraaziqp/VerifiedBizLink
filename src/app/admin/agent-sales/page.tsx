'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      const agent = (s.assisted_by || 'Unknown').trim() || 'Unknown';
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
      <AdminPageHeader title="Agent Sales Dashboard" subtitle="Assisted signups grouped by agent, with the tier each business took">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : summaries.length === 0 ? (
          <AdminCard>
            <p className="text-center py-10 text-gray-500">No assisted signups yet.</p>
          </AdminCard>
        ) : (
          <AdminCard>
            <SectionTitle icon={Trophy}>Agent Leaderboard</SectionTitle>
            <div className="space-y-3">
              {summaries.map((s) => (
                <div key={s.agent} className="rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === s.agent ? null : s.agent)}
                    className="w-full flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">{s.agent}</p>
                      <p className="text-xs text-gray-500">
                        {s.total} sign up{s.total === 1 ? '' : 's'} · {s.verified} verified
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                      {Object.entries(s.byTier).map(([tierKey, count]) => (
                        <span key={tierKey} className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {tierName(tierKey)}: {count}
                        </span>
                      ))}
                    </div>
                  </button>
                  {expanded === s.agent && (
                    <div className="border-t border-gray-200 divide-y divide-gray-100">
                      {s.businesses.map((b) => (
                        <div key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-gray-900">{b.company_name}</span>
                            <span className="text-gray-500"> — {b.owner_name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{tierName(b.package_type)}</span>
                            <span>{new Date(b.created_at).toLocaleDateString('en-ZA')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AdminCard>
        )}
      </div>
    </AdminBackground>
  );
}
