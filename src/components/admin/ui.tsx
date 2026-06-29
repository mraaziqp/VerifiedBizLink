"use client";

/**
 * Shared admin design-system primitives.
 * One consistent, premium look across every /admin page:
 *  - AdminBackground: page-level gradient backdrop
 *  - AdminPageHeader: sticky title bar with actions
 *  - AdminCard: glassmorphism panel
 *  - StatCard: metric tile with icon + trend
 *  - SectionTitle: consistent section heading
 * All are mobile-first responsive.
 */

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function AdminBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl shadow-lg shadow-black/20 sm:p-6 ${
        hover ? "transition-all hover:border-amber-400/30 hover:bg-white/[0.05]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white sm:text-xl">
        {Icon && <Icon className="h-5 w-5 text-amber-400" />}
        {children}
      </h2>
      {action}
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  change?: string;
  icon: LucideIcon;
  /** tailwind gradient classes, e.g. "from-amber-500 to-yellow-500" */
  gradient?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  gradient = "from-amber-500 to-yellow-500",
  loading = false,
}: StatCardProps) {
  const positive = change?.includes("+");
  return (
    <AdminCard hover className="group">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition-transform group-hover:scale-105`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        {change && !loading && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              positive
                ? "bg-green-500/10 text-green-400"
                : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-20 animate-pulse rounded-md bg-white/10" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">{value}</p>
      )}
    </AdminCard>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </header>
  );
}
