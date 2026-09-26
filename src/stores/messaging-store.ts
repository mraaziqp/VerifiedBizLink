'use client';

import { create } from 'zustand';
import {
  deleteMessage as deleteMessageAction,
  editMessage as editMessageAction,
  sendMessage as sendMessageAction,
  setThreadCategory as setThreadCategoryAction,
  toggleArchive as toggleArchiveAction,
  togglePin as togglePinAction,
  type SendMessageInput,
} from '@/app/actions/messaging-actions';
import type { ChatMessage, InboxThread, ThreadCategory } from '@/lib/messaging';

/**
 * One messaging store for the whole app.
 *
 * The floating widget and /dashboard/messages both read and write this
 * store, so reading or replying in one updates the other immediately — same
 * tab, no reload. Other tabs are told through a BroadcastChannel and re-sync
 * (see useChatSync). The server is the source of truth: every sync replaces
 * the inbox and the open thread, keeping only messages still in flight.
 */

export type LocalMessage = ChatMessage & {
  /** Optimistic messages: shown at once, reconciled when the server answers. */
  status?: 'sending' | 'failed';
  /** What to resend if a failed message is retried. */
  draft?: SendMessageInput;
};

interface MessagingState {
  me: string | null;
  inbox: InboxThread[];
  unread: number;
  activeId: string | null;
  threads: Record<string, LocalMessage[]>;
  loaded: boolean;
  loadingThread: boolean;
  error: string | null;
  lastSyncAt: number;

  sync: (opts?: { withId?: string | null; quiet?: boolean }) => Promise<void>;
  openThread: (otherId: string | null) => Promise<void>;
  sendMessageOptimistic: (input: SendMessageInput) => Promise<{ ok: boolean; error?: string }>;
  retry: (tempId: string) => Promise<void>;
  discard: (tempId: string) => void;
  editMessage: (otherId: string, messageId: string, content: string) => Promise<{ ok: boolean; error?: string }>;
  deleteMessage: (otherId: string, messageId: string) => Promise<{ ok: boolean; error?: string }>;
  togglePin: (otherId: string) => Promise<void>;
  toggleArchive: (otherId: string) => Promise<void>;
  setCategory: (otherId: string, category: ThreadCategory, label?: string | null) => Promise<void>;
}

const channel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('vbl-messages') : null;

/** Tell other tabs something changed; they re-sync. */
export function broadcastChange() {
  try { channel?.postMessage({ type: 'changed', at: Date.now() }); } catch { /* closed channel */ }
}
export { channel as messagingChannel };

let syncInFlight: Promise<void> | null = null;
let tempCounter = 0;

const patchThread = (
  threads: Record<string, LocalMessage[]>,
  otherId: string,
  fn: (list: LocalMessage[]) => LocalMessage[],
) => ({ ...threads, [otherId]: fn(threads[otherId] ?? []) });

