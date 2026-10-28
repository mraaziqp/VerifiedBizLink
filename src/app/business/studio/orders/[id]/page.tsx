'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, CreditCard, Database, ExternalLink, FileText, Gift, Loader2, MessageSquare, Palette, PartyPopper, Send,
  Sparkles, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';
import { ProgressBar, StageBadge, rand } from '@/components/studio/studio-ui';
import type { StudioOrder } from '@/lib/studio';
import { DB_PLATFORMS, cleanDbKeys, dbPlatform } from '@/lib/db-platforms';

const STEPS: Array<{ key: StudioOrder['stage'][]; label: string }> = [
  { key: ['awaiting_payment'], label: 'Ordered' },
  { key: ['paid'], label: 'Queued' },
  { key: ['building'], label: 'Building' },
  { key: ['ready'], label: 'Ready to view' },
  { key: ['delivered'], label: 'Delivered' },
];

const EDIT_FIELDS: Array<{ path: string; label: string; placeholder: string; kind: 'text' | 'textarea' | 'color' }> = [
  { path: 'hero.title', label: 'Headline', placeholder: 'The big line at the top', kind: 'text' },
  { path: 'hero.subtitle', label: 'Sub-headline', placeholder: 'The sentence under it', kind: 'textarea' },
  { path: 'business.tagline', label: 'Tagline', placeholder: 'Short and memorable', kind: 'text' },
  { path: 'business.phone', label: 'Phone', placeholder: '021 555 0123', kind: 'text' },
  { path: 'business.email', label: 'Email', placeholder: 'hello@yourbusiness.co.za', kind: 'text' },
  { path: 'brand.primary', label: 'Main colour', placeholder: '#0f172a', kind: 'color' },
  { path: 'brand.accent', label: 'Accent colour', placeholder: '#f59e0b', kind: 'color' },
];

