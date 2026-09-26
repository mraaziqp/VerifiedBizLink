'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle, X, Send, Search, ArrowLeft, Paperclip, Loader2, Maximize2, BadgeCheck, FileText, AlertCircle, RotateCw, CheckCheck, Check,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useChatSync } from '@/hooks/use-chat-sync';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/lib/messaging';
import { useMessagingStore, type LocalMessage } from '@/stores/messaging-store';
import { initials, shortTime } from '@/components/messaging/format';

/** A hit from GET /api/messages/search. */
interface SearchResult {
  id: string;
  email: string;
  full_name?: string | null;
  company_name?: string | null;
  role?: string | null;
}

const EMPTY: LocalMessage[] = [];

/**
 * The floating chat. A quick companion to /dashboard/messages, on the same
 * store: a message read or sent here is read or sent there too, instantly.
 * Hidden on the hub itself, where it would only duplicate the page.
 */
export default function ChatWidget() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const onHub = pathname?.startsWith('/dashboard/messages') ?? false;

  useChatSync(Boolean(user) && !onHub);

  const inbox = useMessagingStore((s) => s.inbox);
  const unread = useMessagingStore((s) => s.unread);
  const me = useMessagingStore((s) => s.me);
  const openThread = useMessagingStore((s) => s.openThread);
  const send = useMessagingStore((s) => s.sendMessageOptimistic);
  const retry = useMessagingStore((s) => s.retry);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string; verified: boolean; avatar: string | null } | null>(null);
  const messages = useMessagingStore((s) => (selected ? s.threads[selected.id] ?? EMPTY : EMPTY));
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, selected?.id]);

  // People search, for starting a conversation with someone new.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(term)}`);
        const data = res.ok ? await res.json() : { results: [] };
        setResults(data.results ?? []);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const threads = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inbox.filter((t) => !t.isArchived && (!term || t.name.toLowerCase().includes(term)));
  }, [inbox, q]);
  const newPeople = results.filter((r) => !inbox.some((t) => t.otherUserId === r.id));

  const choose = (id: string, name: string, verified: boolean, avatar: string | null) => {
    setSelected({ id, name, verified, avatar });
    setQ('');
    void openThread(id);
  };

  const submit = async (attachment: Attachment | null = null) => {
    if (!selected) return;
    const content = text.trim();
    if (!content && !attachment) return;
    setText('');
    const r = await send({ receiverId: selected.id, content, attachment });
    if (!r.ok) toast({ title: 'Message not sent', description: r.error, variant: 'destructive' });
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/messages/files', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await submit(data.attachment);
    } catch (e) {
      toast({ title: 'Could not attach', description: e instanceof Error ? e.message : 'Try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (!user || onHub) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-22 md:right-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-2xl transition-all duration-200 hover:scale-105 hover:bg-amber-300 active:scale-95"
        aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[11px] font-black text-amber-400 ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  }

  const hubHref = selected ? `/dashboard/messages?with=${selected.id}` : '/dashboard/messages';

  return (
    <div
      role="dialog"
      aria-label="Messages"
      className="fixed bottom-24 right-4 z-50 flex h-[min(34rem,calc(100dvh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6 sm:w-96 md:bottom-28"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-900 px-3 py-2.5 text-white">
        {selected ? (
          <>
            <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
            <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-bold">
              <span className="truncate">{selected.name}</span>
              {selected.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-amber-400" />}
            </p>
          </>
        ) : (
          <p className="flex flex-1 items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-amber-400" /> Messages</p>
        )}
        <Link href={hubHref} onClick={() => setIsOpen(false)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10" title="Open full inbox">
          <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">Full inbox</span>
        </Link>
        <button type="button" onClick={() => { setIsOpen(false); setSelected(null); }} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close messages"><X className="h-4 w-4" /></button>
      </div>

      {!selected ? (
        <>
          <div className="border-b border-slate-100 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search or start a new chat"
                aria-label="Search people"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-amber-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {threads.map((t) => (
              <button key={t.otherUserId} type="button" onClick={() => choose(t.otherUserId, t.name, t.isVerified, t.avatarUrl)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarImage src={t.avatarUrl || undefined} alt="" />
                    <AvatarFallback className="bg-slate-900 text-[11px] font-bold text-amber-400">{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  {t.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className={cn('truncate text-sm text-slate-900', t.unread ? 'font-black' : 'font-bold')}>{t.name}</p>
                    {t.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <span className="ml-auto shrink-0 text-[10px] text-slate-500">{shortTime(t.lastMessageAt)}</span>
                  </div>
                  <p className={cn('truncate text-xs', t.unread ? 'font-semibold text-slate-900' : 'text-slate-600')}>{t.lastMessage}</p>
                </div>
                {t.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-black text-slate-900">{t.unread}</span>}
              </button>
            ))}
            {q.trim().length >= 2 && (
              <div className="border-t border-slate-100">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {searching ? 'Searching…' : newPeople.length ? 'Start a new conversation' : 'No one else found'}
                </p>
                {newPeople.map((r) => {
                  const name = r.company_name || r.full_name || r.email;
                  return (
                    <button key={r.id} type="button" onClick={() => choose(r.id, name, false, null)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-slate-100 text-[11px] font-bold text-slate-700">{initials(name)}</AvatarFallback></Avatar>
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{name}</p>{r.company_name && r.full_name && <p className="truncate text-xs text-slate-600">{r.full_name}</p>}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {threads.length === 0 && q.trim().length < 2 && (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-bold text-slate-900">No conversations yet</p>
                <p className="mt-1 text-xs text-slate-600">Search above to message a business, or connect with one first.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-slate-50 p-3 custom-scrollbar">
            {messages.length === 0 && <p className="py-8 text-center text-xs text-slate-600">Say hello to {selected.name}.</p>}
            {messages.map((m) => {
              const mine = m.senderId === me;
              return (
                <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-1.5 text-sm',
                    m.isDeleted ? 'border border-dashed border-slate-300 italic text-slate-500'
                      : mine ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-900',
                  )}>
                    {m.isDeleted ? 'This message was deleted' : m.kind !== 'text' ? (
                      <span className="font-semibold">{m.kind === 'quote' ? '📄 Quote' : '💳 Payment request'} — open the full inbox to view</span>
                    ) : (
                      <>
                        {m.attachment && (m.attachment.type.startsWith('image/') ? (
                          <a href={m.attachment.url} target="_blank" rel="noopener noreferrer"><img src={m.attachment.url} alt={m.attachment.name} loading="lazy" decoding="async" className="mb-1 max-h-40 rounded-lg" /></a>
                        ) : (
                          <a href={m.attachment.url} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-1.5 text-xs font-semibold underline"><FileText className="h-3.5 w-3.5" /> {m.attachment.name}</a>
                        ))}
                        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      </>
                    )}
                    <span className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', mine ? 'text-slate-300' : 'text-slate-500')}>
                      {new Date(m.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      {mine && !m.isDeleted && (m.status === 'sending' ? <Loader2 className="h-3 w-3 animate-spin" /> : m.status === 'failed' ? <AlertCircle className="h-3 w-3 text-red-400" /> : m.read ? <CheckCheck className="h-3 w-3 text-amber-400" /> : <Check className="h-3 w-3" />)}
                    </span>
                  </div>
                  {m.status === 'failed' && (
                    <button type="button" onClick={() => retry(m.id)} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-red-600"><RotateCw className="h-3 w-3" /> Not sent — retry</button>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); void submit(); }}
            className="flex items-center gap-1.5 border-t border-slate-200 bg-white p-2"
          >
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label="Attach a file">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a message"
              aria-label="Message"
              maxLength={4000}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-amber-400 focus:bg-white focus:outline-none"
            />
            <button type="submit" disabled={!text.trim()} className="rounded-xl bg-amber-400 p-2.5 text-slate-900 hover:bg-amber-300 disabled:bg-slate-200 disabled:text-slate-500" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,image/jpeg,image/png,image/webp" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
          </form>
        </>
      )}
    </div>
  );
}
