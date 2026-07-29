"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, Menu, CheckCheck,
} from "lucide-react";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { useRouter } from "next/navigation";
import { useMobileMenu } from "@/contexts/mobile-menu-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const { setOpen } = useMobileMenu();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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
    <div className="safe-area-pt sticky top-0 z-30 bg-slate-950 border-b border-slate-800">
      <div className="px-4 py-4 flex items-center justify-between">
        {/* Menu Button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2.5 hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-all duration-200 group"
        >
          <Menu size={24} className="text-primary group-hover:scale-110 transition-transform" />
        </button>

        {/* Logo & Title */}
        <div className="flex-1 flex justify-center">
          <VBLLogo variant="full" size="lg" theme="light" />
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
    </div>
  );
}