const when = (at: number | string) =>
  new Date(typeof at === 'number' ? at : at.replace(' ', 'T') + (at.length === 16 ? ':00Z' : '')).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function StudioOrderPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<StudioOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Whether this site is the one shown on the business's VerifiedBizLink profile.
  const [onProfile, setOnProfile] = useState<boolean | null>(null);
  const [linking, setLinking] = useState(false);
  const welcome = params.get('welcome') === '1';

  const load = useCallback(async () => {
    const res = await fetch(`/api/studio/orders/${encodeURIComponent(id)}`, { cache: 'no-store' }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.order) {
      setOrder(data.order);
      setError(null);
    } else setError(data?.error ?? 'This project could not be loaded.');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!order?.previewUrl) return;
    fetch('/api/studio', { cache: 'no-store' })
      .then((r) => r.json())
      .then((studio: { access?: { businessId?: string | null } }) =>
        studio.access?.businessId
          ? fetch(`/api/business/storefront?businessId=${encodeURIComponent(studio.access.businessId)}&summary=1`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
          : null,
      )
      .then((summary: { siteUrl?: string | null } | null) => setOnProfile(Boolean(summary?.siteUrl && summary.siteUrl === order.previewUrl)))
      .catch(() => setOnProfile(null));
  }, [order?.previewUrl]);

  const toggleProfile = async () => {
    if (!order) return;
    setLinking(true);
    const res = await fetch('/api/business/storefront', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onProfile ? { action: 'unlink_site' } : { action: 'link_site', orderId: order.id }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setLinking(false);
    if (!res?.ok) {
      toast({ title: 'Could not change your profile', description: data?.error, variant: 'destructive' });
      return;
    }
    setOnProfile(!onProfile);
    toast({ title: onProfile ? 'Removed from your profile' : 'Now on your VerifiedBizLink profile', description: onProfile ? undefined : 'Visitors see a Website button on your profile.' });
  };

  // While it is moving, keep it fresh.
  useEffect(() => {
    if (!order || order.stage === 'delivered' || order.stage === 'cancelled') return;
    const timer = setInterval(load, order.stage === 'awaiting_payment' ? 8000 : 20000);
    return () => clearInterval(timer);
  }, [order, load]);

  const send = async () => {
    if (message.trim().length < 2) return;
    setSending(true);
    const res = await fetch(`/api/studio/orders/${encodeURIComponent(id)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return toast({ title: 'Message not sent', description: data.error, variant: 'destructive' });
    setMessage('');
    toast({ title: 'Sent to the studio' });
    load();
  };

  const cancel = async () => {
    if (!confirm('Cancel this order? Any credit you put towards it comes back to you.')) return;
    setCancelling(true);
    const res = await fetch(`/api/studio/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setCancelling(false);
    if (!res.ok) return toast({ title: 'Could not cancel', description: data.error, variant: 'destructive' });
    toast({ title: 'Order cancelled' });
    load();
  };

  const openReceipt = async (receiptId: string) => {
    const res = await fetch(`/api/studio/receipts/${encodeURIComponent(receiptId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.receipt) return toast({ title: 'Receipt unavailable', description: data.error, variant: 'destructive' });
    printReceipt(data.receipt);
  };

  if (error && !order) {
    return (
      <GlassBackground>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-bold text-slate-900">{error}</p>
          <Button asChild className="mt-6 rounded-xl"><Link href="/business/studio">Back to Build Studio</Link></Button>
        </div>
      </GlassBackground>
    );
  }
  if (!order) {
    return (
      <GlassBackground>
        <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      </GlassBackground>
    );
  }

  const stepIndex = STEPS.findIndex((step) => step.key.includes(order.stage));

  return (
    <GlassBackground>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/business/studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Build Studio
        </Link>

        {welcome && order.stage !== 'awaiting_payment' && order.stage !== 'cancelled' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Thank you — your build is under way.</p>
              <p className="mt-0.5">Progress shows here as it happens, and we email you when it is ready to view.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{order.itemName}</p>
              <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{order.businessName}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Ordered {when(order.createdAt)}
                {order.orderRef ? ` · Ref ${order.orderRef}` : ''}
              </p>
            </div>
            <StageBadge stage={order.stage} className="self-start text-xs" />
          </div>

          {order.stage !== 'cancelled' && (
            <ol className="mt-6 grid grid-cols-5 gap-1.5">
              {STEPS.map((step, index) => {
                const done = index < stepIndex || order.stage === 'delivered';
                const current = index === stepIndex && order.stage !== 'delivered';
                return (
                  <li key={step.label} className="space-y-1.5">
                    <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : current ? 'bg-amber-400' : 'bg-slate-100'}`} />
                    <p className={`text-[10px] font-bold sm:text-xs ${done || current ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                  </li>
                );
              })}
            </ol>
          )}
          {(order.stage === 'paid' || order.stage === 'building') && <ProgressBar value={order.progress} stage={order.stage} className="mt-4" />}
          {order.latestNote && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{order.latestNote}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {order.payUrl && (
              <Button asChild className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                <a href={order.payUrl}><CreditCard className="mr-1.5 h-4 w-4" /> Pay {rand(order.amount - order.creditUsed)} to start</a>
              </Button>
            )}
            {order.previewUrl && (
              <Button asChild className="rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
                <a href={order.previewUrl} target="_blank" rel="noopener noreferrer">
                  <Sparkles className="mr-1.5 h-4 w-4 text-amber-400" /> Open your site <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {order.previewUrl && ['ready', 'delivered'].includes(order.stage) && onProfile !== null && (
              <Button variant="outline" onClick={toggleProfile} disabled={linking} className="rounded-xl">
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : onProfile ? 'Remove from my profile' : 'Show on my VerifiedBizLink profile'}
              </Button>
            )}
            {order.stage === 'awaiting_payment' && (
              <Button variant="outline" onClick={cancel} disabled={cancelling} className="rounded-xl">
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel order'}
              </Button>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            {/* Live preview */}
            {order.previewUrl && (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-2 truncate text-xs font-medium text-slate-500">{order.previewUrl.replace(/^https?:\/\//, '')}</span>
                </div>
                <iframe src={order.previewUrl} title={`${order.businessName} preview`} className="h-[520px] w-full bg-white" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" />
              </section>
            )}

            {!order.previewUrl && order.stage !== 'cancelled' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <h2 className="text-sm font-extrabold text-slate-900">What happens next</h2>
                <ol className="mt-4 space-y-4">
                  {[
                    { title: order.stage === 'awaiting_payment' ? 'Pay to start' : 'Paid — thank you', text: order.stage === 'awaiting_payment' ? 'Your build starts the moment payment clears. Unpaid orders are released after 7 days and any credit comes back.' : 'Your order is in the studio’s queue.', done: order.stage !== 'awaiting_payment' },
                    { title: 'We build it', text: 'The studio designs and builds it from your brief, with your business details. Progress shows on this page.', done: order.stage === 'ready' || order.stage === 'delivered' },
                    { title: 'You review it live', text: 'You get a link to your site to look through on your phone and computer, and we email you.', done: false },
                    { title: 'Make it yours', text: 'Change words, colours and sections yourself from here, any time — or ask for anything bigger in a sentence.', done: false },
                  ].map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${step.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{step.title}</p>
                        <p className="text-xs text-slate-500">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {order.canEdit && <EditPanel orderId={order.id} onSent={load} />}
            {order.canEdit && <DatabasePanel orderId={order.id} onSent={load} />}

            {order.edits.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-extrabold text-slate-900">Your changes</h2>
                <ul className="mt-3 divide-y divide-slate-100">
                  {order.edits.map((edit) => (
                    <li key={edit.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{edit.summary}</p>
                        <p className="text-xs text-slate-500">{when(edit.at)}{edit.message ? ` · ${edit.message}` : ''}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        edit.status === 'done' ? 'bg-emerald-100 text-emerald-800' : edit.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {edit.status === 'done' ? 'Live' : edit.status === 'failed' ? 'Needs a look' : edit.status === 'applying' ? 'Making it' : 'Queued'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {order.activity.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-extrabold text-slate-900">Build history</h2>
                <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                  {order.activity.slice(-15).reverse().map((line, index) => (
                    <li key={`${line.at}-${index}`} className="relative">
                      <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-slate-300'}`} />
                      <p className="text-sm text-slate-700">{line.text}</p>
                      {line.at && <p className="text-[11px] text-slate-400">{when(line.at)}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {/* Summary */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-extrabold text-slate-900">Order</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {order.listPrice > order.amount && (
                  <div className="flex justify-between"><dt className="text-slate-500">List price</dt><dd className="text-slate-400 line-through">{rand(order.listPrice)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-slate-500">Member price</dt><dd className="font-bold text-slate-900">{rand(order.amount)}</dd></div>
                {order.creditUsed > 0 && (
                  <div className="flex justify-between"><dt className="flex items-center gap-1 text-slate-500"><Gift className="h-3.5 w-3.5 text-emerald-600" /> Credit</dt><dd className="font-bold text-emerald-700">−{rand(order.creditUsed)}</dd></div>
                )}
              </dl>
              {order.receipts.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {order.receipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      onClick={() => openReceipt(receipt.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700"><FileText className="h-3.5 w-3.5 text-slate-400" /> Receipt {receipt.receiptNumber}</span>
                      <span className="font-bold text-slate-900">{rand(receipt.amount)}</span>
                    </button>
                  ))}
                </div>
              )}
              <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <summary className="cursor-pointer font-bold text-slate-700">Your brief</summary>
                <p className="mt-2 whitespace-pre-wrap">{order.brief}</p>
              </details>
            </section>

            {/* Messages */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><MessageSquare className="h-4 w-4 text-amber-500" /> Talk to the studio</h2>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {order.messages.length === 0 ? (
                  <p className="text-xs text-slate-500">Questions, ideas, a logo link — write here and the studio answers by email.</p>
                ) : (
                  order.messages.map((m, index) => (
                    <div key={`${m.at}-${index}`} className={`rounded-2xl px-3 py-2 text-sm ${m.from === 'customer' ? 'ml-6 bg-slate-900 text-white' : 'mr-6 bg-amber-50 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${m.from === 'customer' ? 'text-slate-400' : 'text-amber-700'}`}>{m.from === 'customer' ? 'You' : 'Studio'} · {when(m.at)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} placeholder="Write a message…" className="rounded-xl" />
                <Button onClick={send} disabled={sending || message.trim().length < 2} className="w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-4 w-4" /> Send</>}
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </GlassBackground>
  );
}

/**
 * Connect the finished app to the member's own database: choose the platform,
 * follow its steps, paste its public keys. The studio puts them in the app and
 * rebuilds it; from then on everyone's data is saved there.
 */
function DatabasePanel({ orderId, onSent }: { orderId: string; onSent: () => void }) {
  const { toast } = useToast();
  const [platformId, setPlatformId] = useState('supabase');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const platform = dbPlatform(platformId)!;

  const submit = async () => {
    const clean = cleanDbKeys(platformId, values);
    if (!clean.ok) return toast({ title: 'Check the keys', description: clean.error, variant: 'destructive' });
    setSaving(true);
    const res = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: clean.platform, values: clean.values }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast({ title: 'Not connected', description: data.error, variant: 'destructive' });
    setValues({});
    toast({ title: `${platform.name} is being connected`, description: 'Your app is rebuilt with it in a few minutes.' });
    onSent();
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Database className="h-4 w-4 text-amber-500" /> Connect your database</h2>
      <p className="mt-1 text-xs text-slate-500">Your app saves its data in your own database: we never hold it. Until you connect one, data stays in each visitor’s browser.</p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700" htmlFor="db-platform">Platform</label>
          <select
            id="db-platform"
            value={platformId}
            onChange={(e) => {
              setPlatformId(e.target.value);
              setValues({});
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {DB_PLATFORMS.filter((p) => p.id !== 'local').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            {platform.howTo}{' '}
            {platform.signUpUrl && (
              <a href={platform.signUpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-700 hover:underline">
                Open {platform.name}
              </a>
            )}
          </p>
        </div>
        {platform.fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-bold text-slate-700" htmlFor={`db-${field.key}`}>
              {field.label}
              {field.optional ? <span className="font-normal text-slate-400"> (optional)</span> : null}
            </label>
            <Input
              id={`db-${field.key}`}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="rounded-xl font-mono text-xs"
            />
          </div>
        ))}
        <Button onClick={submit} disabled={saving} className="w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Connect ${platform.name}`}
        </Button>
        <p className="text-[11px] text-slate-500">Only public keys go here: anything in a web app can be read by its visitors. Secret keys are refused.</p>
      </div>
    </section>
  );
}

function EditPanel({ orderId, onSent }: { orderId: string; onSent: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const patch = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()));
    if (!Object.keys(patch).length && note.trim().length < 4) {
      return toast({ title: 'Change something first', description: 'Fill in a field, or describe what you would like changed.' });
    }
    setSaving(true);
    const res = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/edits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch, note: note.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast({ title: 'Change not sent', description: data.error, variant: 'destructive' });
    setValues({});
    setNote('');
    toast({ title: 'Change on its way', description: 'Your site updates at the same link in a few minutes.' });
    onSent();
  };

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Wand2 className="h-4 w-4 text-amber-500" /> Edit your site</h2>
      <p className="mt-1 text-xs text-slate-500">Fill in only what you want to change. It updates at the same link in a few minutes.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {EDIT_FIELDS.map((field) => (
          <div key={field.path} className={field.kind === 'textarea' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700" htmlFor={`edit-${field.path}`}>
              {field.kind === 'color' && <Palette className="h-3.5 w-3.5 text-slate-400" />} {field.label}
            </label>
            {field.kind === 'textarea' ? (
              <Textarea id={`edit-${field.path}`} rows={2} value={values[field.path] ?? ''} onChange={(e) => setValues({ ...values, [field.path]: e.target.value })} placeholder={field.placeholder} className="rounded-xl" />
            ) : field.kind === 'color' ? (
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={field.label}
                  value={/^#[0-9a-f]{6}$/i.test(values[field.path] ?? '') ? values[field.path] : field.placeholder}
                  onChange={(e) => setValues({ ...values, [field.path]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <Input id={`edit-${field.path}`} value={values[field.path] ?? ''} onChange={(e) => setValues({ ...values, [field.path]: e.target.value })} placeholder={field.placeholder} className="rounded-xl font-mono" />
              </div>
            ) : (
              <Input id={`edit-${field.path}`} value={values[field.path] ?? ''} onChange={(e) => setValues({ ...values, [field.path]: e.target.value })} placeholder={field.placeholder} className="rounded-xl" />
            )}
          </div>
        ))}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700" htmlFor="edit-note">Anything else, in your words</label>
          <Textarea id="edit-note" rows={3} maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a pricing section, swap the photos for something warmer, move the reviews higher…" className="rounded-xl" />
        </div>
      </div>
      <Button onClick={submit} disabled={saving} className="mt-4 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300 sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Send changes</>}
      </Button>
    </section>
  );
}

interface Receipt {
  receiptNumber: string;
  reference: string;
  amount: number;
  currency: string;
  paidAt: number;
  method: string;
  item: string;
  payerName: string;
  payerEmail: string;
  sha256: string;
}

/** A clean printable receipt in a new window (save as PDF from the print dialog). */
function printReceipt(receipt: Receipt) {
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return;
  const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(receipt.receiptNumber)}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:600px;margin:40px auto;padding:0 24px}
h1{font-size:22px;margin:0}.muted{color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:24px}
td{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}td:last-child{text-align:right;font-weight:600}
.total td{font-size:18px;border-bottom:0}.hash{font-family:monospace;font-size:10px;color:#94a3b8;word-break:break-all;margin-top:32px}</style></head>
<body><h1>Payment receipt</h1><p class="muted">Build Studio · ARP Cloud Solutions for VerifiedBizLink members</p>
<table><tr><td>Receipt</td><td>${esc(receipt.receiptNumber)}</td></tr><tr><td>Reference</td><td>${esc(receipt.reference)}</td></tr>
<tr><td>Date</td><td>${esc(new Date(receipt.paidAt).toLocaleString('en-ZA'))}</td></tr><tr><td>Paid by</td><td>${esc(receipt.payerName)} (${esc(receipt.payerEmail)})</td></tr>
<tr><td>For</td><td>${esc(receipt.item)}</td></tr><tr><td>Method</td><td>${esc(receipt.method)}</td></tr>
<tr class="total"><td>Total</td><td>${esc(receipt.currency)} ${esc(Number(receipt.amount).toFixed(2))}</td></tr></table>
<p class="hash">Verification digest: ${esc(receipt.sha256)}</p><script>window.print()</script></body></html>`);
  win.document.close();
}
