'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Truck, PackageCheck, Loader2,
  Building2, Phone, Mail, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total_cost_cents: number;
  ordered_at: string;
  received_at?: string;
  item_count: number;
}

export default function PosPurchasingPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier Modal
  const [supplierModal, setSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Receiving Action
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [suppRes, poRes] = await Promise.all([
        fetch('/api/pos/suppliers').catch(() => null),
        fetch('/api/pos/purchasing').catch(() => null),
      ]);

      if (suppRes?.ok) {
        const suppData = await suppRes.json();
        setSuppliers(suppData.suppliers || []);
      }
      if (poRes?.ok) {
        const poData = await poRes.json();
        setOrders(poData.orders || []);
      }
    } catch {
      toast({ title: 'Could not load purchasing data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast({ title: 'Supplier company name is required', variant: 'destructive' });
      return;
    }

    setSavingSupplier(true);
    try {
      const res = await fetch('/api/pos/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });

      if (res.ok) {
        toast({ title: 'Supplier added successfully' });
        setSupplierModal(false);
        setNewSupplier({ name: '', contactPerson: '', email: '', phone: '', address: '' });
        loadData();
      }
    } catch {
      toast({ title: 'Error adding supplier', variant: 'destructive' });
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleReceiveStock = async (poId: string) => {
    setReceivingId(poId);
    try {
      const res = await fetch('/api/pos/purchasing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receive', poId }),
      });

      if (res.ok) {
        toast({
          title: 'Stock received into inventory!',
          description: 'Products updated and logged to the inventory audit trail.',
        });
        loadData();
      } else {
        toast({ title: 'Could not receive order', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/business/pos">
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Suppliers & Purchasing</h1>
              <p className="text-xs text-slate-500">Procure inventory, manage vendor contacts, and receive goods into stock.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSupplierModal(true)}
              className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add New Supplier
            </Button>
          </div>
        </div>

        {/* Suppliers Strip */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500" /> Registered Suppliers ({suppliers.length})
          </h2>

          {suppliers.length === 0 ? (
            <p className="text-xs text-slate-400">No suppliers registered yet. Tap &quot;Add New Supplier&quot; to begin.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliers.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                  <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                  {s.contact_person && (
                    <p className="text-[11px] text-slate-500">Contact: {s.contact_person}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600">
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1 truncate max-w-xs">
                        <Mail className="h-3 w-3 text-slate-400" /> {s.email}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Orders List */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" /> Purchase Orders & Deliveries
            </h2>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900">No purchase orders found</p>
              <p className="text-xs text-slate-400 mt-1">
                Purchase orders record incoming supplier shipments and automatically restock items.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">PO Number</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Date Ordered</th>
                    <th className="py-3.5 px-4 text-right">Total Cost</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Receiving Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((po) => {
                    const isReceived = po.status === 'received';

                    return (
                      <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {po.po_number}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {po.supplier_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {po.ordered_at ? new Date(po.ordered_at).toLocaleDateString('en-ZA') : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          R{(po.total_cost_cents / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black',
                              isReceived
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {isReceived ? 'Received & Stocked' : 'Ordered / Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isReceived ? (
                            <span className="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Completed
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={receivingId === po.id}
                              onClick={() => handleReceiveStock(po.id)}
                              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs h-8 shadow-xs"
                            >
                              {receivingId === po.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <PackageCheck className="h-3.5 w-3.5 mr-1" /> Receive Stock
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================= ADD SUPPLIER MODAL ======================= */}
        <Dialog open={supplierModal} onOpenChange={setSupplierModal}>
          <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">Add Supplier</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Register vendor details for purchasing and goods receipts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">Company Name</label>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Cape Roasters Wholesale"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Contact Person (Optional)</label>
                <Input
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier((s) => ({ ...s, contactPerson: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Phone</label>
                  <Input
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="082 123 4567"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier((s) => ({ ...s, email: e.target.value }))}
                    placeholder="orders@supplier.co.za"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Physical Address / Notes</label>
                <Input
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier((s) => ({ ...s, address: e.target.value }))}
                  placeholder="e.g. Unit 4, Industrial Park, Johannesburg"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSupplierModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateSupplier}
                  disabled={savingSupplier}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
                >
                  {savingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Supplier'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </GlassBackground>
  );
}
