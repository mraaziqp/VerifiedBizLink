"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle2, LogOut, Flag, Clock, Building2, ScrollText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AdminProfilePanel } from "@/components/admin/admin-profile-panel";
import { AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle } from "@/components/admin/ui";

interface Report {
  id: string;
  report_type: string;
  risk_level: string;
  description: string;
  status: string;
  created_at: string;
  reported_name?: string;
  reporter_name?: string;
}
interface Log { id: string; action: string; admin_name: string; target_name?: string; created_at: string; }

export default function EnforcerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "compliance" | "activity">("reports");
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Don't redirect off a still-null `user` while the auth check itself is
  // in flight — see src/app/dashboard/page.tsx for the full explanation of
  // the double-login bug this causes on a hard page load.
  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, r, l, c] = await Promise.all([
          fetch("/api/admin/stats").then((x) => x.ok ? x.json() : null).catch(() => null),
          fetch("/api/admin/reports").then((x) => x.ok ? x.json() : null).catch(() => null),
          fetch("/api/admin/audit-logs?limit=8").then((x) => x.ok ? x.json() : null).catch(() => null),
          fetch("/api/compliance").then((x) => x.ok ? x.json() : null).catch(() => null),
        ]);
        if (!active) return;
        setStats(s?.stats ?? null);
        setReports(r?.reports ?? []);
        setLogs(l?.logs ?? []);
        setCompliance(c ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleLogout = async () => { await logout(); router.push("/login"); };

  const cards = [
    { label: "Open Reports", value: stats?.openReports ?? 0, icon: Flag, gradient: "from-red-500 to-rose-500" },
    { label: "Pending Vetting", value: stats?.pendingBusinesses ?? 0, icon: Clock, gradient: "from-amber-500 to-orange-500" },
    { label: "Verified", value: stats?.verifiedBusinesses ?? 0, icon: CheckCircle2, gradient: "from-green-500 to-emerald-500" },
    { label: "Total Businesses", value: stats?.totalBusinesses ?? 0, icon: Building2, gradient: "from-blue-500 to-cyan-500" },
  ];

  return (
    <AdminBackground>
      <AdminPageHeader title="Enforcer Portal" subtitle="Reports, compliance & platform integrity">
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-2 border-gray-500/30 text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to App</span>
          </Button>
        </Link>
        <span className="hidden text-sm text-gray-500 lg:inline">{user?.email}</span>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <AdminProfilePanel />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => <StatCard key={c.label} {...c} loading={loading} />)}
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {([["reports", "Reports"], ["compliance", "Compliance"], ["activity", "Activity"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-4 py-2.5 text-sm font-semibold transition-all ${tab === v ? "border-b-2 border-amber-400 text-amber-400" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "reports" && (
          <AdminCard>
            <SectionTitle icon={Flag}>Compliance Reports</SectionTitle>
            {loading ? <p className="py-6 text-center text-gray-500">Loading…</p>
              : reports.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-sm text-gray-500">No open reports — the platform is clean.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 capitalize">{r.report_type?.replace(/_/g, " ") || "Report"}</p>
                        <p className="truncate text-sm text-gray-500">{r.description}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {r.reporter_name ? `by ${r.reporter_name} · ` : ""}{new Date(r.created_at).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${r.risk_level === "high" ? "bg-red-500/20 text-red-700" : "bg-amber-500/20 text-amber-700"}`}>
                        {(r.risk_level || "medium").toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </AdminCard>
        )}

        {tab === "compliance" && (
          <AdminCard>
            <SectionTitle icon={Shield}>Compliance Status</SectionTitle>
            <div className="space-y-3">
              {[
                { k: "POPIA (South Africa)", ok: compliance?.policies?.popia ?? true },
                { k: "GDPR", ok: compliance?.policies?.gdpr ?? true },
                { k: "CCPA", ok: compliance?.policies?.ccpa ?? true },
              ].map((p) => (
                <div key={p.k} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <span className="font-semibold text-gray-900">{p.k}</span>
                  <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${p.ok ? "bg-green-500/20 text-green-700" : "bg-amber-500/20 text-amber-700"}`}>
                    {p.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {p.ok ? "COMPLIANT" : "REVIEW"}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <span className="font-semibold text-gray-900">Verified Businesses</span>
                <span className="font-semibold text-amber-400">{loading ? "…" : `${stats?.verifiedBusinesses ?? 0} / ${stats?.totalBusinesses ?? 0}`}</span>
              </div>
            </div>
          </AdminCard>
        )}

        {tab === "activity" && (
          <AdminCard>
            <SectionTitle icon={ScrollText}>Recent Admin Activity</SectionTitle>
            {loading ? <p className="py-6 text-center text-gray-500">Loading…</p>
              : logs.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No recorded admin activity yet.</p>
              : (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map((l) => (
                    <div key={l.id} className="flex gap-2 text-gray-500">
                      <span className="text-gray-600">[{new Date(l.created_at).toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" })}]</span>
                      <span className="text-amber-400">{l.admin_name}</span>
                      <span>{l.action}{l.target_name ? ` → ${l.target_name}` : ""}</span>
                    </div>
                  ))}
                </div>
              )}
          </AdminCard>
        )}
      </div>
    </AdminBackground>
  );
}
