'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, MessageSquare, Undo2, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { posFetch, newIdempotencyKey, zar, METHOD_LABELS } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';
import { cn } from '@/lib/utils';

interface Sale {
  id: string;
  receipt_number: string;
  total_cents: number;
  refunded_cents: number;
  tax_cents: number;
  discount_cents: number;
  platform_fee_cents: number;
  fee_reversed_cents: number;
  payment_method: string;
  payment_status: string;
  payment_reference?: string | null;
  cashier_name?: string | null;
  customer_phone?: string | null;
  review_reason?: string | null;
  is_offline_sync: boolean;
  created_at: string;
  completed_at?: string | null;
}

interface Item { id: string; product_name: string; quantity: number; refunded_quantity: number; unit_price_cents: number; discount_cents: number; total_cents: number }
interface Refund { id: string; amount_cents: number; fee_reversal_cents: number; reason: string; created_at: string; restocked: boolean }

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800' },
  partially_refunded: { label: 'Part refunded', cls: 'bg-amber-100 text-amber-900' },
  refunded: { label: 'Refunded', cls: 'bg-slate-200 text-slate-700' },
  pending: { label: 'Awaiting payment', cls: 'bg-blue-100 text-blue-800' },
  failed: { label: 'Failed', cls: 'bg-rose-100 text-rose-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-800' },
};

