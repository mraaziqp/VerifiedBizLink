'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, Eye, Users, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';

interface BusinessStats {
  views: number;
  week_views: number;
  connections: number;
  reviews: number;
}

export default function BusinessAnalyticsPage() {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data?.stats ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label: 'Total Profile Views', value: stats?.views ?? 0, icon: Eye, color: 'text-blue-400' },
    { label: 'Views This Week', value: stats?.week_views ?? 0, icon: BarChart3, color: 'text-purple-400' },
    { label: 'Connections', value: stats?.connections ?? 0, icon: Users, color: 'text-green-400' },
    { label: 'Reviews', value: stats?.reviews ?? 0, icon: Star, color: 'text-yellow-400' },
  ];

  return (
    <GlassBackground>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className={`inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 mb-6 rounded-lg ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Business Analytics</h1>
          <p className="text-slate-400">Track your business performance and engagement metrics</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label} className="bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                      <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
                      <p className="text-3xl font-bold text-slate-100">{metric.value.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100">Full Performance Center</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">
                  For trend charts, Active Ads, and profile completion, see the full{' '}
                  <Link href="/business/dashboard" className="text-yellow-500 hover:underline">Business Dashboard</Link>.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </GlassBackground>
  );
}
