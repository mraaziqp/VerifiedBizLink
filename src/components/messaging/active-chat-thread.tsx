'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BadgeCheck, Pin, PinOff, Archive, ArchiveRestore, Info, MoreHorizontal, Reply, Pencil, Trash2,
  Copy, Check, CheckCheck, AlertCircle, RotateCw, FileText, Download, Receipt, CreditCard, Loader2, MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CannedResponse, InboxThread } from '@/lib/messaging';
import { useMessagingStore, type LocalMessage } from '@/stores/messaging-store';
import { MessageComposer, type CardKind } from './message-composer';
import { dayLabel, fileSize, initials, rand } from './format';

const EMPTY: LocalMessage[] = [];

interface Props {
  thread: InboxThread | null;
  otherId: string;
  canned: CannedResponse[];
  canSend: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onBack: () => void;
  cardRequest: CardKind | null;
  onCardRequestHandled: () => void;
}

export function ActiveChatThread({ thread, otherId, canned, canSend, drawerOpen, onToggleDrawer, onBack, cardRequest, onCardRequestHandled }: Props) {
  const { toast } = useToast();
  const me = useMessagingStore((s) => s.me);
  const messages = useMessagingStore((s) => s.threads[otherId] ?? EMPTY);
  const loadingThread = useMessagingStore((s) => s.loadingThread);
  // "Now" for the 24-hour edit window: advances with every sync, so render stays pure.
  const now = useMessagingStore((s) => s.lastSyncAt);
  const send = useMessagingStore((s) => s.sendMessageOptimistic);
  const edit = useMessagingStore((s) => s.editMessage);
  const remove = useMessagingStore((s) => s.deleteMessage);
  const retry = useMessagingStore((s) => s.retry);
  const discard = useMessagingStore((s) => s.discard);
  const togglePin = useMessagingStore((s) => s.togglePin);
  const toggleArchive = useMessagingStore((s) => s.toggleArchive);

  const [replyingTo, setReplyingTo] = useState<LocalMessage | null>(null);
  const [editing, setEditing] = useState<LocalMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => { setReplyingTo(null); setEditing(null); stick.current = true; }, [otherId]);

  // Follow new messages only when the reader is already at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, otherId]);

  const groups = useMemo(() => {
    const out: { day: string; items: LocalMessage[] }[] = [];
    for (const m of messages) {
      const day = new Date(m.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const name = thread?.name ?? 'Conversation';

  const onSend = async ({ content, attachment }: { content: string; attachment: LocalMessage['attachment'] }) => {
    stick.current = true;
    const r = await send({ receiverId: otherId, content, attachment, replyToId: replyingTo?.status ? null : replyingTo?.id ?? null });
    setReplyingTo(null);
    if (!r.ok) toast({ title: 'Message not sent', description: r.error, variant: 'destructive' });
    return true; // the failed bubble offers Retry, so the box can clear
  };

  const onSendCard = async (kind: CardKind, meta: { amount: number; description: string; reference?: string; date?: string }) => {
    stick.current = true;
    const r = await send({ receiverId: otherId, kind, meta });
    if (!r.ok) { toast({ title: 'Not sent', description: r.error, variant: 'destructive' }); return false; }
    toast({ title: kind === 'quote' ? 'Quote sent' : 'Payment request sent' });
    return true;
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-2 py-2.5 sm:gap-3 sm:px-4">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={onToggleDrawer} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left hover:bg-slate-50" aria-label="Show contact details">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-slate-200">
              <AvatarImage src={thread?.avatarUrl || undefined} alt="" />
              <AvatarFallback className="bg-slate-900 text-xs font-bold text-amber-400">{initials(name)}</AvatarFallback>
            </Avatar>
            {thread?.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-black text-slate-900">
              <span className="truncate">{name}</span>
              {thread?.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-amber-500" aria-label="Verified business" />}
            </p>
            <p className="truncate text-xs text-slate-600">{thread?.online ? 'Online now' : thread?.headline || (thread?.isVerified ? 'Verified business' : 'Member')}</p>
          </div>
        </button>
        <button type="button" onClick={() => togglePin(otherId)} className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:block" aria-label={thread?.isPinned ? 'Unpin' : 'Pin'}>
          {thread?.isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
        </button>
        <button type="button" onClick={() => toggleArchive(otherId)} className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:block" aria-label={thread?.isArchived ? 'Move to inbox' : 'Archive'}>
          {thread?.isArchived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-pressed={drawerOpen}
          aria-label="Contact details"
          className={cn('rounded-lg p-2 hover:bg-slate-100', drawerOpen ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900')}
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 custom-scrollbar sm:px-6"
        aria-live="polite"
      >
        {loadingThread && messages.length === 0 && (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
        )}
        {!loadingThread && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-white p-4 shadow-sm"><MessageSquare className="h-7 w-7 text-amber-500" /></div>
            <p className="mt-3 text-sm font-bold text-slate-900">Start the conversation</p>
            <p className="mt-1 max-w-xs text-xs text-slate-600">Say hello, send a quote, or share a document with {name}.</p>
          </div>
        )}
        {groups.map((g) => (
          <Fragment key={g.day}>
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-600 shadow-xs">{dayLabel(g.items[0].createdAt)}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="space-y-1.5">
              {g.items.map((m) => (
                <Bubble
                  key={m.id}
                  m={m}
                  now={now}
                  mine={m.senderId === me || m.senderId === 'me'}
                  otherName={name}
                  onReply={() => { setEditing(null); setReplyingTo(m); }}
                  onEdit={() => { setReplyingTo(null); setEditing(m); }}
                  onDelete={async () => {
                    const r = await remove(otherId, m.id);
                    if (!r.ok) toast({ title: 'Not deleted', description: r.error, variant: 'destructive' });
                  }}
                  onRetry={() => retry(m.id)}
                  onDiscard={() => discard(m.id)}
                />
              ))}
            </div>
          </Fragment>
        ))}
      </div>

      <MessageComposer
        disabled={!canSend}
        canned={canned}
        replyingTo={replyingTo ? { id: replyingTo.id, content: replyingTo.content, fromMe: replyingTo.senderId === me } : null}
        editing={editing ? { id: editing.id, content: editing.content } : null}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={onSend}
        onSaveEdit={async (id, content) => {
          const r = await edit(otherId, id, content);
          if (!r.ok) toast({ title: 'Not edited', description: r.error, variant: 'destructive' });
          return r.ok;
        }}
        onSendCard={onSendCard}
        cardRequest={cardRequest}
        onCardRequestHandled={onCardRequestHandled}
      />
    </div>
  );
}

function Bubble({ m, now, mine, otherName, onReply, onEdit, onDelete, onRetry, onDiscard }: {
  m: LocalMessage; now: number; mine: boolean; otherName: string;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onRetry: () => void; onDiscard: () => void;
}) {
  const time = new Date(m.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const canEdit = mine && !m.isDeleted && !m.status && m.kind === 'text' && !!m.content && now - new Date(m.createdAt).getTime() < 24 * 3600 * 1000;
  const card = m.kind !== 'text' && m.meta ? m.meta as { amount: number; description: string; reference?: string | null; date?: string | null } : null;

  return (
    <div className={cn('group flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start')}>
      {mine && !m.isDeleted && !m.status && <MessageActions mine={mine} m={m} canEdit={canEdit} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />}
      <div className={cn('max-w-[85%] sm:max-w-[70%]', mine ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2 text-sm shadow-xs',
            m.isDeleted ? 'border border-dashed border-slate-300 bg-transparent text-slate-500 italic'
              : mine ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-900',
            m.status === 'failed' && 'ring-2 ring-red-400',
          )}
        >
          {m.replyTo && !m.isDeleted && (
            <div className={cn('mb-1.5 rounded-lg border-l-4 px-2 py-1 text-xs', mine ? 'border-amber-400 bg-white/10 text-slate-200' : 'border-amber-400 bg-slate-50 text-slate-700')}>
              <p className="font-bold">{m.replyTo.senderId === m.senderId ? (mine ? 'You' : otherName) : mine ? otherName : 'You'}</p>
              <p className="line-clamp-2">{m.replyTo.content || 'Attachment'}</p>
            </div>
          )}

          {m.isDeleted ? (
            <p>This message was deleted</p>
          ) : card ? (
            <CardView kind={m.kind as CardKind} card={card} mine={mine} />
          ) : (
            <>
              {m.attachment && <AttachmentView a={m.attachment} mine={mine} />}
              {m.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>}
            </>
          )}

          <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', m.isDeleted ? 'text-slate-500' : mine ? 'text-slate-300' : 'text-slate-500')}>
            {m.isEdited && !m.isDeleted && <span>edited ·</span>}
            <span>{time}</span>
            {mine && !m.isDeleted && (
              m.status === 'sending' ? <Loader2 className="h-3 w-3 animate-spin" aria-label="Sending" />
                : m.status === 'failed' ? <AlertCircle className="h-3 w-3 text-red-400" aria-label="Not sent" />
                : m.read ? <CheckCheck className="h-3.5 w-3.5 text-amber-400" aria-label="Read" />
                : <Check className="h-3.5 w-3.5" aria-label="Sent" />
            )}
          </div>
        </div>
        {m.status === 'failed' && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-semibold text-red-600">Not sent.</span>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-bold text-slate-900 hover:underline"><RotateCw className="h-3 w-3" /> Retry</button>
            <button type="button" onClick={onDiscard} className="font-semibold text-slate-600 hover:underline">Discard</button>
          </div>
        )}
      </div>
      {!mine && !m.isDeleted && <MessageActions mine={mine} m={m} canEdit={canEdit} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />}
    </div>
  );
}

/** Top-level on purpose: defined inside Bubble it would remount on every sync and close itself. */
function MessageActions({ m, mine, canEdit, onReply, onEdit, onDelete }: {
  m: LocalMessage; mine: boolean; canEdit: boolean; onReply: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="mb-5 shrink-0 rounded-full p-1.5 text-slate-500 opacity-100 hover:bg-slate-200 hover:text-slate-900 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 data-[state=open]:opacity-100"
        aria-label="Message options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mine ? 'end' : 'start'} className="w-40">
        <DropdownMenuItem onClick={onReply}><Reply className="mr-2 h-4 w-4" /> Reply</DropdownMenuItem>
        {m.content && (
          <DropdownMenuItem onClick={() => { void navigator.clipboard?.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            <Copy className="mr-2 h-4 w-4" /> {copied ? 'Copied' : 'Copy text'}
          </DropdownMenuItem>
        )}
        {canEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>}
        {mine && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AttachmentView({ a, mine }: { a: NonNullable<LocalMessage['attachment']>; mine: boolean }) {
  if (a.type.startsWith('image/')) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="mb-1.5 block overflow-hidden rounded-xl">
        <img src={a.url} alt={a.name} loading="lazy" decoding="async" className="max-h-64 w-full object-cover" />
      </a>
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('mb-1.5 flex items-center gap-3 rounded-xl border px-3 py-2', mine ? 'border-white/20 bg-white/10 hover:bg-white/15' : 'border-slate-200 bg-slate-50 hover:bg-slate-100')}
    >
      <div className={cn('rounded-lg p-2', mine ? 'bg-white/15' : 'bg-white')}><FileText className={cn('h-5 w-5', mine ? 'text-amber-400' : 'text-slate-700')} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{a.name}</p>
        <p className={cn('text-[11px]', mine ? 'text-slate-300' : 'text-slate-500')}>{a.type === 'application/pdf' ? 'PDF' : 'Document'}{a.size ? ` · ${fileSize(a.size)}` : ''}</p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}

function CardView({ kind, card, mine }: { kind: CardKind; card: { amount: number; description: string; reference?: string | null; date?: string | null }; mine: boolean }) {
  const isQuote = kind === 'quote';
  const due = card.date ? new Date(`${card.date}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  return (
    <div className={cn('-mx-1 min-w-[220px] rounded-xl border p-3', mine ? 'border-amber-400/40 bg-white/5' : 'border-amber-200 bg-amber-50/60')}>
      <div className="flex items-center gap-2">
        {isQuote ? <Receipt className="h-4 w-4 text-amber-500" /> : <CreditCard className="h-4 w-4 text-amber-500" />}
        <span className={cn('text-[11px] font-black uppercase tracking-wider', mine ? 'text-amber-300' : 'text-amber-800')}>{isQuote ? 'Quote' : 'Payment request'}</span>
        {card.reference && <span className={cn('ml-auto text-[11px] font-mono', mine ? 'text-slate-300' : 'text-slate-600')}>{card.reference}</span>}
      </div>
      <p className="mt-2 text-xl font-black tracking-tight">{rand(card.amount)}</p>
      <p className={cn('mt-0.5 text-xs', mine ? 'text-slate-200' : 'text-slate-700')}>{card.description}</p>
      {due && <p className={cn('mt-2 text-[11px] font-semibold', mine ? 'text-slate-300' : 'text-slate-600')}>{isQuote ? 'Valid until' : 'Due by'} {due}</p>}
      {!mine && !isQuote && (
        <p className="mt-2 text-[11px] text-slate-600">Pay using the reference above. Payments are made directly to the business, outside VerifiedBizLink.</p>
      )}
    </div>
  );
}

export function NoThreadSelected() {
  return (
    <div className="hidden h-full flex-col items-center justify-center bg-slate-50 p-8 text-center lg:flex">
      <div className="rounded-3xl bg-white p-5 shadow-sm"><MessageSquare className="h-9 w-9 text-amber-500" /></div>
      <h2 className="mt-4 text-lg font-black text-slate-900">Your business conversations</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600">Pick a conversation on the left, or find a verified business to start one.</p>
      <Link href="/explore" className="mt-5 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-amber-300">Find businesses</Link>
    </div>
  );
}
