'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Paperclip, Smile, X, Loader2, FileText, Plus, Receipt, CreditCard, Zap, Reply, Pencil, Image as ImageIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Attachment, CannedResponse, MessageKind } from '@/lib/messaging';
import { fileSize } from './format';

const EMOJIS = ['😀','😂','😊','😍','🤝','👍','👏','🙏','🎉','✅','❌','⚠️','🔥','💡','📄','📎','💳','📅','⏰','📍','🚚','🛠️','💼','🏢','📞','✉️','💰','📈','⭐','❤️','🇿🇦','👋'];

export type CardKind = Extract<MessageKind, 'quote' | 'payment_request'>;

interface Props {
  disabled?: boolean;
  canned: CannedResponse[];
  replyingTo: { id: string; content: string; fromMe: boolean } | null;
  editing: { id: string; content: string } | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (payload: { content: string; attachment: Attachment | null }) => Promise<boolean>;
  onSaveEdit: (id: string, content: string) => Promise<boolean>;
  onSendCard: (kind: CardKind, meta: { amount: number; description: string; reference?: string; date?: string }) => Promise<boolean>;
  cardRequest?: CardKind | null;
  onCardRequestHandled?: () => void;
}

export function MessageComposer({
  disabled, canned, replyingTo, editing, onCancelReply, onCancelEdit, onSend, onSaveEdit, onSendCard,
  cardRequest, onCardRequestHandled,
}: Props) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [cannedIndex, setCannedIndex] = useState(0);
  const [card, setCard] = useState<CardKind | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Opening a card form from the side drawer.
  useEffect(() => {
    if (cardRequest) { setCard(cardRequest); onCardRequestHandled?.(); }
  }, [cardRequest, onCardRequestHandled]);

  // Entering edit mode loads the message; leaving it clears the box.
  useEffect(() => {
    if (editing) { setText(editing.content); requestAnimationFrame(() => ref.current?.focus()); }
  }, [editing]);
  useEffect(() => { if (replyingTo) ref.current?.focus(); }, [replyingTo]);

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // "/" at the start opens saved replies, filtered by what follows.
  const slash = text.startsWith('/') && !text.includes(' ') && !editing ? text.slice(1).toLowerCase() : null;
  const cannedMatches = useMemo(
    () => (slash === null ? [] : canned.filter((c) => c.shortcut.includes(slash) || c.text.toLowerCase().includes(slash)).slice(0, 6)),
    [slash, canned],
  );
  useEffect(() => setCannedIndex(0), [slash]);

  const insert = (s: string) => {
    const el = ref.current;
    if (!el) { setText((t) => t + s); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + s + text.slice(end);
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + s.length, start + s.length); });
  };

  const pickCanned = (c: CannedResponse) => { setText(c.text); requestAnimationFrame(() => ref.current?.focus()); };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'File too large', description: `That file is ${fileSize(file.size)}. The limit is 4 MB.`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/messages/files', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAttachment(data.attachment);
      ref.current?.focus();
    } catch (e) {
      toast({ title: 'Could not attach', description: e instanceof Error ? e.message : 'Try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (sending || disabled) return;
    if (cannedMatches.length && slash !== null) { pickCanned(cannedMatches[cannedIndex]); return; }
    const content = text.trim();
    if (editing) {
      if (!content || content === editing.content) { onCancelEdit(); setText(''); return; }
      setSending(true);
      const ok = await onSaveEdit(editing.id, content);
      setSending(false);
      if (ok) { setText(''); onCancelEdit(); }
      return;
    }
    if (!content && !attachment) return;
    setSending(true);
    // Clear at once: the store shows the message optimistically.
    const snapshot = { content, attachment };
    setText(''); setAttachment(null);
    const ok = await onSend(snapshot);
    setSending(false);
    if (!ok) { setText(snapshot.content); setAttachment(snapshot.attachment); }
    ref.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (cannedMatches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCannedIndex((i) => (i + 1) % cannedMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCannedIndex((i) => (i - 1 + cannedMatches.length) % cannedMatches.length); return; }
      if (e.key === 'Tab') { e.preventDefault(); pickCanned(cannedMatches[cannedIndex]); return; }
    }
    if (e.key === 'Escape') { if (editing) { onCancelEdit(); setText(''); } else if (replyingTo) onCancelReply(); }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-2 sm:p-3">
      {(replyingTo || editing) && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
          {editing ? <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <Reply className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-900">{editing ? 'Editing message' : `Replying to ${replyingTo?.fromMe ? 'yourself' : 'their message'}`}</p>
            {!editing && <p className="truncate text-xs text-slate-700">{replyingTo?.content || 'Attachment'}</p>}
          </div>
          <button type="button" onClick={() => { if (editing) { onCancelEdit(); setText(''); } else onCancelReply(); }} aria-label="Cancel" className="rounded p-0.5 text-slate-500 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          {attachment.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-slate-600" /> : <FileText className="h-4 w-4 text-slate-600" />}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{attachment.name}</span>
          <span className="text-[11px] text-slate-500">{fileSize(attachment.size)}</span>
          <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment" className="rounded p-0.5 text-slate-500 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="relative">
        {cannedMatches.length > 0 && (
          <div role="listbox" aria-label="Saved replies" className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Saved replies · ↑↓ then Enter</p>
            {cannedMatches.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={i === cannedIndex}
                onMouseDown={(e) => { e.preventDefault(); pickCanned(c); }}
                className={cn('block w-full px-3 py-2 text-left', i === cannedIndex ? 'bg-amber-50' : 'hover:bg-slate-50')}
              >
                <span className="text-xs font-black text-amber-800">/{c.shortcut}</span>
                <span className="ml-2 line-clamp-1 text-xs text-slate-700">{c.text}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-400/30">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger disabled={disabled || !!editing} className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40" aria-label="More">
              <Plus className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52">
              <DropdownMenuItem onClick={() => fileRef.current?.click()}><Paperclip className="mr-2 h-4 w-4" /> Attach file</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCard('quote')}><Receipt className="mr-2 h-4 w-4" /> Send quote</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCard('payment_request')}><CreditCard className="mr-2 h-4 w-4" /> Request payment</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setText('/'); ref.current?.focus(); }}><Zap className="mr-2 h-4 w-4" /> Saved replies</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading || !!editing}
            aria-label="Attach a file"
            className="hidden shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 sm:block"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>

          <textarea
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={4000}
            placeholder={disabled ? 'Confirm your email to send messages' : editing ? 'Edit your message' : 'Write a message…'}
            aria-label="Message"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
          />

          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger disabled={disabled} className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40" aria-label="Emoji">
              <Smile className="h-5 w-5" />
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-64 p-2">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => { insert(e); setEmojiOpen(false); }} className="rounded-lg p-1 text-lg hover:bg-slate-100" aria-label={`Insert ${e}`}>{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={disabled || sending || uploading || (!text.trim() && !attachment)}
            aria-label={editing ? 'Save edit' : 'Send message'}
            className="shrink-0 rounded-xl bg-amber-400 p-2.5 text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-slate-500 sm:block">Enter to send · Shift + Enter for a new line · Type / for saved replies</p>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }}
      />

      <CardDialog kind={card} onClose={() => setCard(null)} onSubmit={async (meta) => {
        if (!card) return false;
        const ok = await onSendCard(card, meta);
        if (ok) setCard(null);
        return ok;
      }} />
    </div>
  );
}

