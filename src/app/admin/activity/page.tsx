'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, UserPlus, Receipt, Search, BadgeCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard } from '@/components/admin/ui';

interface Signup {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  companyName: string | null;
  industry: string | null;
  planType: string | null;
  businessStatus: string | null;
  assistedSignup: boolean;
  assistedBy: string | null;
}

interface Payment {
  id: string;
  reference: string;
  planType: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  fullName: string;
  email: string;
  companyName: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-500/15 text-green-700',
  completed: 'bg-green-500/15 text-green-700',
  reviewing: 'bg-blue-500/15 text-blue-700',
  pending: 'bg-amber-500/15 text-amber-700',
  rejected: 'bg-red-500/15 text-red-700',
  failed: 'bg-red-500/15 text-red-700',
  unregistered: 'bg-gray-200 text-gray-600',
};

const money = (cents: number, currency: string) =>
  `${currency === 'ZAR' ? 'R' : currency + ' '}${(Number(cents) || 0).toLocaleString('en-ZA')}`;

const when = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminActivityPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'signups' | 'payments'>('signups');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/activity');
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          setSignups(data.signups || []);
          setPayments(data.payments || []);
        }
      } catch (e) {
        console.error('Failed to load activity:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const q = search.toLowerCase();
  const filteredSignups = signups.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      (s.companyName || '').toLowerCase().includes(q)
  );
  const filteredPayments = payments.filter(
    (p) =>
      p.fullName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q)
  );

  const revenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const last24h = signups.filter(
    (s) => Date.now() - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000
  ).length;

  return (
    <AdminBackground>
      <AdminPageHeader title="Activity & Receipts" subtitle="Every sign-up and every payment, as it happens">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total Sign-ups" value={signups.length} icon={UserPlus} gradient="from-teal-500 to-cyan-500" loading={loading} />
          <StatCard label="New (24h)" value={last24h} icon={Clock} gradient="from-blue-500 to-cyan-500" loading={loading} />
          <StatCard label="Payments" value={payments.length} icon={Receipt} gradient="from-purple-500 to-pink-500" loading={loading} />
          <StatCard label="Revenue (paid)" value={money(revenue, 'ZAR')} icon={BadgeCheck} gradient="from-green-500 to-emerald-500" loading={loading} />
        </div>

        <AdminCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {([['signups', 'Sign-ups'], ['payments', 'Payments & Receipts']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    tab === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search name, email, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-gray-200 bg-white pl-10 text-gray-900 placeholder-gray-400 focus-visible:ring-amber-400"
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading activity…
            </div>
          ) : tab === 'signups' ? (
            filteredSignups.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No sign-ups found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3">Who</th>
                      <th className="px-5 py-3">Business</th>
                      <th className="px-5 py-3">Signed up for</th>
                      <th className="px-5 py-3">Verified</th>
                      <th className="px-5 py-3">Assisted</th>
                      <th className="px-5 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSignups.map((s) => (
                      <tr key={s.id} className="text-gray-600 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">{s.fullName}</div>
                          <div className="text-xs text-gray-500">{s.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900">{s.companyName || '—'}</div>
                          {s.businessStatus && (
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[s.businessStatus] || STATUS_STYLES.unregistered}`}>
                              {s.businessStatus}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900">{s.industry || '—'}</div>
                          <div className="text-xs text-gray-500">plan: {s.planType || 'free'}</div>
                        </td>
                        <td className="px-5 py-3">
                          {s.emailVerified ? (
                            <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-700">Verified</span>
                          ) : (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {s.assistedSignup ? (
                            <span className="font-semibold text-gray-900">{s.assistedBy || 'Yes'}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{when(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No payments recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="text-gray-600 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-900">{p.reference}</td>
                      <td className="px-5 py-3">
                        <div className="text-gray-900">{p.fullName}</div>
                        <div className="text-xs text-gray-500">{p.companyName || p.email}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-900">{p.planType}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{money(p.amount, p.currency)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[p.status] || STATUS_STYLES.unregistered}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{when(p.completedAt || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
