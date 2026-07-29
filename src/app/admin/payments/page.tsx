'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, CheckCircle2, Clock, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle } from '@/components/admin/ui';

interface Payment {
  id: string;
  user_id: string;
  plan_type: string | null;
  amount: number;
  currency: string | null;
  status: string;
  reference: string | null;
  description: string | null;
  ad_id: string | null;
  payfast_reference: string | null;
  created_at: string;
  completed_at: string | null;
  user_name: string | null;
  user_email: string | null;
}

interface PaymentStats {
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  revenueCents: number;
  revenue30dCents: number;
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-700',
  pending: 'bg-yellow-500/10 text-yellow-400',
  failed: 'bg-red-500/10 text-red-700',
};

const formatRand = (cents: number) =>
  `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchPayments = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setStats(data.stats || null);
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(filter);
  }, [filter, fetchPayments]);

  const statCards = [
    { label: 'Revenue (Completed)', value: stats ? formatRand(stats.revenueCents) : '—', icon: TrendingUp, gradient: 'from-yellow-500 to-yellow-400' },
    { label: 'Revenue (30 Days)', value: stats ? formatRand(stats.revenue30dCents) : '—', icon: TrendingUp, gradient: 'from-cyan-500 to-blue-500' },
    { label: 'Completed', value: stats?.completedCount ?? 0, icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Pending / Failed', value: `${stats?.pendingCount ?? 0} / ${stats?.failedCount ?? 0}`, icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <AdminBackground>
      <AdminPageHeader title="Payment Gateway" subtitle="PayFast transactions, revenue, and status">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statCards.map((s) => <StatCard key={s.label} {...s} loading={loading && !stats} />)}
        </div>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6 pb-0 sm:pb-0">
            <SectionTitle icon={CreditCard}>Transactions</SectionTitle>
            <div className="flex gap-2 pb-5 sm:pb-6">
              {['all', 'completed', 'pending', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    filter === s ? 'bg-yellow-500 text-slate-950' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-gray-200 text-left text-gray-500">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-100">
                      <td className="px-5 py-3 text-gray-900">
                        <div className="font-medium">{p.user_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{p.user_email}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{p.description || p.plan_type || '—'}</td>
                      <td className="px-5 py-3 text-gray-900 font-medium">{formatRand(p.amount)}</td>
                      <td className="px-5 py-3">
                        <Badge className={STATUS_BADGE[p.status] || 'bg-slate-500/10 text-slate-700'}>
                          {p.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {p.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {p.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{p.payfast_reference || p.reference || '—'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(p.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
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
