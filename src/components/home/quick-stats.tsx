"use client";

import { Users, Check, Zap } from "lucide-react";
import { HomeStats } from "@/components/home/types";

interface QuickStatsProps {
  stats: HomeStats;
  loading: boolean;
}

export function QuickStats({ stats, loading }: QuickStatsProps) {
  const statsItems = [
    {
      icon: Users,
      value: loading ? "..." : stats.verifiedBusinesses.toLocaleString(),
      label: "Verified Businesses",
      color: "from-blue-500/20 to-blue-600/20",
    },
    {
      icon: Check,
      value: loading ? "..." : stats.avgTrustScore > 0 ? `${stats.avgTrustScore}%` : "—",
      label: "Avg Trust Score",
      color: "from-green-500/20 to-green-600/20",
    },
    {
      icon: Zap,
      value: loading ? "..." : stats.activeConnections.toLocaleString(),
      label: "Active Connections",
      color: "from-primary/20 to-primary/10",
    },
  ];

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-3 gap-2.5">
        {statsItems.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="group p-3 rounded-xl border border-primary/20 bg-white hover:bg-amber-50/40 hover:border-primary/40 transition-all duration-300 text-center cursor-pointer shadow-sm"
              style={{
                animation: `slide-up 0.5s ease-out ${idx * 0.1}s both`,
              }}
            >
              <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${stat.color} mb-1.5 group-hover:scale-110 transition-transform`}>
                <Icon size={16} className="text-primary" />
              </div>
              <p className="font-black text-base text-slate-900 leading-tight">{stat.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
