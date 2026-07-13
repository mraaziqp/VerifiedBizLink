"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Home, Users, MapPin, ShieldCheck, BarChart3,
  UserCircle, Settings, Shield, LogOut, Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { VBLLogo } from "@/components/ui/vbl-logo";

const MENU_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "My Network", href: "/network", icon: Users },
  { name: "Explore", href: "/explore", icon: MapPin },
  { name: "Vetting Hub", href: "/vetting", icon: ShieldCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "My Profile", href: "/settings/profile", icon: UserCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

/**
 * Global mobile "left sidebar" equivalent — the desktop SidebarLeft (with
 * Sign Out) is `hidden md:block`, and HomeHeader's own slide-out menu only
 * renders on "/". Every other page had no mobile way to sign out at all.
 * This mounts globally and skips rendering its own trigger on "/" since
 * HomeHeader already covers that page.
 */
export function MobileMenuDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (pathname === "/" || pathname === "/login" || pathname === "/signup" || !user) return null;

  const isStaff = ["admin", "banker", "lawyer"].includes(user.role);
  const isBusiness = user.role === "business" || isStaff;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-lg bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-lg active:scale-95 transition-transform"
      >
        <Menu size={20} className="text-yellow-500" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-slate-950 border-r border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <VBLLogo variant="icon" size="md" theme="dark" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={20} className="text-white/70" />
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">{user.fullName || user.email}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {MENU_ITEMS.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-yellow-500/15 text-yellow-500" : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
              {isBusiness && (
                <Link
                  href="/business/dashboard"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/business") ? "bg-yellow-500/15 text-yellow-500" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Building2 size={18} />
                  Business Dashboard
                </Link>
              )}
              {isStaff && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin") ? "bg-yellow-500/15 text-yellow-500" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Shield size={18} />
                  Admin Hub
                </Link>
              )}
            </nav>

            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
