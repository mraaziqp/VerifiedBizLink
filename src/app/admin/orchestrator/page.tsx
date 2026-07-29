"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Users, Building2, Activity, Settings, LogOut, CreditCard,
  Shield, ArrowLeft, CheckCircle2, Clock, FileText, Link2, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { AdminProfilePanel } from "@/components/admin/admin-profile-panel";
import TierManagement from "@/components/admin/tier-management";
import UserSubscriptionManager from "@/components/admin/user-subscription-manager";
import PaymentGatewayConfig from "@/components/admin/payment-gateway-config";
import AppearanceSettings from "@/components/admin/appearance-settings";
import {
  AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle,
} from "@/components/admin/ui";

interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  reviewingBusinesses: number;
  rejectedBusinesses: number;
  totalPosts: number;
  totalConnections: number;
  openReports: number;
}

export default function OrchestratorDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Same guard as src/app/dashboard/page.tsx — don't redirect off a
    // still-null `user` while the auth check itself is in flight, or a
    // hard reload straight into this page bounces to /login and forces a
    // redundant second sign-in.
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          if (active) setStats(data.stats);
        }
      } catch {
        /* surfaced via the empty/loading state */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const fmt = (n?: number) =>
    n === undefined ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  const metrics = [
    { label: "Total Businesses", value: fmt(stats?.totalBusinesses), icon: Building2, gradient: "from-amber-500 to-yellow-500" },
    { label: "Total Users", value: fmt(stats?.totalUsers), icon: Users, gradient: "from-blue-500 to-cyan-500" },
    { label: "Verified", value: fmt(stats?.verifiedBusinesses), icon: CheckCircle2, gradient: "from-green-500 to-emerald-500" },
    { label: "Pending Review", value: fmt(stats?.pendingBusinesses), icon: Clock, gradient: "from-purple-500 to-pink-500" },
  ];

  const statusData = stats
    ? [
        { name: "Verified", value: stats.verifiedBusinesses, fill: "#10b981" },
        { name: "Pending", value: stats.pendingBusinesses, fill: "#f59e0b" },
        { name: "Reviewing", value: stats.reviewingBusinesses, fill: "#3b82f6" },
        { name: "Rejected", value: stats.rejectedBusinesses, fill: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  const engagementData = stats
    ? [
        { name: "Posts", value: stats.totalPosts },
        { name: "Connections", value: stats.totalConnections },
        { name: "Open Reports", value: stats.openReports },
      ]
    : [];

  return (
    <AdminBackground>
      <AdminPageHeader title="Orchestrator Portal" subtitle="Business intelligence & tier management">
        <Button onClick={() => router.push("/")} variant="outline" size="sm"
          className="gap-2 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to App</span>
        </Button>
        <span className="hidden text-sm text-gray-400 lg:inline">{user?.email}</span>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm"
            className="gap-2 border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10">
            <Activity className="h-4 w-4" /> <span className="hidden sm:inline">My Tools</span>
          </Button>
        </Link>
        <Link href="/admin/team">
          <Button variant="outline" size="sm"
            className="gap-2 border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10">
            <Users className="h-4 w-4" /> <span className="hidden sm:inline">Team</span>
          </Button>
        </Link>
        <Link href="/admin/settings">
          <Button variant="outline" size="sm"
            className="gap-2 border-yellow-500/30 text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10">
            <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleLogout}
          className="gap-2 border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
        </Button>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <AdminProfilePanel />
      </div>

      <div className="z-40 border-b border-white/10 bg-black/40 backdrop-blur-xl sm:sticky sm:top-[65px]">
        <div className="mx-auto max-w-7xl px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 border-0 bg-transparent p-0 sm:grid-cols-5">
              {[
                { v: "overview", label: "Overview", Icon: Activity },
                { v: "tiers", label: "Tiers", Icon: TrendingUp },
                { v: "users", label: "Users", Icon: Shield },
                { v: "payment", label: "Payment", Icon: CreditCard },
                { v: "appearance", label: "Appearance", Icon: ImageIcon },
              ].map(({ v, label, Icon }) => (
                <TabsTrigger key={v} value={v}
                  className="rounded-none border-b-2 border-transparent px-3 py-3 text-gray-400 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400">
                  <Icon className="mr-2 h-4 w-4" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {metrics.map((m) => (
                <StatCard key={m.label} {...m} loading={loading} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
              <AdminCard className="lg:col-span-2">
                <SectionTitle icon={Activity}>Platform Engagement</SectionTitle>
                {loading ? (
                  <div className="h-[280px] animate-pulse rounded-xl bg-white/5" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                      <Bar dataKey="value" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </AdminCard>

              <AdminCard>
                <SectionTitle icon={Building2}>Verification Status</SectionTitle>
                {loading ? (
                  <div className="h-[280px] animate-pulse rounded-xl bg-white/5" />
                ) : statusData.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
                    No business data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                        {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </AdminCard>
            </div>

            <AdminCard>
              <SectionTitle icon={FileText}>Quick Breakdown</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                  { label: "Verified", count: stats?.verifiedBusinesses, color: "text-green-400", Icon: CheckCircle2 },
                  { label: "Pending", count: stats?.pendingBusinesses, color: "text-amber-400", Icon: Clock },
                  { label: "Total Posts", count: stats?.totalPosts, color: "text-cyan-400", Icon: FileText },
                  { label: "Connections", count: stats?.totalConnections, color: "text-purple-400", Icon: Link2 },
                ].map((t) => (
                  <div key={t.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <t.Icon className={`h-4 w-4 ${t.color}`} />
                      <p className="text-xs text-gray-400">{t.label}</p>
                    </div>
                    <p className={`text-2xl font-bold ${t.color}`}>{loading ? "…" : fmt(t.count)}</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </TabsContent>

          <TabsContent value="tiers"><TierManagement /></TabsContent>
          <TabsContent value="users"><UserSubscriptionManager /></TabsContent>
          <TabsContent value="payment"><PaymentGatewayConfig /></TabsContent>
          <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
        </Tabs>
      </div>
    </AdminBackground>
  );
}
