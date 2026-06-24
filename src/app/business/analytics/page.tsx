'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, Eye, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function BusinessAnalyticsPage() {
  const metrics = [
    { label: 'Profile Views', value: '1,234', trend: '+12%', icon: Eye, color: 'text-blue-600' },
    { label: 'Contact Requests', value: '42', trend: '+5%', icon: Users, color: 'text-green-600' },
    { label: 'Average Rating', value: '4.8', trend: '+0.3', icon: TrendingUp, color: 'text-yellow-600' },
    { label: 'Search Impressions', value: '3,845', trend: '+28%', icon: BarChart3, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Analytics</h1>
          <p className="text-gray-600">Track your business performance and engagement metrics</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                    <span className="text-sm font-semibold text-green-600">{metric.trend}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center border border-gray-200">
              <p className="text-gray-500">Chart visualization loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
