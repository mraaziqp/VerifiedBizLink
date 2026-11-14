'use client';

import { useState } from 'react';
import {
  Truck, Plus, CheckCircle2, PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zar } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: 'ordered' | 'received' | 'cancelled';
  total_cost_cents: number | string;
  ordered_at?: string;
  received_at?: string;
  notes?: string;
  item_count?: number;
}

interface PosPurchasingGrvProps {
  orders: PurchaseOrder[];
  suppliers: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; cost_price_cents: number | string }>;
  onReceivePO: (poId: string) => Promise<void>;
  onCreatePO: (supplierId: string, items: Array<{ productId: string; quantity: number; unitCostCents: number }>, notes?: string) => Promise<void>;
}

export function PosPurchasingGrv({
  orders,
  suppliers,
  products,
  onReceivePO,
  onCreatePO,
}: PosPurchasingGrvProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0]?.id || '');
  const [poNotes, setPoNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [poQty, setPoQty] = useState('20');
  const [poUnitCostRand, setPoUnitCostRand] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const handleReceive = async (poId: string) => {
    setReceivingId(poId);
    try {
      await onReceivePO(poId);
    } finally {
      setReceivingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !selectedProductId) return;
    const qty = parseInt(poQty || '1', 10);
    const costCents = Math.round(parseFloat(poUnitCostRand || '0') * 100);
    setSubmitting(true);
    try {
      await onCreatePO(
        selectedSupplier,
        [{ productId: selectedProductId, quantity: qty, unitCostCents: costCents }],
        poNotes
      );
      setCreateModalOpen(false);
      setPoNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-blue-600" />
            Purchasing &amp; Goods Received Vouchers (GRV)
          </h2>
          <p className="text-[11px] text-slate-500">Manage supplier purchase orders and 1-click inventory delivery receiving</p>
        </div>

        <Button
          onClick={() => {
            const prod = products[0];
            if (prod) {
              setSelectedProductId(prod.id);
              setPoUnitCostRand((Number(prod.cost_price_cents) / 100).toFixed(2));
            }
            setCreateModalOpen(true);
          }}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 rounded-xl flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> + Create Purchase Order
        </Button>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3.5">PO Number</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Date Ordered</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">GRV Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No purchase orders recorded. Click &quot;+ Create Purchase Order&quot; or reorder from Low Stock alerts.
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const isReceived = po.status === 'received';
                  const isPending = po.status === 'ordered';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                        {po.po_number}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">
                        {po.supplier_name || 'Direct Wholesale'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {po.ordered_at ? new Date(po.ordered_at).toLocaleDateString('en-ZA') : 'Today'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                        {zar(Number(po.total_cost_cents))}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            isReceived
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {isReceived ? 'Received (In Stock)' : 'Pending Delivery'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPending ? (
                          <Button
                            size="sm"
                            disabled={receivingId === po.id}
                            onClick={() => handleReceive(po.id)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 mx-auto"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            {receivingId === po.id ? 'Receiving...' : 'Receive into Stock (GRV)'}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-sans flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> GRV Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Create Supplier Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate a formalized purchase order for restocking. Receiving it later will automatically increment inventory levels.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Select Supplier</Label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Select Product to Restock</Label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setPoUnitCostRand((Number(p.cost_price_cents) / 100).toFixed(2));
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Quantity Ordered</Label>
                <Input
                  type="number"
                  min="1"
                  value={poQty}
                  onChange={(e) => setPoQty(e.target.value)}
                  className="font-mono text-xs font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Unit Cost (ZAR Excl)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={poUnitCostRand}
                  onChange={(e) => setPoUnitCostRand(e.target.value)}
                  className="font-mono text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Internal Order Notes</Label>
              <Input
                placeholder="e.g. Urgent restock for weekend rush"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                {submitting ? 'Creating Order...' : 'Generate Purchase Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
