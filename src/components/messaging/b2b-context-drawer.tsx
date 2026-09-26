'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X, BadgeCheck, ShieldCheck, Building2, Globe, Phone, MapPin, ExternalLink, Receipt, CreditCard, FileText,
  Image as ImageIcon, Zap, Trash2, Plus, Loader2, CalendarDays, AlertTriangle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CannedResponse, ContactContext } from '@/lib/messaging';
import { deleteCannedResponse, getContactContext, saveCannedResponse } from '@/app/actions/messaging-actions';
import type { CardKind } from './message-composer';
import { initials } from './format';

interface Props {
  otherId: string;
  onClose: () => void;
  onRequestCard: (kind: CardKind) => void;
  canned: CannedResponse[];
  onCannedChange: (list: CannedResponse[]) => void;
  /** Bumps when a message is sent, so the shared-files list refreshes. */
  refreshKey: number;
}

export function B2BContextDrawer({ otherId, onClose, onRequestCard, canned, onCannedChange, refreshKey }: Props) {
  const [ctx, setCtx] = useState<ContactContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getContactContext(otherId).then((r) => {
      if (!active) return;
      if (r.ok) { setCtx(r.context); setError(null); } else setError(r.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [otherId, refreshKey]);

  const biz = ctx?.business;
  const verified = biz?.status === 'verified';
  const images = ctx?.sharedFiles.filter((f) => f.type.startsWith('image/')) ?? [];
  const docs = ctx?.sharedFiles.filter((f) => !f.type.startsWith('image/')) ?? [];

  return (
    <aside className="flex h-full min-h-0 flex-col bg-white" aria-label="Contact details">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Details</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label="Close details">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 custom-scrollbar">
        {loading && !ctx && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>}
        {error && !ctx && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {ctx && (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-white shadow-md ring-2 ring-amber-400">
                  <AvatarImage src={ctx.avatarUrl || undefined} alt="" />
                  <AvatarFallback className="bg-slate-900 text-lg font-black text-amber-400">{initials(biz?.companyName || ctx.name)}</AvatarFallback>
                </Avatar>
                {ctx.online && <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />}
              </div>
              <p className="mt-3 flex items-center gap-1 text-base font-black text-slate-900">
                {biz?.companyName || ctx.name}
                {verified && <BadgeCheck className="h-5 w-5 text-amber-500" aria-label="Verified business" />}
              </p>
              <p className="text-xs text-slate-600">{biz ? ctx.name : ctx.headline || 'Member'}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">{ctx.online ? '● Online now' : ctx.memberSince ? `Member since ${new Date(ctx.memberSince).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}` : ''}</p>
            </div>

            {biz ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <TrustRing score={biz.trustScore} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trust score</p>
                    <p className="text-sm font-bold text-slate-900">{biz.trustScore >= 80 ? 'Excellent' : biz.trustScore >= 60 ? 'Good' : biz.trustScore >= 40 ? 'Building trust' : 'New'}</p>
                    {biz.industry && <p className="truncate text-xs text-slate-600">{biz.industry}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge ok={verified} label={verified ? 'Verified business' : 'Not yet verified'} icon={ShieldCheck} />
                  <Badge ok={verified && !!biz.regNumber} label="CIPC registered" icon={Building2} />
                  <Badge ok={verified && biz.hasVat} label="SARS / VAT" icon={Receipt} />
                </div>
                {!verified && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This business has not completed verification. Take care with payments.
                  </p>
                )}
                <div className="mt-3 space-y-1.5 text-xs">
                  {biz.website && (
                    <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-blue-700 hover:underline">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" /> <span className="truncate">{biz.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {biz.phone && <a href={`tel:${biz.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-slate-800 hover:underline"><Phone className="h-3.5 w-3.5 text-slate-500" /> {biz.phone}</a>}
                  {ctx.location && <p className="flex items-center gap-2 text-slate-800"><MapPin className="h-3.5 w-3.5 text-slate-500" /> {ctx.location}</p>}
                  {biz.verifiedAt && <p className="flex items-center gap-2 text-slate-800"><CalendarDays className="h-3.5 w-3.5 text-slate-500" /> Verified {new Date(biz.verifiedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                </div>
                <Link href={`/business/${biz.id}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-800 hover:bg-slate-100">
                  View business profile <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </section>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {ctx.name} is a member without a business profile.
              </p>
            )}

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Quick actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onRequestCard('quote')} className="flex flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900 hover:bg-amber-100">
                  <Receipt className="h-5 w-5" /> Send verified quote
                </button>
                <button type="button" onClick={() => onRequestCard('payment_request')} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 hover:bg-slate-50">
                  <CreditCard className="h-5 w-5" /> Request payment
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                Shared files <span className="font-bold normal-case tracking-normal">{ctx.sharedFiles.length}</span>
              </h3>
              {ctx.sharedFiles.length === 0 && <p className="text-xs text-slate-600">Photos and documents you exchange appear here.</p>}
              {images.length > 0 && (
                <div className="mb-2 grid grid-cols-3 gap-1.5">
                  {images.slice(0, 9).map((f) => (
                    <a key={f.messageId} href={f.url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img src={f.url} alt={f.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <ul className="space-y-1.5">
                {docs.map((f) => (
                  <li key={f.messageId}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs hover:bg-slate-50">
                      <FileText className="h-4 w-4 shrink-0 text-slate-600" />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{f.name}</span>
                      <span className="shrink-0 text-[10px] text-slate-500">{new Date(f.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                    </a>
                  </li>
                ))}
              </ul>
              {images.length > 9 && <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><ImageIcon className="h-3 w-3" /> +{images.length - 9} more photos in the chat</p>}
            </section>
          </>
        )}

        <SavedReplies canned={canned} onChange={onCannedChange} />
      </div>
    </aside>
  );
}

function Badge({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold', ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500')}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function TrustRing({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={s >= 60 ? '#f59e0b' : '#94a3b8'} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900">{s}</span>
    </div>
  );
}

function SavedReplies({ canned, onChange }: { canned: CannedResponse[]; onChange: (l: CannedResponse[]) => void }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section>
      <h3 className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Saved replies</span>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-bold normal-case tracking-normal text-slate-700 hover:bg-slate-100">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </h3>
      <p className="mb-2 text-[11px] text-slate-600">Type <span className="rounded bg-slate-100 px-1 font-mono font-bold">/</span> in the message box to use one.</p>
      {adding && (
        <form
          className="mb-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await saveCannedResponse(shortcut, text);
            setBusy(false);
            if (!r.ok) { toast({ title: 'Not saved', description: r.error, variant: 'destructive' }); return; }
            onChange([...canned.filter((c) => c.shortcut !== r.response.shortcut), r.response].sort((a, b) => a.shortcut.localeCompare(b.shortcut)));
            setShortcut(''); setText(''); setAdding(false);
          }}
        >
          <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
            <span className="font-mono text-sm font-bold text-slate-500">/</span>
            <input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="thanks" maxLength={24} required aria-label="Shortcut" className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm focus:outline-none" />
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Thanks for reaching out — we'll reply within one business day." maxLength={2000} required rows={3} aria-label="Reply text" className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-amber-400 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-60">{busy ? 'Saving…' : 'Save reply'}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      )}
      <ul className="space-y-1.5">
        {canned.map((c) => (
          <li key={c.id} className="group flex items-start gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-amber-800">/{c.shortcut}</p>
              <p className="line-clamp-2 text-xs text-slate-700">{c.text}</p>
            </div>
            <button
              type="button"
              onClick={async () => { onChange(canned.filter((x) => x.id !== c.id)); await deleteCannedResponse(c.id); }}
              aria-label={`Delete /${c.shortcut}`}
              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {canned.length === 0 && !adding && <li className="text-xs text-slate-600">No saved replies yet.</li>}
      </ul>
    </section>
  );
}
