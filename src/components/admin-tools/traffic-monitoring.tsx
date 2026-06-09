'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, Clock, MapPin, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface TrafficMetric {
  time: string;
  visitors: number;
  sessions: number;
  pageViews: number;
}

export function TrafficMonitoring() {
  const [metrics, setMetrics] = useState<TrafficMetric[]>([]);

  useEffect(() => {
    // Simulate real-time data
    const data: TrafficMetric[] = [
      { time: '12:00', visitors: 245, sessions: 189, pageViews: 562 },
      { time: '13:00', visitors: 321, sessions: 267, pageViews: 789 },
      { time: '14:00', visitors: 278, sessions: 234, pageViews: 645 },
      { time: '15:00', visitors: 398, sessions: 312, pageViews: 923 },
      { time: '16:00', visitors: 467, sessions: 389, pageViews: 1045 },
      { time: '17:00', visitors: 542, sessions: 456, pageViews: 1289 },
      { time: '18:00', visitors: 612, sessions: 512, pageViews: 1456 },
    ];
    setMetrics(data);
  }, []);

  const currentVisitors = metrics[metrics.length - 1]?.visitors || 0;
  const currentSessions = metrics[metrics.length - 1]?.sessions || 0;
  const avgPageViews =
    Math.round(metrics.reduce((sum, m) => sum + m.pageViews, 0) / metrics.length) || 0;

  const topPages = [
    { name: '/dashboard', views: 2456, users: 1234 },
    { name: '/vetting', views: 1890, users: 945 },
    { name: '/discover', views: 1567, users: 834 },
    { name: '/settings', views: 1234, users: 678 },
    { name: '/news', views: 987, users: 512 },
  ];

  const topCountries = [
    { country: 'South Africa', percentage: 78 },
    { country: 'United States', percentage: 12 },
    { country: 'United Kingdom', percentage: 6 },
    { country: 'Australia', percentage: 4 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-400 text-sm">Current Visitors</h4>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{currentVisitors}</span>
            <span className="text-green-400 text-sm">↑ +8%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Last hour: {currentVisitors - 50} users</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-400 text-sm">Active Sessions</h4>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{currentSessions}</span>
            <span className="text-green-400 text-sm">↑ +5%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Avg session: 12m 34s</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-400 text-sm">Avg Page Views</h4>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{avgPageViews}</span>
            <span className="text-green-400 text-sm">↑ +12%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Per user: 2.8 pages</p>
        </div>
      </div>

      {/* Visitor Trends */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Visitor Trends (24H)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorVisitors)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Pages & Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Top Pages
          </h3>
          <div className="space-y-3">
            {topPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-white">{page.name}</p>
                  <p className="text-xs text-gray-500">{page.users} unique users</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-400">{page.views}</p>
                  <p className="text-xs text-gray-500">views</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-400" />
            Geographic Distribution
          </h3>
          <div className="space-y-3">
            {topCountries.map((loc, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-300">{loc.country}</p>
                  <p className="font-bold text-white">{loc.percentage}%</p>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                    style={{ width: `${loc.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Status */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-900/50 border border-green-500/30">
            <p className="text-gray-400 text-sm mb-2">API Response Time</p>
            <p className="text-2xl font-bold text-green-400">142ms</p>
            <p className="text-xs text-gray-500 mt-1">✓ Optimal</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50 border border-green-500/30">
            <p className="text-gray-400 text-sm mb-2">Database Query Time</p>
            <p className="text-2xl font-bold text-green-400">89ms</p>
            <p className="text-xs text-gray-500 mt-1">✓ Optimal</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50 border border-green-500/30">
            <p className="text-gray-400 text-sm mb-2">Server Uptime</p>
            <p className="text-2xl font-bold text-green-400">99.98%</p>
            <p className="text-xs text-gray-500 mt-1">✓ Excellent</p>
          </div>
        </div>
      </div>
    </div>
  );
}
