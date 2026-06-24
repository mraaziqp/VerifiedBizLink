'use client';

import { ArrowLeft, BarChart3, TrendingUp, Users, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RamoneStatsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-400" />
            Vetting Statistics
          </h1>
          <p className="text-gray-400 mt-2">Real-time analytics and verification metrics</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">This Month</p>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400">247</p>
              <p className="text-xs text-gray-500 mt-2">Verifications completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">This Week</p>
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-400">62</p>
              <p className="text-xs text-gray-500 mt-2">Documents reviewed</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Approval Rate</p>
                <CheckCircle2 className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-400">98.7%</p>
              <p className="text-xs text-gray-500 mt-2">Quality standard</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg Processing</p>
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400">2.3h</p>
              <p className="text-xs text-gray-500 mt-2">Per business</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Verification Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-900 rounded flex items-center justify-center">
                <p className="text-gray-500">Chart visualization would render here</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Document Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-900 rounded flex items-center justify-center">
                <p className="text-gray-500">Chart visualization would render here</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Industry Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { industry: 'Retail', count: 89, pct: 35 },
                  { industry: 'Technology', count: 56, pct: 22 },
                  { industry: 'Services', count: 78, pct: 31 },
                  { industry: 'Other', count: 24, pct: 12 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.industry}</span>
                      <span className="text-gray-400">{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Top Performance Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['Monday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                    <span className="text-gray-300">{day}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded h-2">
                        <div className="bg-green-500 h-2 rounded" style={{ width: `${80 - i * 15}%` }} />
                      </div>
                      <span className="text-gray-400 text-sm">{45 - i * 5}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
