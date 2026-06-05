"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings, Code2, Zap, Database, LogOut, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-green-900/30 sticky top-0 z-50 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-400">Architect Portal</h1>
            <p className="text-gray-400 text-sm mt-1">System configuration, algorithms & technical infrastructure</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* System Health */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-green-400" />
            System Infrastructure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemMetrics.map((metric) => (
              <div key={metric.label} className="p-4 rounded-xl bg-gray-800/30 border border-green-900/20 hover:border-green-700/40 transition-all">
                <p className="text-gray-400 text-sm">{metric.label}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xl font-bold text-green-400">{metric.value}</p>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-green-900/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-400" />
            Feature Flags
          </h2>
          <div className="space-y-3">
            {Object.entries(featureFlags).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/20 border border-gray-600/30">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${enabled ? "bg-green-500" : "bg-gray-500"}`} />
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                </div>
                <button
                  onClick={() => toggleFeature(key as keyof typeof featureFlags)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    enabled
                      ? "bg-green-600/30 text-green-400 border border-green-500/50"
                      : "bg-gray-600/20 text-gray-400 border border-gray-600/30"
                  }`}
                >
                  {enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Algorithms */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-green-900/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-green-400" />
            ML Algorithms
          </h2>
          <div className="space-y-3">
            {algorithms.map((algo) => (
              <div key={algo.name} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-between hover:border-green-700/40 transition-all cursor-pointer">
                <div>
                  <p className="text-white font-bold">{algo.name}</p>
                  <p className="text-gray-500 text-sm">v{algo.version} • {algo.lastUpdate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${algo.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {algo.status.toUpperCase()}
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Targeting Configuration */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-green-900/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="h-5 w-5 text-green-400" />
            Targeting Rules
          </h2>
          <div className="space-y-3">
            {targetingRules.map((rule) => (
              <div key={rule.name} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{rule.name}</p>
                  <p className="text-green-400 text-sm mt-1">{rule.value}</p>
                </div>
                {rule.editable && (
                  <Button size="sm" variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/20">
                    Edit
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-900/20 to-gray-900/40 backdrop-blur-xl border border-yellow-700/20">
          <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Alerts
          </h2>
          <div className="space-y-2 text-sm text-yellow-300">
            <p>✓ All systems operational</p>
            <p>✓ Database backup completed 2 hours ago</p>
            <p>→ Scheduled maintenance: Sunday 2:00 AM UTC</p>
          </div>
        </div>
      </div>
    </div>
  );
}
