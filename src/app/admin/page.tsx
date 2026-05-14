
"use client";

import { Suspense, useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { VettingDesk } from "@/components/admin/vetting-desk";
import { ComplianceLegal } from "@/components/admin/compliance-legal";
import { SystemOps } from "@/components/admin/system-ops";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Scale, Terminal, Users, ShieldCheck, Clock, AlertTriangle,
  TrendingUp, FileText, Activity, Wifi
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  reviewingBusinesses: number;
  openReports: number;
  openTickets: number;
  totalConnections: number;
  totalPosts: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-white/5 backdrop-blur p-4 flex flex-col gap-2 border-white/10 hover:border-white/20 transition-all`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${accent}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-white leading-none">{value ?? "—"}</p>
      {sub && <p className="text-xs text-white/40 font-medium">{sub}</p>}
    </div>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const activeTab = searchParams.get("tab") || "vetting";
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.stats && setStats(d.stats))
      .catch(() => null);
  }, []);

  const handleTabChange = (value: string) => {
    router.replace(`/admin?tab=${value}`, { scroll: false });
  };

  const verifyRate = stats
    ? Math.round((stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#06060a] flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 flex flex-col">
        {/* Top Hero Bar */}
        <div className="bg-gradient-to-r from-[#0d0d14] via-[#111118] to-[#0d0d14] border-b border-white/[0.06] px-4 md:px-8 py-5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Live Dashboard</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Admin Control Centre</h1>
              <p className="text-sm text-white/40 font-medium mt-0.5">VerifiedBizLink · Platform Management</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Signed in as</p>
                <p className="text-sm font-bold text-amber-400">{user?.fullName || "Administrator"}</p>
                <p className="text-xs text-white/30 capitalize font-medium">{user?.role || "admin"} · {new Date().toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="bg-[#080810] border-b border-white/[0.06] px-4 md:px-8 py-5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard icon={Users} label="Users" value={stats?.totalUsers ?? "—"} sub="Total registered" accent="bg-blue-600" />
            <StatCard icon={Building2} label="Businesses" value={stats?.totalBusinesses ?? "—"} sub="On platform" accent="bg-violet-600" />
            <StatCard icon={ShieldCheck} label="Verified" value={stats?.verifiedBusinesses ?? "—"} sub={`${verifyRate}% rate`} accent="bg-emerald-600" />
            <StatCard icon={Clock} label="Pending" value={stats?.pendingBusinesses ?? "—"} sub="Awaiting review" accent="bg-amber-600" />
            <StatCard icon={Activity} label="Reviewing" value={stats?.reviewingBusinesses ?? "—"} sub="In progress" accent="bg-sky-600" />
            <StatCard icon={AlertTriangle} label="Reports" value={stats?.openReports ?? "—"} sub="Open reports" accent="bg-rose-600" />
            <StatCard icon={FileText} label="Tickets" value={stats?.openTickets ?? "—"} sub="Support open" accent="bg-orange-600" />
            <StatCard icon={TrendingUp} label="Posts" value={stats?.totalPosts ?? "—"} sub="All time" accent="bg-teal-600" />
          </div>
        </div>

        {/* Tab Section */}
        <div className="flex-1 px-4 md:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
              <TabsList className="bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl h-auto w-full md:w-fit flex overflow-x-auto gap-1">
                <TabsTrigger
                  value="vetting"
                  className="h-11 px-5 md:px-7 rounded-lg font-bold flex gap-2.5 shrink-0 text-white/50 data-[state=active]:bg-amber-400 data-[state=active]:text-gray-900 transition-all"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Vetting Desk</span>
                  {(stats?.pendingBusinesses ?? 0) > 0 && (
                    <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none data-[state=active]:bg-gray-900 data-[state=active]:text-amber-400">
                      {stats!.pendingBusinesses}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="h-11 px-5 md:px-7 rounded-lg font-bold flex gap-2.5 shrink-0 text-white/50 data-[state=active]:bg-amber-400 data-[state=active]:text-gray-900 transition-all"
                >
                  <Scale className="h-4 w-4" />
                  <span>Compliance</span>
                  {(stats?.openReports ?? 0) > 0 && (
                    <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {stats!.openReports}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="ops"
                  className="h-11 px-5 md:px-7 rounded-lg font-bold flex gap-2.5 shrink-0 text-white/50 data-[state=active]:bg-amber-400 data-[state=active]:text-gray-900 transition-all"
                >
                  <Terminal className="h-4 w-4" />
                  <span>System Ops</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vetting" className="animate-in fade-in duration-300">
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                  <VettingDesk />
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="animate-in fade-in duration-300">
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                  <ComplianceLegal />
                </div>
              </TabsContent>

              <TabsContent value="ops" className="animate-in fade-in duration-300">
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                  <SystemOps />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer bar */}
        <div className="border-t border-white/[0.05] bg-[#08080f] px-4 md:px-8 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/25 font-medium">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>All systems operational · VerifiedBizLink v1.0</span>
            </div>
            <span className="text-xs text-white/20">{new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageContent />
    </Suspense>
  );
}
