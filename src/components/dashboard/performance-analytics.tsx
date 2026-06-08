"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PerformanceAnalytics() {
  // Mock data - replace with real API call
  const impressionData = [
    { day: "Mon", impressions: 1200, clicks: 240, conversions: 24 },
    { day: "Tue", impressions: 1900, clicks: 380, conversions: 38 },
    { day: "Wed", impressions: 1500, clicks: 300, conversions: 30 },
    { day: "Thu", impressions: 2200, clicks: 440, conversions: 44 },
    { day: "Fri", impressions: 2800, clicks: 560, conversions: 56 },
    { day: "Sat", impressions: 2300, clicks: 460, conversions: 46 },
    { day: "Sun", impressions: 1800, clicks: 360, conversions: 36 },
  ];

  const performanceMetrics = [
    { label: "Total Impressions", value: "13.3K", change: "+12%", color: "from-blue-500 to-blue-600" },
    { label: "Click-Through Rate", value: "4.2%", change: "+0.8%", color: "from-green-500 to-green-600" },
    { label: "Conversion Rate", value: "2.1%", change: "+0.3%", color: "from-purple-500 to-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {performanceMetrics.map((metric, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <p className="text-xs text-gray-400 mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-white">{metric.value}</p>
            <p className="text-xs text-green-400 mt-1">{metric.change}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={impressionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis stroke="#9ca3af" dataKey="day" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ fill: "#fbbf24" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Ads */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Recent Ads</h4>
        <div className="space-y-2">
          {[
            { title: "Summer Sale 50% Off", impressions: 3200, clicks: 128 },
            { title: "Free Shipping Today", impressions: 2800, clicks: 84 },
            { title: "New Arrivals", impressions: 2100, clicks: 63 },
          ].map((ad, idx) => (
            <div key={idx} className="p-3 rounded bg-gray-800/20 border border-gray-700/30 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white">{ad.title}</p>
                <p className="text-xs text-gray-500">
                  {ad.impressions.toLocaleString()} impressions • {ad.clicks} clicks
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-yellow-400">
                  {((ad.clicks / ad.impressions) * 100).toFixed(1)}% CTR
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
