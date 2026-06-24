'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Analytics {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  avgTrustScore: number;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics/admin');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const stats = [
    {
      label: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Total Businesses',
      value: analytics?.totalBusinesses || 0,
      icon: BarChart3,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Verified Businesses',
      value: analytics?.verifiedBusinesses || 0,
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Avg Trust Score',
      value: `${Math.round((analytics?.avgTrustScore || 0) * 100)}%`,
      icon: TrendingUp,
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <Link href="/admin" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        {/* Header */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-yellow-400" />
              <CardTitle className="text-white text-2xl">Platform Analytics</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
            </div>
          ) : (
            stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="bg-slate-800 border-slate-600 hover:border-yellow-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                    <p className="text-white text-3xl font-bold mt-2">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Chart Placeholder */}
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="border-b border-slate-600">
            <CardTitle className="text-white">Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-12">
            <div className="h-64 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
              <p className="text-slate-400">Chart visualization loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
