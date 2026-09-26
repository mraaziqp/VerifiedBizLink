'use client';

import { useMemo, useState } from 'react';
import { Search, Pin, Archive, MoreVertical, Tag, Inbox, BadgeCheck, ArchiveRestore, PinOff, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { InboxThread, ThreadCategory } from '@/lib/messaging';
import { useMessagingStore } from '@/stores/messaging-store';
import { CATEGORY_META, initials, shortTime } from './format';

type Tab = 'all' | 'unread' | 'pinned' | 'lead' | 'archived';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'lead', label: 'Leads' },
  { id: 'archived', label: 'Archived' },
];

export function ChatInboxSidebar({ onOpen }: { onOpen: (id: string) => void }) {
  const inbox = useMessagingStore((s) => s.inbox);
  const activeId = useMessagingStore((s) => s.activeId);
  const loaded = useMessagingStore((s) => s.loaded);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => ({
    all: inbox.filter((t) => !t.isArchived).length,
    unread: inbox.filter((t) => !t.isArchived && t.unread > 0).length,
    pinned: inbox.filter((t) => t.isPinned && !t.isArchived).length,
    lead: inbox.filter((t) => t.category === 'lead' && !t.isArchived).length,
    archived: inbox.filter((t) => t.isArchived).length,
  }), [inbox]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inbox.filter((t) => {
      if (tab === 'archived' ? !t.isArchived : t.isArchived) return false;
      if (tab === 'unread' && t.unread === 0) return false;
      if (tab === 'pinned' && !t.isPinned) return false;
      if (tab === 'lead' && t.category !== 'lead') return false;
      if (!needle) return true;
      return [t.name, t.headline, t.companyName, t.label, t.lastMessage].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [inbox, tab, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-black tracking-tight text-slate-900">Messages</h1>
          <Link
            href="/network"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <MessageSquarePlus className="h-4 w-4" /> New
          </Link>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, companies, messages"
            aria-label="Search conversations"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
        <div role="tablist" aria-label="Filter conversations" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 custom-scrollbar">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                tab === id ? 'border-amber-400 bg-amber-400 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
              )}
            >
              {label}
              {counts[id] > 0 && <span className={cn('ml-1.5', tab === id ? 'text-slate-900/70' : 'text-slate-500')}>{counts[id]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar" role="list">
        {!loaded && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2"><div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" /><div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" /></div>
          </div>
        ))}
        {loaded && list.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="rounded-2xl bg-slate-100 p-3"><Inbox className="h-6 w-6 text-slate-500" /></div>
            <p className="mt-3 text-sm font-bold text-slate-900">
              {q ? 'No matches' : tab === 'archived' ? 'Nothing archived' : tab === 'all' ? 'No conversations yet' : 'Nothing here'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {tab === 'all' && !q ? 'Connect with a verified business to start a conversation.' : 'Try another filter or search.'}
            </p>
            {tab === 'all' && !q && (
              <Link href="/explore" className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-amber-300">Find businesses</Link>
            )}
          </div>
        )}
        {list.map((t) => (
          <InboxRow key={t.otherUserId} t={t} active={t.otherUserId === activeId} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function InboxRow({ t, active, onOpen }: { t: InboxThread; active: boolean; onOpen: (id: string) => void }) {
  const togglePin = useMessagingStore((s) => s.togglePin);
  const toggleArchive = useMessagingStore((s) => s.toggleArchive);
  const setCategory = useMessagingStore((s) => s.setCategory);

  return (
    <div
      role="listitem"
      className={cn(
        'group relative flex items-center gap-3 border-l-4 px-3 py-3 transition-colors sm:px-4',
        active ? 'border-amber-400 bg-amber-50/70' : 'border-transparent hover:bg-slate-50',
      )}
    >
      <button type="button" onClick={() => onOpen(t.otherUserId)} className="absolute inset-0" aria-label={`Open conversation with ${t.name}`} />
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11 border border-slate-200">
          <AvatarImage src={t.avatarUrl || undefined} alt="" />
          <AvatarFallback className="bg-slate-900 text-xs font-bold text-amber-400">{initials(t.name)}</AvatarFallback>
        </Avatar>
        {t.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" title="Online" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn('truncate text-sm', t.unread ? 'font-black text-slate-900' : 'font-bold text-slate-900')}>{t.name}</p>
          {t.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-amber-500" aria-label="Verified business" />}
          {t.isPinned && <Pin className="h-3 w-3 shrink-0 text-slate-500" aria-label="Pinned" />}
          <span className="ml-auto shrink-0 text-[11px] text-slate-500">{shortTime(t.lastMessageAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className={cn('truncate text-xs', t.unread ? 'font-semibold text-slate-900' : 'text-slate-600')}>
            {t.lastFromMe && t.lastMessageAt ? 'You: ' : ''}{t.lastMessage}
          </p>
          {t.unread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-slate-900">
              {t.unread > 99 ? '99+' : t.unread}
            </span>
          )}
        </div>
        {(t.category !== 'general' || t.label) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {t.category !== 'general' && <span className={cn('rounded-full border px-1.5 py-px text-[10px] font-bold', CATEGORY_META[t.category].tone)}>{CATEGORY_META[t.category].label}</span>}
            {t.label && <span className="rounded-full border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold text-slate-700">{t.label}</span>}
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="relative z-10 shrink-0 rounded-lg p-1.5 text-slate-500 opacity-100 hover:bg-slate-200 hover:text-slate-900 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Options for ${t.name}`}
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => togglePin(t.otherUserId)}>
            {t.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}{t.isPinned ? 'Unpin' : 'Pin to top'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleArchive(t.otherUserId)}>
            {t.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{t.isArchived ? 'Move to inbox' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-slate-500"><Tag className="h-3.5 w-3.5" /> Category</DropdownMenuLabel>
          {(Object.keys(CATEGORY_META) as ThreadCategory[]).map((c) => (
            <DropdownMenuItem key={c} onClick={() => setCategory(t.otherUserId, c)} className={t.category === c ? 'font-bold' : ''}>
              <span className={cn('mr-2 h-2 w-2 rounded-full', c === 'lead' ? 'bg-amber-500' : c === 'support' ? 'bg-sky-500' : c === 'verification' ? 'bg-emerald-500' : 'bg-slate-400')} />
              {CATEGORY_META[c].label}{t.category === c ? ' ✓' : ''}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
