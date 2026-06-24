'use client';

import { ArrowLeft, TrendingUp, Award, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RamonePerformancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-pink-400" />
            Your Performance
          </h1>
          <p className="text-gray-400 mt-2">Personal metrics and quality analytics</p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Verified</p>
                <Award className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400">847</p>
              <p className="text-xs text-gray-500 mt-2">All-time businesses</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg Trust Score</p>
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400">89.3%</p>
              <p className="text-xs text-gray-500 mt-2">Quality average</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Fastest Review</p>
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-400">45m</p>
              <p className="text-xs text-gray-500 mt-2">Personal record</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Consistency</p>
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-400">96%</p>
              <p className="text-xs text-gray-500 mt-2">Quality consistency</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Monthly Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { month: 'January', verified: 68, rejected: 2, avg_time: '2.1h', quality: 97 },
                  { month: 'February', verified: 75, rejected: 1, avg_time: '2.3h', quality: 99 },
                  { month: 'March', verified: 104, rejected: 2, avg_time: '1.9h', quality: 98 },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-gray-900 rounded-lg">
                    <div className="flex justify-between mb-3">
                      <h4 className="font-semibold text-white">{stat.month}</h4>
                      <span className="text-green-400 font-bold">{stat.quality}% Quality</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Verified</p>
                        <p className="text-white font-semibold">{stat.verified}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Avg Time</p>
                        <p className="text-white font-semibold">{stat.avg_time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { metric: 'Document Accuracy', value: 99.2 },
                  { metric: 'First-Time Approval Rate', value: 96.8 },
                  { metric: 'Customer Satisfaction', value: 98.5 },
                  { metric: 'On-Time Completion', value: 97.3 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">{item.metric}</span>
                      <span className="text-green-400 font-bold">{item.value}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${item.value}%` }}
                      />
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
