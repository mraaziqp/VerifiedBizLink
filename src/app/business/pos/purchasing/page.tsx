'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Truck, PackageCheck, Trash2, Download, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { posFetch, zar } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';
import { cn } from '@/lib/utils';

interface Supplier { id: string; name: string; contact_person?: string; phone?: string; email?: string; order_count: number; total_purchased_cents: number }
interface POItem { id: string; product_id: string; product_name: string; unit: string; quantity_ordered: number; quantity_received: number; unit_cost_cents: number; total_cost_cents: number }
interface PO { id: string; po_number: string; supplier_name: string; status: string; total_cost_cents: number; ordered_at: string; received_at?: string; notes?: string; items: POItem[] }
interface Product { id: string; name: string; cost_price_cents: number; unit: string }

const STATUS_CLS: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-800', partially_received: 'bg-amber-100 text-amber-900',
  received: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-slate-200 text-slate-600',
};
const STATUS_LABEL: Record<string, string> = { ordered: 'Ordered', partially_received: 'Part received', received: 'Received', cancelled: 'Cancelled' };

export default function PosPurchasingPage() {
  const { toast } = useToast();
  const { ctx, can } = usePosContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplier, setSupplier] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const [poOpen, setPoOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poLines, setPoLines] = useState<{ productId: string; quantity: string; unitCost: string }[]>([]);
  const [poNotes, setPoNotes] = useState('');
  const [receiveFor, setReceiveFor] = useState<PO | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, o, p] = await Promise.all([posFetch('/api/pos/suppliers'), posFetch('/api/pos/purchasing'), posFetch('/api/pos/products')]);
    if (s.ok) setSuppliers((s.data.suppliers as Supplier[]) ?? []);
    if (o.ok) setOrders((o.data.orders as PO[]) ?? []);
    if (p.ok) setProducts((p.data.products as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const writable = can('purchasing.write') && ctx?.access.mode === 'full';

  const saveSupplier = async () => {
    setBusy(true);
    const r = await posFetch('/api/pos/suppliers', { method: 'POST', json: supplier });
    setBusy(false);
    if (!r.ok) return toast({ title: 'Supplier not saved', description: String(r.data.error ?? ''), variant: 'destructive' });
    setSupplierOpen(false);
    setSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    load();
  };

  const openPo = () => {
    setPoSupplier(suppliers[0]?.id ?? '');
    setPoLines([{ productId: products[0]?.id ?? '', quantity: '1', unitCost: products[0] ? (Number(products[0].cost_price_cents) / 100).toFixed(2) : '' }]);
    setPoNotes('');
    setPoOpen(true);
  };

  const poTotal = poLines.reduce((a, l) => a + Math.round((parseFloat(l.unitCost) || 0) * 100) * (parseFloat(l.quantity) || 0), 0);

  const savePo = async () => {
    const items = poLines.map((l) => ({ productId: l.productId, quantity: parseFloat(l.quantity), unitCostCents: Math.round(parseFloat(l.unitCost) * 100) }));
    if (!poSupplier || items.some((i) => !i.productId || !(i.quantity > 0) || !(i.unitCostCents >= 0))) {
      return toast({ title: 'Choose a supplier and fill in every line', variant: 'destructive' });
    }
    setBusy(true);
    const r = await posFetch('/api/pos/purchasing', { method: 'POST', json: { supplierId: poSupplier, items, notes: poNotes } });
    setBusy(false);
    if (!r.ok) return toast({ title: 'Order not saved', description: String(r.data.error ?? ''), variant: 'destructive' });
    toast({ title: `Purchase order ${(r.data.order as PO).po_number} created` });
    setPoOpen(false);
    load();
  };

  const openReceive = (po: PO) => {
    setReceiveFor(po);
    setReceiveQty(Object.fromEntries(po.items.map((i) => [i.id, String(Number(i.quantity_ordered) - Number(i.quantity_received))])));
  };

  const receive = async () => {
    if (!receiveFor) return;
    const items = receiveFor.items.map((i) => ({ itemId: i.id, quantity: parseFloat(receiveQty[i.id] || '0') })).filter((i) => i.quantity > 0);
    if (!items.length) return toast({ title: 'Enter what arrived', variant: 'destructive' });
    setBusy(true);
    const r = await posFetch('/api/pos/purchasing', { method: 'POST', json: { action: 'receive', poId: receiveFor.id, items } });
    setBusy(false);
    if (!r.ok) return toast({ title: 'Not received', description: String(r.data.error ?? ''), variant: 'destructive' });
    toast({ title: 'Stock received', description: 'Stock levels and average cost prices are updated.' });
    setReceiveFor(null);
    load();
  };

  const cancelPo = async (po: PO) => {
    const r = await posFetch('/api/pos/purchasing', { method: 'POST', json: { action: 'cancel', poId: po.id } });
    if (!r.ok) return toast({ title: 'Not cancelled', description: String(r.data.error ?? ''), variant: 'destructive' });
    load();
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader
          title="Suppliers & purchases"
          subtitle="Order stock, receive deliveries (in parts if needed) and keep supplier records."
          ctx={ctx}
          actions={writable ? (
            <>
              <Button variant="outline" onClick={() => setSupplierOpen(true)} className="rounded-xl text-xs"><Building2 className="h-4 w-4 mr-1" /> Add supplier</Button>
              <Button onClick={openPo} disabled={!suppliers.length || !products.length} className="rounded-xl bg-amber-400 text-slate-950 font-black text-xs"><Plus className="h-4 w-4 mr-1" /> New order</Button>
            </>
          ) : null}
        />

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Purchase orders</h2>
                {can('export') && <a href="/api/pos/export?type=purchases" className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"><Download className="h-3.5 w-3.5" /> CSV</a>}
              </div>
              {orders.length === 0 ? (
                <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{suppliers.length ? 'No orders yet.' : 'Add a supplier first, then create an order.'}</p>
              ) : orders.map((po) => (
                <div key={po.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-900">{po.po_number} · {po.supplier_name}</p>
                      <p className="text-xs text-slate-500">{new Date(po.ordered_at).toLocaleDateString('en-ZA')} · {zar(po.total_cost_cents)}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', STATUS_CLS[po.status])}>{STATUS_LABEL[po.status] ?? po.status}</span>
                  </div>
                  <ul className="text-xs text-slate-600">
                    {po.items.map((i) => <li key={i.id}>{i.product_name}: {i.quantity_received}/{i.quantity_ordered} {i.unit} @ {zar(i.unit_cost_cents)}</li>)}
                  </ul>
                  {writable && ['ordered', 'partially_received'].includes(po.status) && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openReceive(po)} className="h-8 rounded-lg bg-emerald-600 text-white text-xs"><PackageCheck className="h-3.5 w-3.5 mr-1" /> Receive</Button>
                      {po.status === 'ordered' && <Button size="sm" variant="outline" onClick={() => cancelPo(po)} className="h-8 rounded-lg text-xs">Cancel</Button>}
                    </div>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-black text-slate-900">Suppliers</h2>
              {suppliers.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">No suppliers yet.</p> : suppliers.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
                  <p className="flex items-center gap-1.5 font-black text-slate-900"><Truck className="h-4 w-4 text-indigo-500" /> {s.name}</p>
                  <p className="text-slate-500">{[s.contact_person, s.phone, s.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  <p className="mt-1 text-slate-600">{s.order_count} order{Number(s.order_count) === 1 ? '' : 's'} · {zar(s.total_purchased_cents)} purchased</p>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Add supplier</DialogTitle><DialogDescription className="text-xs">Only the name is required.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {([['name', 'Company name'], ['contactPerson', 'Contact person'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address']] as const).map(([k, label]) => (
              <Input key={k} value={supplier[k]} onChange={(e) => setSupplier((s) => ({ ...s, [k]: e.target.value }))} placeholder={label} aria-label={label} className="rounded-xl" />
            ))}
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSupplierOpen(false)} className="rounded-xl text-xs">Cancel</Button><Button onClick={saveSupplier} disabled={busy || !supplier.name.trim()} className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">Save</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">New purchase order</DialogTitle><DialogDescription className="text-xs">Stock is added only when you receive the delivery.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-xs">
            <label className="block font-bold text-slate-700">Supplier
              <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {poLines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_4.5rem_5.5rem_auto] items-end gap-2">
                <select value={l.productId} onChange={(e) => {
                  const prod = products.find((p) => p.id === e.target.value);
                  setPoLines((ls) => ls.map((x, i) => (i === idx ? { ...x, productId: e.target.value, unitCost: prod ? (Number(prod.cost_price_cents) / 100).toFixed(2) : x.unitCost } : x)));
                }} className="rounded-xl border border-slate-200 p-2" aria-label="Product">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input value={l.quantity} onChange={(e) => setPoLines((ls) => ls.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} type="number" inputMode="decimal" aria-label="Quantity" className="rounded-xl" />
                <Input value={l.unitCost} onChange={(e) => setPoLines((ls) => ls.map((x, i) => (i === idx ? { ...x, unitCost: e.target.value } : x)))} type="number" inputMode="decimal" aria-label="Unit cost in rand" placeholder="R / unit" className="rounded-xl" />
                <button onClick={() => setPoLines((ls) => ls.filter((_, i) => i !== idx))} disabled={poLines.length === 1} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Remove line"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPoLines((ls) => [...ls, { productId: products[0]?.id ?? '', quantity: '1', unitCost: '' }])} className="rounded-xl text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add line</Button>
            <Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-xl" />
            <p className="text-right text-sm font-black">Total {zar(poTotal)}</p>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPoOpen(false)} className="rounded-xl text-xs">Cancel</Button><Button onClick={savePo} disabled={busy} className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create order'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiveFor} onOpenChange={(o) => { if (!o) setReceiveFor(null); }}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          {receiveFor && (
            <>
              <DialogHeader><DialogTitle className="text-lg font-black">Receive {receiveFor.po_number}</DialogTitle><DialogDescription className="text-xs">Enter what actually arrived. Anything left stays on order.</DialogDescription></DialogHeader>
              <div className="space-y-2 text-xs">
                {receiveFor.items.map((i) => {
                  const left = Number(i.quantity_ordered) - Number(i.quantity_received);
                  return (
                    <div key={i.id} className="flex items-center justify-between gap-2">
                      <span>{i.product_name} <span className="text-slate-500">({left} outstanding)</span></span>
                      <Input type="number" inputMode="decimal" min={0} max={left} value={receiveQty[i.id] ?? ''} disabled={left <= 0} onChange={(e) => setReceiveQty((q) => ({ ...q, [i.id]: e.target.value }))} className="h-8 w-24 rounded-lg text-right" aria-label={`Received quantity for ${i.product_name}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReceiveFor(null)} className="rounded-xl text-xs">Cancel</Button><Button onClick={receive} disabled={busy} className="rounded-xl bg-emerald-600 text-white font-bold text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Receive into stock'}</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </GlassBackground>
  );
}
