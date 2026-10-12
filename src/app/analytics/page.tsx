"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, ShieldCheck, FileText } from "lucide-react";

// The charts (and the charting library with them) arrive after the page and
// its headline figures, behind the same placeholder shown while data loads.
const chartLoading = () => <Skeleton className="h-full w-full rounded-xl" />;
const ConnectionsChart = dynamic(() => import("./analytics-charts").then((m) => m.ConnectionsChart), { ssr: false, loading: chartLoading });
const TrustScoreChart = dynamic(() => import("./analytics-charts").then((m) => m.TrustScoreChart), { ssr: false, loading: chartLoading });

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/analytics")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      // Offline or a dropped connection: show the empty state, not an
      // unhandled rejection in the console.
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const connectionsByMonth = data?.connectionsByMonth ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-[max(env(safe-area-inset-top,0px),2.5rem)] pb-6 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-4 md:top-6 z-20">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-8 lg:col-span-9 space-y-6">
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
                    <ConnectionsChart data={connectionsByMonth} />
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
                  ) : stats ? (
                    <TrustScoreChart score={stats.trustScore} />
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-gray-500">
                      Your figures could not be loaded. Check your connection and refresh.
                    </p>
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
