"use client";

/**
 * Shared premium glass design-system primitives, used across every
 * /admin and /business management page for one consistent look:
 *  - GlassBackground: page-level ambient backdrop with the Table Mountain
 *    watermark (same image/technique as the home page's hero)
 *  - GlassPageHeader: sticky title bar with actions
 *  - GlassCard: glassmorphism panel
 *  - StatCard: metric tile with icon + trend
 *  - SectionTitle: consistent section heading
 * All are mobile-first responsive.
 */

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Spread onto any interactive element for the shared tactile press +
 * gold focus ring used across every glass surface (buttons, tabs, inputs). */
export const glassInteractive =
  "transition-all duration-300 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500";

export function GlassBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-700">
      {/* Table Mountain watermark — same image/technique as the home page
          hero (src/app/page.tsx), kept subtle so it reads as a consistent
          brand backdrop rather than competing with foreground content. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-[0.12]"
        style={{ backgroundImage: "url('/hero-cape-town.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-gray-50/70 via-gray-50/60 to-gray-50"
      />
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GlassCard({
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
      className={`rounded-2xl border border-gray-200 bg-white/80 p-5 backdrop-blur-xl shadow-md sm:p-6 ${
        hover
          ? "transition-all duration-300 ease-out hover:border-yellow-500/50 hover:bg-white/95"
          : ""
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
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl">
        {Icon && <Icon className="h-5 w-5 text-amber-600" />}
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
  /** tailwind gradient classes, e.g. "from-yellow-500 to-yellow-400" */
  gradient?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  gradient = "from-yellow-500 to-yellow-400",
  loading = false,
  onClick,
}: StatCardProps) {
  const positive = change?.includes("+");
  return (
    <GlassCard
      hover
      className={`group active:scale-[0.98] transition-transform ${onClick ? "cursor-pointer" : ""}`}
    >
      <div onClick={onClick} className="mb-4 flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-yellow-500/10 transition-transform duration-300 ease-out group-hover:scale-105`}
        >
          <Icon className="h-5 w-5 text-slate-950" />
        </div>
        {change && !loading && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              positive
                ? "bg-green-500/10 text-green-700"
                : "bg-blue-500/10 text-blue-700"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-20 animate-pulse rounded-md bg-gray-200" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
      )}
    </GlassCard>
  );
}

export function GlassPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </header>
  );
}
