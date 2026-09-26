'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Notifications shared by every bell on the page.
 *
 * The desktop sidebar and the mobile header each used to poll
 * /api/notifications every 30 s — both mount on the home page (CSS hides
 * one), and the sidebar kept polling in background tabs. That was two
 * serverless invocations per open tab every 30 s, forever. Now one timer
 * serves every bell: it pauses while the tab is hidden and refreshes the
 * moment the tab is visible again.
 */

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

interface NotificationsState {
  items: AppNotification[];
  loaded: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  loaded: false,
  loading: false,

  refresh: () => {
    // Collapse concurrent callers (two bells opening at once) into one request.
    inFlight ??= (async () => {
      set({ loading: true });
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { notifications?: AppNotification[] } | null;
        if (data?.notifications) set({ items: data.notifications, loaded: true });
      } catch {
        // offline or signed out: keep what we have
      } finally {
        set({ loading: false });
        inFlight = null;
      }
    })();
    return inFlight;
  },

  // Optimistic: the bell updates at once and navigation doesn't wait on it.
  markRead: (id) => {
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {});
  },

  markAllRead: async () => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => null);
    if (res?.ok) set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) }));
  },

  dismiss: async (id) => {
    set((s) => ({ items: s.items.filter((n) => n.id !== id) }));
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
  },

  clearAll: async () => {
    set({ items: [] });
    await fetch('/api/notifications?clearAll=true', { method: 'DELETE' }).catch(() => null);
  },

  reset: () => set({ items: [], loaded: false }),
}));

export const selectUnread = (s: NotificationsState) => s.items.reduce((n, i) => n + (i.read ? 0 : 1), 0);

const POLL_MS = 30_000;
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let stopListeners: (() => void) | null = null;

function tick() {
  if (document.visibilityState === 'visible') void useNotificationsStore.getState().refresh();
}

function start() {
  void useNotificationsStore.getState().refresh();
  timer = setInterval(tick, POLL_MS);
  const onVisible = () => tick();
  document.addEventListener('visibilitychange', onVisible);
  stopListeners = () => document.removeEventListener('visibilitychange', onVisible);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  stopListeners?.();
  stopListeners = null;
}

/** Mount in any component that shows the bell. `enabled` false when signed out. */
export function useNotificationsSync(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      useNotificationsStore.getState().reset();
      return;
    }
    subscribers += 1;
    if (subscribers === 1) start();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [enabled]);
}
