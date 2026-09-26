"use client";

import { useMemo, useState } from "react";
import {
  Bell, Menu, CheckCheck, Trash2, X,
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
import { useAuth } from "@/contexts/auth-context";
import { selectUnread, useNotificationsStore, useNotificationsSync, type AppNotification } from "@/stores/notifications-store";

export function HomeHeader() {
  const router = useRouter();
  const { setOpen } = useMobileMenu();
  const { user } = useAuth();
  // Signed-out visitors have no notifications: no polling at all for them.
  useNotificationsSync(Boolean(user));
  const notifications = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore(selectUnread);
  const loadingNotifications = useNotificationsStore((s) => s.loading && !s.loaded);
  const refresh = useNotificationsStore((s) => s.refresh);
  const markAllAsRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const openNotifications = () => {
    setNotificationsOpen(true);
    void refresh();
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void dismiss(id);
  };

  const openNotification = (item: AppNotification) => {
    if (!item.read) markRead(item.id);
    setNotificationsOpen(false);
    router.push(item.link || "/network");
  };

  const bellText = useMemo(() => (unreadCount > 9 ? "9+" : unreadCount), [unreadCount]);

  return (
    <div className="safe-area-pt sticky top-0 z-30 bg-slate-950 border-b border-slate-800">
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        {/* Menu Button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="shrink-0 p-2.5 hover:bg-amber-400/10 active:bg-amber-400/20 rounded-lg transition-all duration-200 group"
        >
          {/* amber, not text-primary: primary is slate-900, which on this
              near-black bar made both header icons invisible. */}
          <Menu size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
        </button>

        {/* Logo & Title */}
        <div className="min-w-0 flex-1 flex justify-center overflow-hidden">
          <VBLLogo variant="full" size="md" theme="light" />
        </div>

        {/* Notification Button */}
        <button
          type="button"
          onClick={openNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="shrink-0 p-2.5 hover:bg-amber-400/10 active:bg-amber-400/20 rounded-lg transition-all duration-200 relative group"
        >
          <Bell size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 rounded-lg border-amber-300/40 bg-transparent text-amber-300 hover:bg-amber-500/10 text-xs"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark read
                </Button>
                {notifications.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
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
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-white/50">
                No notifications right now.
              </div>
            )}

            {!loadingNotifications &&
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`w-full flex items-start justify-between gap-2 rounded-lg border px-3 py-2 transition-all cursor-pointer group ${
                    item.read
                      ? "border-white/10 bg-white/[0.03] text-white/75"
                      : "border-amber-300/40 bg-amber-400/10 text-white"
                  }`}
                  onClick={() => openNotification(item)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.message}</p>
                    <p className="text-[11px] mt-1 text-white/45">
                      {new Date(item.created_at).toLocaleString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => dismissNotification(item.id, e)}
                    className="text-white/30 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
