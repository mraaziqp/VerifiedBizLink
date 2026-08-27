"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X, Home, Users, MapPin, ShieldCheck, BarChart3,
  Settings, Shield, LogOut, Building2, Megaphone, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useMobileMenu } from "@/contexts/mobile-menu-context";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  banker: 'Compliance Officer',
  lawyer: 'Legal Counsel',
  business: 'Business Owner',
  customer: 'Member',
};

const MENU_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "My Network", href: "/network", icon: Users },
  { name: "Explore", href: "/explore", icon: MapPin },
  { name: "Pricing & Plans", href: "/pricing", icon: Zap },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileMenuDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { open, setOpen } = useMobileMenu();
  const [slidIn, setSlidIn] = useState(false);
  const [businessVerified, setBusinessVerified] = useState(false);

  useEffect(() => {
    if (!open) {
      setSlidIn(false);
      return;
    }
    const timer = setTimeout(() => setSlidIn(true), 10);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!user || !['business', 'admin', 'banker', 'lawyer'].includes(user.role)) {
      setBusinessVerified(false);
      return;
    }
    const controller = new AbortController();
    fetch('/api/business/profile', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (controller.signal.aborted) return;
        setBusinessVerified(d?.business?.status === 'verified');
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user]);

  if (pathname === "/login" || pathname === "/signup" || !user) return null;

  const isStaff = ["admin", "banker", "lawyer"].includes(user.role);
  const isBusiness = user.role === "business" || isStaff;

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VB';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-slate-950 border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
              slidIn ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Header */}
            <div className="safe-area-pt flex items-center justify-between border-b border-white/10 p-4">
              <VBLLogo variant="full" size="sm" iconSize={32} theme="light" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="border-b border-white/10 p-4 bg-white/5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-white/20 ring-2 ring-amber-400/80 shrink-0">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.fullName} />
                  <AvatarFallback className="bg-amber-400 text-slate-950 font-bold text-base">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="truncate text-sm font-bold text-white leading-tight">
                      {user.fullName || user.email}
                    </p>
                    {businessVerified && <GoldCheckmark />}
                  </div>
                  <p className="truncate text-xs text-white/50 mt-0.5">
                    {user.headline || user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {ROLE_LABELS[(user.role || '').toLowerCase()] || user.role}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Navigation List */}
            <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1 custom-scrollbar">
              {MENU_ITEMS.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon size={18} className={active ? "text-slate-950" : "text-amber-400/80"} />
                    {item.name}
                  </Link>
                );
              })}

              {isBusiness && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60">Business Hub</p>
                  </div>
                  <Link
                    href="/business/dashboard"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      pathname.startsWith("/business/dashboard")
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Building2 size={18} className="text-amber-400" />
                    My Business
                  </Link>
                  <Link
                    href="/business/ads"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      pathname.startsWith("/business/ads")
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Megaphone size={18} className="text-amber-400" />
                    Ad Manager
                  </Link>
                  <Link
                    href="/vetting"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      pathname.startsWith("/vetting")
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ShieldCheck size={18} className="text-amber-400" />
                    Vetting Hub
                  </Link>
                </>
              )}

              {isStaff && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60">Administration</p>
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      pathname.startsWith("/admin")
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Shield size={18} className="text-amber-400" />
                    Admin Hub
                  </Link>
                </>
              )}
            </nav>

            {/* Footer / Sign out */}
            <div className="border-t border-white/10 p-3 bg-white/5">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
