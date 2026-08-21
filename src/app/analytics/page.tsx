"use client";

import { useState, useEffect } from "react";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, Users, ShieldCheck, FileText } from "lucide-react";

interface AnalyticsData {
  stats: {
    recentPosts: number;
    totalPosts: number;
    recentConnections: number;
    totalConnections: number;
    trustScore: number;
    businessStatus: string;
  };
  connectionsByMonth: { month: string; connections: number }[];
}

const chartConfig = {
  connections: {
    label: "Connections",
    color: "hsl(var(--primary))",
  },
  score: {
    label: "Trust Score",
    color: "hsl(var(--primary))",
  },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/analytics")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const connectionsByMonth = data?.connectionsByMonth ?? [];

  // Build a single-point bar for the trust score
  const trustScoreData = stats
    ? [{ label: "Your Score", score: stats.trustScore }]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-[max(env(safe-area-inset-top,0px),2.5rem)] pb-6 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="hidden md:block md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <div className="text-sm text-gray-500 font-medium">Last 30 Days</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Posts Published",
                  value: loading ? null : String(stats?.recentPosts ?? 0),
                  icon: FileText,
                  sub: `${stats?.totalPosts ?? 0} total`,
                },
                {
                  label: "New Connections",
                  value: loading ? null : String(stats?.recentConnections ?? 0),
                  icon: Users,
                  sub: `${stats?.totalConnections ?? 0} total`,
                },
                {
                  label: "Trust Score",
                  value: loading ? null : `${stats?.trustScore ?? 0}`,
                  icon: ShieldCheck,
                  sub: stats?.businessStatus ?? "unregistered",
                },
                {
                  label: "Total Network",
                  value: loading ? null : String(stats?.totalConnections ?? 0),
                  icon: TrendingUp,
                  sub: "verified connections",
                },
              ].map((stat, i) => (
                <Card key={i} className="shadow-sm border-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <stat.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    {stat.value === null ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                    )}
                    <p className="text-xs text-gray-400 mt-1 font-medium capitalize">{stat.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connection Growth */}
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Network Expansion</CardTitle>
                  <CardDescription>Monthly growth of verified business connections</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={connectionsByMonth}>
                          <defs>
                            <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <YAxis hide allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="connections"
                            stroke="hsl(var(--primary))"
                            fillOpacity={1}
                            fill="url(#colorConnections)"
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Trust Score */}
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Trust Score</CardTitle>
                  <CardDescription>Your current business verification score (0–100)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                  ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trustScoreData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <YAxis domain={[0, 100]} hide />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
