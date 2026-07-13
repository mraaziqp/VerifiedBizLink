"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings, Code2, Zap, Database, LogOut, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProfilePanel } from "@/components/admin/admin-profile-panel";
import { AdminBackground, AdminPageHeader, AdminCard, SectionTitle, glassInteractive } from "@/components/admin/ui";

export default function ArchitectDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [featureFlags, setFeatureFlags] = useState({
    locationServices: true,
    adSystem: true,
    recommendations: true,
    geofencing: true,
    fraudDetection: true,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const toggleFeature = (key: keyof typeof featureFlags) => {
    setFeatureFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const systemMetrics = [
    { label: "Database Connections", value: "18/20", status: "optimal" },
    { label: "API Response Time", value: "48ms", status: "optimal" },
    { label: "Cache Hit Rate", value: "87%", status: "optimal" },
    { label: "Error Rate", value: "0.02%", status: "optimal" },
  ];

  const algorithms = [
    { name: "Recommendation Engine", version: "2.3.1", status: "active", lastUpdate: "2 days ago" },
    { name: "Fraud Detection", version: "1.8.0", status: "active", lastUpdate: "5 days ago" },
    { name: "Fair Exposure", version: "1.5.2", status: "active", lastUpdate: "1 week ago" },
    { name: "Business Similarity", version: "1.1.0", status: "inactive", lastUpdate: "2 weeks ago" },
  ];

  const targetingRules = [
    { name: "Geo-Fence Radius", value: "10km", editable: true },
    { name: "Min Impression Threshold", value: "100", editable: true },
    { name: "Max Daily Budget", value: "R10,000", editable: true },
    { name: "Fraud Check Interval", value: "5min", editable: true },
  ];

  return (
    <AdminBackground>
      <AdminPageHeader title="Architect Portal" subtitle="System configuration, algorithms & technical infrastructure">
        <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className={`gap-2 border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10 ${glassInteractive}`}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </AdminPageHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Profile Panel */}
        <AdminProfilePanel />

        {/* System Health */}
        <div className="mb-8 mt-6">
          <SectionTitle icon={Database}>System Infrastructure</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemMetrics.map((metric) => (
              <AdminCard key={metric.label} hover className="!p-4">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-2xl font-bold text-emerald-400">{metric.value}</p>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </AdminCard>
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <AdminCard className="mb-8">
          <SectionTitle icon={Zap}>Feature Flags</SectionTitle>
          <div className="space-y-3">
            {Object.entries(featureFlags).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-500"}`} />
                  <span className="capitalize text-slate-100">{key.replace(/([A-Z])/g, " $1")}</span>
                </div>
                <button
                  onClick={() => toggleFeature(key as keyof typeof featureFlags)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${glassInteractive} ${
                    enabled
                      ? "border border-emerald-500/50 bg-emerald-600/20 text-emerald-400"
                      : "border border-slate-600/30 bg-slate-600/20 text-slate-400"
                  }`}
                >
                  {enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Algorithms */}
        <AdminCard className="mb-8">
          <SectionTitle icon={Code2}>ML Algorithms</SectionTitle>
          <div className="space-y-3">
            {algorithms.map((algo) => (
              <div key={algo.name} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 ease-out hover:border-emerald-500/30">
                <div>
                  <p className="font-bold text-slate-100">{algo.name}</p>
                  <p className="text-sm text-slate-500">v{algo.version} • {algo.lastUpdate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${algo.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                    {algo.status.toUpperCase()}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Targeting Configuration */}
        <AdminCard className="mb-8">
          <SectionTitle icon={Settings}>Targeting Rules</SectionTitle>
          <div className="space-y-3">
            {targetingRules.map((rule) => (
              <div key={rule.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <p className="font-bold text-slate-100">{rule.name}</p>
                  <p className="mt-1 text-sm text-emerald-400">{rule.value}</p>
                </div>
                {rule.editable && (
                  <Button size="sm" variant="outline" className={`border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 ${glassInteractive}`}>
                    Edit
                  </Button>
                )}
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Alerts */}
        <AdminCard className="!border-yellow-500/20 !bg-yellow-500/5">
          <SectionTitle icon={AlertCircle}>
            <span className="text-yellow-400">System Alerts</span>
          </SectionTitle>
          <div className="space-y-2 text-sm text-yellow-200/90">
            <p>✓ All systems operational</p>
            <p>✓ Database backup completed 2 hours ago</p>
            <p>→ Scheduled maintenance: Sunday 2:00 AM UTC</p>
          </div>
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
