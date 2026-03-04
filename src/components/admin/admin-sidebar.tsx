
"use client";

import { LayoutDashboard, Users, ShieldAlert, Terminal, Settings, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Users", icon: Users },
  { name: "Security", icon: ShieldAlert },
  { name: "System Logs", icon: Terminal },
  { name: "Config", icon: Settings },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <ShieldAlert className="h-6 w-6 text-gray-900" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Admin Hub</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {items.map((item) => (
          <Link
            key={item.name}
            href="#"
            className="flex items-center justify-between px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="font-semibold">{item.name}</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-semibold">
          <LogOut className="h-5 w-5" />
          <span>Exit Admin</span>
        </button>
      </div>
    </aside>
  );
}
