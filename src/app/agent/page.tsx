'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Users, TrendingUp, Wallet, Clock, Trophy, Target, CheckCircle2, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard, GlassPageHeader, SectionTitle, StatCard } from '@/components/shared/glass-ui';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';
import {
  MILESTONES, COMMISSION_RATE, currentMilestone, nextMilestone, progressToNext, formatRand,
} from '@/lib/commission';

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

interface Totals {
  signups: number;
  sales: number;
  pending: number;
  awaitingPayment: number;
  revenueCents: number;
  commissionCents: number;
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-500/15 text-green-700',
  reviewing: 'bg-blue-500/15 text-blue-700',
  pending: 'bg-amber-500/15 text-amber-700',
  rejected: 'bg-red-500/15 text-red-700',
  unregistered: 'bg-gray-200 text-gray-600',
};

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—';

export default function AgentPortalPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);

  // Check `loading` before `user` — reading user too early flash-redirects a
  // genuinely logged-in agent to the home page.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role, AGENT_PORTAL_ROLES)) router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/agent/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          setTotals(data.totals);
          setSignups(data.signups || []);
        }
      } catch (e) {
        console.error('Failed to load agent dashboard:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const sales = totals?.sales ?? 0;
  const reached = currentMilestone(sales);
  const next = nextMilestone(sales);
  const progress = progressToNext(sales);

  return (
    <GlassBackground>
      <GlassPageHeader
        title="Sales Portal"
        subtitle={`${user.fullName || user.email} — commission is ${Math.round(COMMISSION_RATE * 100)}% of each business's first payment`}
      >
        <Button variant="outline" size="sm" className="gap-2 border-gray-300 text-gray-600" onClick={logout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </GlassPageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:py-10">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total sign-ups" value={totals?.signups ?? 0} icon={Users} gradient="from-blue-500 to-cyan-500" loading={loading} />
          <StatCard label="Paid sales" value={sales} icon={TrendingUp} gradient="from-green-500 to-emerald-500" loading={loading} />
          <StatCard label="Awaiting payment" value={totals?.pending ?? 0} icon={Clock} gradient="from-amber-500 to-orange-500" loading={loading} />
          <StatCard label="Commission earned" value={formatRand(totals?.commissionCents ?? 0)} icon={Wallet} gradient="from-purple-500 to-pink-500" loading={loading} />
        </div>

        {/* Gamified target ladder */}
        <GlassCard>
          <SectionTitle icon={Trophy}>Your targets</SectionTitle>
          <div className="mb-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <p className="text-sm text-gray-600">
                {next ? (
                  <>
                    <span className="font-semibold text-gray-900">{next.sales - sales}</span>{' '}
                    more {next.sales - sales === 1 ? 'sale' : 'sales'} to reach{' '}
                    <span className="font-semibold text-gray-900">{next.name}</span> — {next.reward}
                  </>
                ) : (
                  <span className="font-semibold text-gray-900">Every target cleared. Outstanding.</span>
                )}
              </p>
              <span className="shrink-0 text-sm font-semibold text-amber-600">{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MILESTONES.map((m) => {
              const hit = sales >= m.sales;
              return (
                <div
                  key={m.sales}
                  className={`rounded-xl border p-4 transition-colors ${
                    hit ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`font-bold ${hit ? 'text-amber-700' : 'text-gray-700'}`}>{m.name}</span>
                    {hit
                      ? <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />
                      : <Target className="h-5 w-5 shrink-0 text-gray-400" />}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{m.sales} sales</p>
                  <p className="mt-0.5 text-sm text-gray-500">{m.reward}</p>
                  {!hit && (
                    <p className="mt-2 text-xs text-gray-400">{m.sales - sales} to go</p>
                  )}
                </div>
              );
            })}
          </div>
          {reached && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              🏆 You&apos;ve unlocked <strong>{reached.name}</strong> — {reached.reward}.
            </p>
          )}
        </GlassCard>

        {/* The agent's book */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 sm:p-6 pb-0">
            <SectionTitle icon={Users}>Your sign-ups</SectionTitle>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your sign-ups…
            </div>
          ) : signups.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No sign-ups attributed to you yet. When you complete an assisted sign-up and
              select your name, the business appears here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Business</th>
                    <th className="px-5 py-3">Signed up</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">First payment</th>
                    <th className="px-5 py-3">Your commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((s) => (
                    <tr key={s.businessId} className="text-gray-600 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{s.companyName}</div>
                        <div className="text-xs text-gray-500">{s.ownerName}</div>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[s.status] || STATUS_STYLES.unregistered}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{when(s.signedUpAt)}</td>
                      <td className="px-5 py-3 text-gray-900">{s.packageType}</td>
                      <td className="px-5 py-3">
                        {s.converted ? (
                          <>
                            <div className="font-semibold text-gray-900">{formatRand(s.firstPaymentCents)}</div>
                            <div className="text-xs text-gray-500">{when(s.paidAt)}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">Not yet paid</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {s.converted ? (
                          <span className="font-semibold text-green-700">{formatRand(s.commissionCents)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
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
    </GlassBackground>
  );
}
