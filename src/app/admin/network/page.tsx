'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, Users, TrendingUp, MessageSquare, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle } from '@/components/admin/ui';

interface NetworkStats {
  totalConnections: number;
  activeConnections: number;
  pendingRequests: number;
  avgConnectionsPerUser: number;
  topUser: { name: string; count: number } | null;
  dbLatencyMs: number;
}

export default function AdminNetworkPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/network');
        if (res.ok) {
          const data = await res.json();
          if (active) setStats(data.stats);
        }
      } catch (e) {
        console.error('Failed to fetch network stats:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const cards = [
    { label: 'Total Connections', value: stats?.totalConnections ?? 0, icon: Users, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Active Connections', value: stats?.activeConnections ?? 0, icon: Network, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Pending Requests', value: stats?.pendingRequests ?? 0, icon: MessageSquare, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Avg Per User', value: stats?.avgConnectionsPerUser ?? 0, icon: TrendingUp, gradient: 'from-purple-500 to-pink-500' },
  ];

  const healthy = (stats?.dbLatencyMs ?? 9999) < 1500;

  return (
    <AdminBackground>
      <AdminPageHeader title="Network Statistics" subtitle="Live connection metrics across the platform">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => <StatCard key={c.label} {...c} loading={loading} />)}
        </div>

        <AdminCard>
          <SectionTitle icon={Activity}>Connection Overview</SectionTitle>
          <div className="divide-y divide-white/5">
            <Row label="System Health" value={
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${healthy ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {loading ? '…' : healthy ? 'Healthy' : 'Degraded'}
              </span>
            } />
            <Row label="Most Connected User" value={
              <span className="font-semibold text-amber-400">
                {loading ? '…' : stats?.topUser ? `${stats.topUser.name} (${stats.topUser.count})` : 'None yet'}
              </span>
            } />
            <Row label="Database Latency" value={
              <span className="font-semibold text-amber-400">{loading ? '…' : `${stats?.dbLatencyMs} ms`}</span>
            } />
          </div>
        </AdminCard>
      </div>
    </AdminBackground>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-gray-300">{label}</span>
      {value}
    </div>
  );
}