export default function PosSalesPage() {
  const { toast } = useToast();
  const { ctx, can } = usePosContext();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [open, setOpen] = useState<{ sale: Sale; items: Item[]; refunds: Refund[] } | null>(null);
  const [refundMode, setRefundMode] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('Customer returned goods');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const refundKey = useRef('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '200' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const r = await posFetch(`/api/pos/sales?${params}`);
    if (r.ok) setSales((r.data.sales as Sale[]) || []);
    else toast({ title: 'Could not load sales', description: String(r.data.error ?? ''), variant: 'destructive' });
    setLoading(false);
  }, [from, to, toast]);

  useEffect(() => { load(); }, [load]);

  const openSale = async (s: Sale) => {
    const r = await posFetch(`/api/pos/sales?id=${s.id}`);
    if (!r.ok) return;
    setOpen({ sale: r.data.sale as Sale, items: (r.data.items as Item[]) ?? [], refunds: (r.data.refunds as Refund[]) ?? [] });
    setRefundMode(false);
  };

  const startRefund = () => {
    if (!open) return;
    refundKey.current = newIdempotencyKey('refund');
    setQty(Object.fromEntries(open.items.map((i) => [i.id, String(Number(i.quantity) - Number(i.refunded_quantity))])));
    setReason('Customer returned goods');
    setRestock(true);
    setRefundMode(true);
  };

  const refundPreview = open
    ? open.items.reduce((a, i) => {
        const q = Math.min(Number(qty[i.id] || 0), Number(i.quantity) - Number(i.refunded_quantity));
        return a + (q > 0 ? Math.round((Number(i.total_cents) * q) / Number(i.quantity)) : 0);
      }, 0)
    : 0;

  const submitRefund = async () => {
    if (!open) return;
    const items = open.items
      .map((i) => ({ saleItemId: i.id, quantity: Number(qty[i.id] || 0) }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      toast({ title: 'Choose what to refund', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const r = await posFetch(`/api/pos/sales/${open.sale.id}/refund`, { method: 'POST', json: { idempotencyKey: refundKey.current, reason, restockItems: restock, items } });
    setBusy(false);
    if (!r.ok) {
      toast({ title: 'Refund not processed', description: String(r.data.error ?? ''), variant: 'destructive' });
      return;
    }
    const refund = r.data.refund as Refund;
    toast({
      title: `Refunded ${zar(refund.amount_cents)}`,
      description: `${r.data.instructions ?? ''} VerifiedBizLink fee of ${zar(refund.fee_reversal_cents)} given back.`.trim(),
    });
    setOpen(null);
    load();
  };

  const filtered = sales.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || s.receipt_number.toLowerCase().includes(q) || (s.cashier_name ?? '').toLowerCase().includes(q) || (s.payment_reference ?? '').toLowerCase().includes(q);
  });

  const waText = (s: Sale, items: Item[]) =>
    [`*${ctx?.businessName ?? ''}*`, `Receipt ${s.receipt_number}`, new Date(s.created_at).toLocaleString('en-ZA'), '',
      ...items.map((i) => `${i.quantity} x ${i.product_name}  ${zar(i.total_cents)}`), '', `Total: ${zar(s.total_cents)}`,
      Number(s.refunded_cents) ? `Refunded: ${zar(s.refunded_cents)}` : '', `Paid: ${METHOD_LABELS[s.payment_method] ?? s.payment_method}`].filter(Boolean).join('\n');

  return (
    <GlassBackground>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader
          title="Sales & refunds"
          subtitle="Every receipt. Refunds are recorded separately — the original sale is never changed."
          ctx={ctx}
          actions={can('export') ? <a href="/api/pos/export?type=sales" className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> Export CSV</a> : null}
        />

        <div className="flex flex-wrap items-end gap-2">
          <div className="relative flex-1 min-w-[12rem]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Receipt, cashier or card reference" className="pl-9 rounded-xl bg-white" aria-label="Search sales" />
          </div>
          <label className="text-xs font-bold text-slate-600">From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl bg-white" /></label>
          <label className="text-xs font-bold text-slate-600">To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl bg-white" /></label>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No sales yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Receipt</th><th>When</th><th>Paid by</th><th>Cashier</th><th className="text-right">Total</th><th className="text-right">Refunded</th><th className="p-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-amber-50/40" onClick={() => openSale(s)}>
                    <td className="p-3 font-black text-slate-900">
                      {s.receipt_number}
                      {s.review_reason && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-amber-600" aria-label="Needs review" />}
                      {s.is_offline_sync && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">offline</span>}
                    </td>
                    <td className="whitespace-nowrap">{new Date(s.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{METHOD_LABELS[s.payment_method] ?? s.payment_method}</td>
                    <td>{s.cashier_name ?? '—'}</td>
                    <td className="text-right font-bold">{zar(s.total_cents)}</td>
                    <td className="text-right">{Number(s.refunded_cents) ? zar(s.refunded_cents) : '—'}</td>
                    <td className="p-3"><span className={cn('rounded-full px-2 py-0.5 font-bold', STATUS[s.payment_status]?.cls ?? 'bg-slate-100')}>{STATUS[s.payment_status]?.label ?? s.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => { if (!o && !busy) setOpen(null); }}>
        <DialogContent className="max-w-lg rounded-3xl bg-white p-6">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Receipt {open.sale.receipt_number}</DialogTitle>
                <DialogDescription className="text-xs">
                  {new Date(open.sale.created_at).toLocaleString('en-ZA')} · {METHOD_LABELS[open.sale.payment_method] ?? open.sale.payment_method}
                  {open.sale.payment_reference ? ` · ref ${open.sale.payment_reference}` : ''} · {STATUS[open.sale.payment_status]?.label ?? open.sale.payment_status}
                </DialogDescription>
              </DialogHeader>

              {open.sale.review_reason && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><AlertTriangle className="inline h-3.5 w-3.5 mr-1" />Needs review: {open.sale.review_reason.replace(/_/g, ' ')}</p>
              )}

              <div className="max-h-72 overflow-y-auto text-xs">
                <table className="w-full">
                  <thead className="text-slate-500"><tr><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Total</th>{refundMode && <th className="text-right">Refund qty</th>}</tr></thead>
                  <tbody>
                    {open.items.map((i) => {
                      const left = Number(i.quantity) - Number(i.refunded_quantity);
                      return (
                        <tr key={i.id} className="border-t border-slate-100">
                          <td className="py-1.5">{i.product_name}{Number(i.discount_cents) ? <span className="text-emerald-700"> (−{zar(i.discount_cents)})</span> : null}{Number(i.refunded_quantity) ? <span className="block text-slate-500">{i.refunded_quantity} refunded</span> : null}</td>
                          <td className="text-right">{i.quantity}</td>
                          <td className="text-right">{zar(i.total_cents)}</td>
                          {refundMode && (
                            <td className="text-right">
                              <Input type="number" min={0} max={left} step="any" value={qty[i.id] ?? ''} disabled={left <= 0} onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))} className="ml-auto h-8 w-20 rounded-lg text-right" aria-label={`Refund quantity for ${i.product_name}`} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-2 space-y-0.5 border-t pt-2">
                  <div className="flex justify-between font-black"><span>Total</span><span>{zar(open.sale.total_cents)}</span></div>
                  {Number(open.sale.tax_cents) > 0 && <div className="flex justify-between text-slate-500"><span>Incl. VAT</span><span>{zar(open.sale.tax_cents)}</span></div>}
                  <div className="flex justify-between text-slate-500"><span>VerifiedBizLink fee</span><span>{zar(open.sale.platform_fee_cents)}{Number(open.sale.fee_reversed_cents) ? ` (−${zar(open.sale.fee_reversed_cents)} returned)` : ''}</span></div>
                </div>
                {open.refunds.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="font-bold text-slate-700">Refunds</p>
                    {open.refunds.map((r) => (
                      <p key={r.id} className="text-slate-600">{new Date(r.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })} — {zar(r.amount_cents)}: {r.reason}{r.restocked ? ' (restocked)' : ''}</p>
                    ))}
                  </div>
                )}
              </div>

              {refundMode ? (
                <div className="space-y-3 border-t pt-3">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-xl text-xs" maxLength={300} aria-label="Refund reason" />
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700">Put the items back into stock <Switch checked={restock} onCheckedChange={setRestock} /></label>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRefundMode(false)} disabled={busy} className="rounded-xl text-xs">Back</Button>
                    <Button onClick={submitRefund} disabled={busy || refundPreview <= 0} className="rounded-xl bg-rose-600 text-white text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Refund about ${zar(refundPreview)}`}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                  <Button asChild variant="outline" className="rounded-xl text-xs">
                    <a href={`https://wa.me/${(open.sale.customer_phone ?? '').replace(/\D/g, '').replace(/^0/, '27')}?text=${encodeURIComponent(waText(open.sale, open.items))}`} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-4 w-4 mr-1" /> WhatsApp</a>
                  </Button>
                  {can('sale.refund') && ['completed', 'partially_refunded'].includes(open.sale.payment_status) && ctx?.access.mode === 'full' && (
                    <Button onClick={startRefund} className="rounded-xl bg-slate-900 text-white text-xs"><Undo2 className="h-4 w-4 mr-1" /> Refund</Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </GlassBackground>
  );
}
