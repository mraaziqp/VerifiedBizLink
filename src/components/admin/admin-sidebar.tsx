
"use client";

import { LayoutDashboard, Users, ShieldAlert, Terminal, Settings, LogOut, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const items = [
  { name: "Vetting Desk", icon: ShieldCheck, tab: "vetting" },
  { name: "Compliance", icon: ShieldAlert, tab: "compliance" },
  { name: "System Ops", icon: Terminal, tab: "ops" },
  { name: "Back to Feed", icon: LayoutDashboard, href: "/" },
];

export function AdminSidebar() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "vetting";
  const { logout, user } = useAuth();

  return (
    <aside className="hidden md:flex w-64 bg-gray-900 flex-col h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <ShieldAlert className="h-6 w-6 text-gray-900" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Admin Hub</span>
        </div>
        {user && (
          <div className="mt-4 px-1">
            <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{user.role}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {items.map((item) => {
          const isActive = item.tab ? activeTab === item.tab : false;
          const href = item.tab ? `/admin?tab=${item.tab}` : (item.href || '/');
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-semibold">{item.name}</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-semibold"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
