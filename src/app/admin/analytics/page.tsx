'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, CheckCircle2, Building2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle } from '@/components/admin/ui';

interface Analytics {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingVerifications?: number;
  avgTrustScore: number;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/analytics/admin');
        if (res.ok) {
          const data = await res.json();
          if (active) setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: 'Total Users', value: analytics?.totalUsers ?? 0, icon: Users, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Total Businesses', value: analytics?.totalBusinesses ?? 0, icon: Building2, gradient: 'from-purple-500 to-pink-500' },
    { label: 'Verified Businesses', value: analytics?.verifiedBusinesses ?? 0, icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Pending Review', value: analytics?.pendingVerifications ?? 0, icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  ];

  const chartData = [
    { name: 'Businesses', value: analytics?.totalBusinesses ?? 0 },
    { name: 'Verified', value: analytics?.verifiedBusinesses ?? 0 },
    { name: 'Pending', value: analytics?.pendingVerifications ?? 0 },
    { name: 'Users', value: analytics?.totalUsers ?? 0 },
  ];

  return (
    <AdminBackground>
      <AdminPageHeader title="Platform Analytics" subtitle="Real-time platform metrics and performance">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>

        <AdminCard>
          <SectionTitle icon={BarChart3}>Platform Breakdown</SectionTitle>
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="value" fill="#fbbf24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
