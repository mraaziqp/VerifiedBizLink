"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell, Menu, X, CheckCheck, Home, Users, MapPin, ShieldCheck,
  BarChart3, Settings, UserCircle, Shield, LogOut,
} from "lucide-react";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MENU_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "My Network", href: "/network", icon: Users },
  { name: "Explore", href: "/explore", icon: MapPin },
  { name: "Vetting Hub", href: "/vetting", icon: ShieldCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "My Profile", href: "/settings/profile", icon: UserCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

export function HomeHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isStaff = user && ["admin", "banker", "lawyer"].includes(user.role);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const data = await response.json().catch(() => ({ notifications: [] }));
      const items = (data.notifications || []) as NotificationItem[];
      setNotifications(items);
      const unread = items.filter((item) => !item.read).length;
      setUnreadCount(unread);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const data = await response.json().catch(() => ({ notifications: [] }));
      if (!mounted) return;

      const items = (data.notifications || []) as NotificationItem[];
      setNotifications(items);
      const unread = items.filter((item) => !item.read).length;
      setUnreadCount(unread);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const openNotifications = async () => {
    setNotificationsOpen(true);
    await loadNotifications();
  };

  const markAllAsRead = async () => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => null);

    if (response?.ok) {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    }
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => null);
      setNotifications((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    setNotificationsOpen(false);
    router.push(item.link || "/network");
  };

  const bellText = useMemo(() => (unreadCount > 9 ? "9+" : unreadCount), [unreadCount]);

  return (
    <div
      className="sticky top-0 z-30"
      style={{ background: "#06060a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="px-4 py-4 flex items-center justify-between">
        {/* Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="p-2.5 hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-all duration-200 group"
        >
          <Menu size={24} className="text-primary group-hover:scale-110 transition-transform" />
        </button>

        {/* Logo & Title */}
        <div className="flex-1 flex justify-center">
          <VBLLogo variant="full" size="md" theme="light" />
        </div>

        {/* Notification Button */}
        <button
          type="button"
          onClick={openNotifications}
          className="p-2.5 hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-all duration-200 relative group"
        >
          <Bell size={24} className="text-primary group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-destructive text-[10px] font-bold text-white rounded-full shadow-lg shadow-destructive/50 flex items-center justify-center">
              {bellText}
            </span>
          )}
        </button>
      </div>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0f0f16] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 text-white">
              <span>Notifications</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 rounded-lg border-amber-300/40 bg-transparent text-amber-300 hover:bg-amber-500/10"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Live updates from connections, compliance, and platform activity.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2">
            {loadingNotifications && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                Loading notifications...
              </div>
            )}

            {!loadingNotifications && notifications.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70">
                No notifications yet.
              </div>
            )}

            {!loadingNotifications &&
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${
                    item.read
                      ? "border-white/10 bg-white/[0.03] text-white/75"
                      : "border-amber-300/40 bg-amber-400/10 text-white"
                  }`}
                >
                  <p className="text-sm font-medium leading-snug">{item.message}</p>
                  <p className="text-[11px] mt-1 text-white/45">
                    {new Date(item.created_at).toLocaleString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Slide-out menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-[#0f0f16] border-r border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <VBLLogo variant="icon" size="sm" theme="light" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={20} className="text-white/70" />
              </button>
            </div>

            {user && (
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-semibold text-white">{user.fullName || user.email}</p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-2">
              {MENU_ITEMS.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary/15 text-primary" : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
              {isStaff && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin") ? "bg-primary/15 text-primary" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Shield size={18} />
                  Admin Hub
                </Link>
              )}
            </nav>

            {user && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
