"use client";

import { useState, useEffect } from "react";
import { FileText,
  Home, Users, ShieldCheck, BarChart3, Settings, LogOut, Shield, Bell,
  MapPin, Building2, Zap, Megaphone, CheckCheck, Trash2, X, Briefcase, QrCode, PlusCircle, MessageSquare
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { VBLLogo } from "@/components/ui/vbl-logo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useMessagingStore } from "@/stores/messaging-store";
import { selectUnread, useNotificationsStore, useNotificationsSync } from "@/stores/notifications-store";

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  banker: 'Compliance Officer',
  lawyer: 'Legal Counsel',
  business: 'Business Owner',
  customer: 'Member',
};

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "My Network", href: "/network", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Explore", href: "/explore", icon: MapPin },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "My Business", href: "/business/dashboard", icon: Building2 },
  { name: "Ad Manager", href: "/business/ads", icon: Megaphone },
  { name: "Vetting Hub", href: "/vetting", icon: ShieldCheck },
  { name: "Verify Certificate", href: "/verify", icon: QrCode },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Pricing & Plans", href: "/pricing", icon: Zap },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarLeftProps {
  className?: string;
}

export function SidebarLeft({ className }: SidebarLeftProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  useNotificationsSync(Boolean(user));
  const notifications = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore(selectUnread);
  const refreshNotifications = useNotificationsStore((s) => s.refresh);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const clearAllNotifications = useNotificationsStore((s) => s.clearAll);
  const [notifOpen, setNotifOpen] = useState(false);
  const [businessVerified, setBusinessVerified] = useState(false);
  // Derived rather than stored: only these roles ever have a business profile
  // to check, so everyone else is not "loading" — there is nothing to load.
  const [verificationChecked, setVerificationChecked] = useState(false);
  const canHaveBusiness = !!user && ['business', 'admin', 'banker', 'lawyer'].includes(user.role);
  const verificationLoading = canHaveBusiness && !verificationChecked;

  const unreadMessages = useMessagingStore((s) => s.unread);

  useEffect(() => {
    if (!canHaveBusiness) return;
    const controller = new AbortController();
    fetch('/api/business/profile', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (controller.signal.aborted) return;
        setBusinessVerified(d?.business?.status === 'verified');
      })
      .catch(() => {
        if (!controller.signal.aborted) setBusinessVerified(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setVerificationChecked(true);
      });
    return () => controller.abort();
  }, [canHaveBusiness]);

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void dismiss(id);
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VB';

  const isAdmin = user && ['admin', 'banker', 'lawyer'].includes(user.role);
  const canManageBusiness = user && (user.role === 'business' || isAdmin);

  return (
    <div className={cn("flex flex-col gap-4 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain pr-1.5 pb-8 custom-scrollbar", className)}>
      {/* Brand Header & Logo — clean framing, zero cut-off */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white/90 rounded-2xl border border-slate-200/90 shadow-xs">
        <VBLLogo variant="full" size="sm" iconSize={36} theme="dark" />
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
          Pro
        </span>
      </div>

      {/* Profile Card — Unified, elegant luxury gradient without harsh cut-offs */}
      <Card className="overflow-hidden shadow-xs border border-amber-200/80 bg-gradient-to-b from-amber-50/80 via-white to-white rounded-2xl p-5 text-center">
        {/* Centered Avatar with gold ring */}
        <div className="flex justify-center mb-3">
          {loading ? (
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          ) : (
            <Avatar className="h-16 w-16 border-2 border-white shadow-md ring-2 ring-amber-400">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.fullName} />
              <AvatarFallback className="bg-amber-100 text-amber-900 font-extrabold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {user?.fullName || 'Guest User'}
              </h3>
              {!verificationLoading && businessVerified && <GoldCheckmark />}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">
              {user?.headline || 'VerifiedBizLink Member'}
            </p>

            {user && (
              <div className="mt-4 pt-3 border-t border-amber-100/80 grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50/90 rounded-xl p-2 border border-slate-200/70">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Role</p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {ROLE_LABELS[(user.role || '').toLowerCase()] || user.role}
                  </p>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-2 border border-slate-200/70">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</p>
                  <p className="text-xs font-bold text-emerald-600 truncate mt-0.5 flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {navigation.map((item) => {
          if ((item.name === "My Business" || item.name === "Ad Manager" || item.name === "Vetting Hub") && !canManageBusiness) {
            return null;
          }
          const isActive = pathname === item.href;
          const isJobs = item.name === "Jobs";
          const isPostJobActive = pathname === "/jobs/post" || pathname === "/business/jobs";

          return (
            <div key={item.name} className="flex flex-col gap-0.5">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group font-semibold text-sm",
                  isActive
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "h-4.5 w-4.5",
                  isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700"
                )} />
                <span>{item.name}</span>
                {item.name === "Messages" && unreadMessages > 0 && (
                  <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-slate-900">{unreadMessages > 99 ? "99+" : unreadMessages}</span>
                )}
              </Link>

              {/* Everyone can look for work, so the CV link is always there. */}
              {isJobs && (
                <Link
                  href="/talent/profile#cv"
                  className={cn(
                    "flex items-center gap-2.5 pl-9 pr-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    pathname === "/talent/profile"
                      ? "text-slate-900 bg-amber-50 font-bold border-l-2 border-amber-500"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-700" />
                  <span>My CV &amp; profile</span>
                </Link>
              )}

              {/* Nested Post a Job route: conditionally rendered for verified business accounts */}
              {isJobs && businessVerified && (
                <Link
                  href="/jobs?tab=post"
                  className={cn(
                    "flex items-center gap-2.5 pl-9 pr-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    isPostJobActive
                      ? "text-slate-900 bg-amber-50 font-bold border-l-2 border-amber-500"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <PlusCircle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Post a Job</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    Biz
                  </span>
                </Link>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group mt-1 font-bold text-sm",
              pathname.startsWith('/admin')
                ? "bg-slate-950 text-amber-400 font-bold shadow-xs"
                : "text-slate-700 hover:bg-slate-900 hover:text-amber-400"
            )}
          >
            <Shield className={cn(
              "h-4.5 w-4.5",
              pathname.startsWith('/admin') ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400"
            )} />
            <span>Admin Hub</span>
          </Link>
        )}
      </nav>

      {/* Notification Bell */}
      {user && (
        <Popover open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) void refreshNotifications(); }}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-600 hover:text-slate-900 hover:bg-amber-50/80 px-3.5 rounded-xl relative h-10 border border-slate-200/80 bg-white/70"
            >
              <span className="relative">
                <Bell className="h-4.5 w-4.5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge className="ml-auto text-[10px] h-5 px-1.5 font-bold bg-amber-400 text-slate-950 hover:bg-amber-500">
                  {unreadCount} new
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-84 p-0 shadow-2xl rounded-2xl border border-slate-200 bg-white" align="start" side="right">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-gray-900">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    title="Clear all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Bell className="h-8 w-8 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                  <p className="text-xs text-gray-400">No active notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-amber-50/40 transition-colors relative group flex items-start justify-between gap-3",
                      !n.read && "bg-amber-50/50"
                    )}
                    onClick={() => {
                      markRead(n.id);
                      setNotifOpen(false);
                      router.push(n.link || '/network');
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!n.read && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                        <p className={cn("text-xs leading-snug", !n.read ? "font-bold text-gray-900" : "text-gray-600 font-medium")}>
                          {n.message}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={(e) => dismissNotification(n.id, e)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 shrink-0"
                      title="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Sign out / Sign in */}
      <div className="pt-1">
        {user ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 px-3.5 rounded-xl h-10 border border-transparent hover:border-red-200/60 font-semibold text-sm transition-all"
            onClick={logout}
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </Button>
        ) : (
          <Button className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl h-10 shadow-md shadow-amber-400/20" asChild><Link href="/login">
              Sign In
            </Link></Button>
        )}
      </div>
    </div>
  );
}