function CardDialog({ kind, onClose, onSubmit }: {
  kind: CardKind | null;
  onClose: () => void;
  onSubmit: (meta: { amount: number; description: string; reference?: string; date?: string }) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (kind) { setAmount(''); setDescription(''); setReference(''); setDate(''); } }, [kind]);

  const isQuote = kind === 'quote';
  const valid = Number(amount) > 0 && description.trim().length > 0;

  return (
    <Dialog open={!!kind} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isQuote ? <Receipt className="h-5 w-5 text-amber-600" /> : <CreditCard className="h-5 w-5 text-amber-600" />}
            {isQuote ? 'Send a verified quote' : 'Request a payment'}
          </DialogTitle>
          <DialogDescription>
            {isQuote
              ? 'Appears in the chat as a quote card carrying your business’s verification badge.'
              : 'Appears as a payment request with your banking reference. Payment happens outside VerifiedBizLink.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            setBusy(true);
            await onSubmit({ amount: Number(amount), description: description.trim(), reference: reference.trim() || undefined, date: date || undefined });
            setBusy(false);
          }}
        >
          <div>
            <Label htmlFor="card-amount" className="text-sm font-semibold">Amount (R)</Label>
            <Input id="card-amount" inputMode="decimal" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4500.00" className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="card-desc" className="text-sm font-semibold">{isQuote ? 'What the quote covers' : 'What it is for'}</Label>
            <Input id="card-desc" required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isQuote ? '150L geyser supply and installation' : 'Deposit for geyser installation'} className="mt-1 h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="card-ref" className="text-sm font-semibold">Reference</Label>
              <Input id="card-ref" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={isQuote ? 'Q-1042' : 'INV-1042'} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="card-date" className="text-sm font-semibold">{isQuote ? 'Valid until' : 'Due by'}</Label>
              <Input id="card-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={!valid || busy} className="rounded-xl bg-amber-400 font-bold text-slate-900 hover:bg-amber-300">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isQuote ? 'Send quote' : 'Send request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
