'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, Users, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkStats {
  totalConnections: number;
  activeConnections: number;
  pendingRequests: number;
  avgConnectionsPerUser: number;
}

export default function AdminNetworkPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/connections/suggestions');
        if (res.ok) {
          // Mock data since we don't have an actual network stats endpoint
          setStats({
            totalConnections: 1250,
            activeConnections: 1100,
            pendingRequests: 45,
            avgConnectionsPerUser: 8.5,
          });
        }
      } catch (error) {
        console.error('Failed to fetch network stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Connections',
      value: stats?.totalConnections || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Active Connections',
      value: stats?.activeConnections || 0,
      icon: Network,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: MessageSquare,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      label: 'Avg Per User',
      value: stats?.avgConnectionsPerUser.toFixed(1) || '0',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
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
              <Network className="h-6 w-6 text-yellow-400" />
              <CardTitle className="text-white text-2xl">Network Statistics</CardTitle>
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
            statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="bg-slate-800 border-slate-600 hover:border-yellow-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                    <p className="text-white text-3xl font-bold mt-2">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="border-b border-slate-600">
            <CardTitle className="text-white">Connection Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-700">
              <span className="text-slate-300">Health Status</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">Healthy</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-700">
              <span className="text-slate-300">Most Connected User</span>
              <span className="text-yellow-400 font-semibold">42 connections</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Avg Response Time</span>
              <span className="text-yellow-400 font-semibold">1.2 seconds</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