export const useMessagingStore = create<MessagingState>((set, get) => ({
  me: null,
  inbox: [],
  unread: 0,
  activeId: null,
  threads: {},
  loaded: false,
  loadingThread: false,
  error: null,
  lastSyncAt: 0,

  sync: async (opts = {}) => {
    // Collapse overlapping polls from the widget, the hub and focus events.
    if (syncInFlight) return syncInFlight;
    const withId = opts.withId === undefined ? get().activeId : opts.withId;
    syncInFlight = (async () => {
      try {
        const res = await fetch(`/api/messages/hub${withId ? `?with=${encodeURIComponent(withId)}` : ''}`, { cache: 'no-store' });
        if (res.status === 401) { set({ loaded: true, me: null, inbox: [], unread: 0 }); return; }
        if (!res.ok) throw new Error('sync failed');
        const data = await res.json();
        set((s) => {
          const next: Partial<MessagingState> = {
            me: data.me, inbox: data.inbox ?? [], unread: Number(data.unread ?? 0),
            loaded: true, error: null, lastSyncAt: Date.now(),
          };
          if (data.withUser && Array.isArray(data.thread)) {
            // Keep only local messages the server has not confirmed yet.
            const pending = (s.threads[data.withUser] ?? []).filter((m) => m.status);
            next.threads = { ...s.threads, [data.withUser]: [...(data.thread as LocalMessage[]), ...pending] };
          }
          return next;
        });
      } catch {
        if (!opts.quiet) set({ error: 'Could not refresh your messages. Retrying…', loaded: true });
      } finally {
        syncInFlight = null;
      }
    })();
    return syncInFlight;
  },

  openThread: async (otherId) => {
    set((s) => ({
      activeId: otherId,
      loadingThread: Boolean(otherId && !s.threads[otherId]),
      // Opening marks it read on the server; reflect that now.
      inbox: s.inbox.map((t) => (t.otherUserId === otherId ? { ...t, unread: 0 } : t)),
      unread: Math.max(0, s.unread - (s.inbox.find((t) => t.otherUserId === otherId)?.unread ?? 0)),
    }));
    if (!otherId) return;
    await get().sync({ withId: otherId });
    set({ loadingThread: false });
    broadcastChange();
  },

  sendMessageOptimistic: async (input) => {
    const me = get().me ?? 'me';
    const tempId = `temp-${Date.now()}-${++tempCounter}`;
    const optimistic: LocalMessage = {
      id: tempId, senderId: me, receiverId: input.receiverId,
      content: input.content ?? '', kind: input.kind ?? 'text',
      meta: (input.meta as Record<string, unknown>) ?? null,
      attachment: input.attachment ?? null,
      replyTo: null, read: false, isEdited: false, isDeleted: false,
      createdAt: new Date().toISOString(), status: 'sending', draft: input,
    };
    if (input.replyToId) {
      const target = get().threads[input.receiverId]?.find((m) => m.id === input.replyToId);
      if (target) optimistic.replyTo = { id: target.id, content: target.isDeleted ? 'This message was deleted' : target.content, senderId: target.senderId };
    }
    // Instantly: the bubble, and the inbox row moves to the top.
    set((s) => ({
      threads: patchThread(s.threads, input.receiverId, (l) => [...l, optimistic]),
      inbox: bumpInbox(s.inbox, input.receiverId, previewOf(optimistic)),
    }));

    const result = await sendMessageAction(input).catch(() => ({ ok: false as const, error: 'Message not sent. Check your connection.' }));
    if (result.ok) {
      set((s) => ({
        // A poll may already have brought the confirmed copy back; keep one.
        threads: patchThread(s.threads, input.receiverId, (l) => dedupe(l.map((m) => (m.id === tempId ? { ...result.message, replyTo: m.replyTo } : m)))),
      }));
      broadcastChange();
      return { ok: true };
    }
    set((s) => ({ threads: patchThread(s.threads, input.receiverId, (l) => l.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))) }));
    return { ok: false, error: result.error };
  },

  retry: async (tempId) => {
    const found = Object.entries(get().threads).flatMap(([other, list]) => list.map((m) => ({ other, m }))).find((x) => x.m.id === tempId);
    if (!found?.m.draft) return;
    get().discard(tempId);
    await get().sendMessageOptimistic(found.m.draft);
  },

  discard: (tempId) =>
    set((s) => ({
      threads: Object.fromEntries(Object.entries(s.threads).map(([k, l]) => [k, l.filter((m) => m.id !== tempId)])),
    })),

  editMessage: async (otherId, messageId, content) => {
    const before = get().threads[otherId]?.find((m) => m.id === messageId);
    set((s) => ({ threads: patchThread(s.threads, otherId, (l) => l.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m))) }));
    const r = await editMessageAction(messageId, content).catch(() => ({ ok: false as const, error: 'Could not edit that message.' }));
    if (!r.ok && before) {
      set((s) => ({ threads: patchThread(s.threads, otherId, (l) => l.map((m) => (m.id === messageId ? before : m))) }));
      return { ok: false, error: r.error };
    }
    broadcastChange();
    return { ok: true };
  },

  deleteMessage: async (otherId, messageId) => {
    const before = get().threads[otherId]?.find((m) => m.id === messageId);
    set((s) => ({
      threads: patchThread(s.threads, otherId, (l) => l.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: '', attachment: null, kind: 'text', meta: null } : m))),
    }));
    const r = await deleteMessageAction(messageId).catch(() => ({ ok: false as const, error: 'Could not delete that message.' }));
    if (!r.ok && before) {
      set((s) => ({ threads: patchThread(s.threads, otherId, (l) => l.map((m) => (m.id === messageId ? before : m))) }));
      return { ok: false, error: r.error };
    }
    broadcastChange();
    return { ok: true };
  },

  togglePin: async (otherId) => {
    const current = get().inbox.find((t) => t.otherUserId === otherId);
    const next = !current?.isPinned;
    set((s) => ({ inbox: sortInbox(s.inbox.map((t) => (t.otherUserId === otherId ? { ...t, isPinned: next } : t))) }));
    const r = await togglePinAction(otherId, next).catch(() => ({ ok: false }));
    if (!r.ok) await get().sync({ quiet: true });
    else broadcastChange();
  },

  toggleArchive: async (otherId) => {
    const current = get().inbox.find((t) => t.otherUserId === otherId);
    const next = !current?.isArchived;
    set((s) => ({ inbox: s.inbox.map((t) => (t.otherUserId === otherId ? { ...t, isArchived: next } : t)) }));
    const r = await toggleArchiveAction(otherId, next).catch(() => ({ ok: false }));
    if (!r.ok) await get().sync({ quiet: true });
    else broadcastChange();
  },

  setCategory: async (otherId, category, label) => {
    set((s) => ({
      inbox: s.inbox.map((t) => (t.otherUserId === otherId ? { ...t, category, ...(label === undefined ? {} : { label: label || null }) } : t)),
    }));
    const r = await setThreadCategoryAction(otherId, category, label).catch(() => ({ ok: false }));
    if (!r.ok) await get().sync({ quiet: true });
    else broadcastChange();
  },
}));

function dedupe(list: LocalMessage[]): LocalMessage[] {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

function previewOf(m: LocalMessage): string {
  if (m.kind === 'quote') return '📄 Sent a quote';
  if (m.kind === 'payment_request') return '💳 Payment request';
  if (m.content) return m.content.slice(0, 140);
  if (m.attachment) return `📎 ${m.attachment.name}`;
  return '';
}

function sortInbox(list: InboxThread[]): InboxThread[] {
  return [...list].sort((a, b) =>
    Number(b.isPinned) - Number(a.isPinned) || (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
  );
}

function bumpInbox(list: InboxThread[], otherId: string, text: string): InboxThread[] {
  return sortInbox(list.map((t) => (
    t.otherUserId === otherId
      ? { ...t, lastMessage: text, lastMessageAt: new Date().toISOString(), lastFromMe: true, isArchived: false }
      : t
  )));
}
