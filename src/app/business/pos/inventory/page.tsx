'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Search, Package, Edit3, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ImageUploader } from '@/components/media/image-uploader';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  selling_price_cents: number;
  cost_price_cents: number;
  tax_rate_percent: number;
  stock_quantity: number;
  min_stock_threshold: number;
  barcode?: string;
  sku?: string;
  unit: string;
  image_url?: string;
  is_active: boolean;
}

export default function PosInventoryPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Add / Edit Modal
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Stock Adjustment Modal
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustChange, setAdjustChange] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<'purchase_receive' | 'manual_adjustment' | 'waste_damaged'>('manual_adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/pos/products').catch(() => null),
        fetch('/api/pos/categories').catch(() => null),
      ]);

      if (prodRes?.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (catRes?.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch {
      toast({ title: 'Could not load inventory', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || editingProduct.selling_price_cents === undefined) {
      toast({ title: 'Please provide product name and price', variant: 'destructive' });
      return;
    }

    setSavingProduct(true);
    try {
      if (editingProduct.id) {
        // Update
        const res = await fetch(`/api/pos/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingProduct.name,
            categoryId: editingProduct.category_id,
            sku: editingProduct.sku,
            barcode: editingProduct.barcode,
            sellingPriceCents: editingProduct.selling_price_cents,
            costPriceCents: editingProduct.cost_price_cents,
            minStockThreshold: editingProduct.min_stock_threshold,
            unit: editingProduct.unit,
            imageUrl: editingProduct.image_url,
          }),
        });
        if (res.ok) {
          toast({ title: 'Product updated successfully' });
          setProductModal(false);
          loadData();
        }
      } else {
        // Create
        const res = await fetch('/api/pos/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingProduct.name,
            categoryId: editingProduct.category_id,
            sku: editingProduct.sku,
            barcode: editingProduct.barcode,
            sellingPriceCents: editingProduct.selling_price_cents,
            costPriceCents: editingProduct.cost_price_cents || 0,
            stockQuantity: editingProduct.stock_quantity || 0,
            minStockThreshold: editingProduct.min_stock_threshold || 5,
            unit: editingProduct.unit || 'item',
            imageUrl: editingProduct.image_url,
          }),
        });
        if (res.ok) {
          toast({ title: 'Product created successfully' });
          setProductModal(false);
          loadData();
        }
      }
    } catch {
      toast({ title: 'Error saving product', variant: 'destructive' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleExecuteAdjustment = async () => {
    if (!adjustTarget) return;
    const changeNum = parseFloat(adjustChange);
    if (isNaN(changeNum) || changeNum === 0) {
      toast({ title: 'Enter a valid positive or negative change', variant: 'destructive' });
      return;
    }

    setSavingAdjust(true);
    try {
      const res = await fetch('/api/pos/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_stock',
          productId: adjustTarget.id,
          change: changeNum,
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });

      if (res.ok) {
        toast({ title: 'Stock adjusted and logged to audit trail' });
        setAdjustModal(false);
        loadData();
      } else {
        toast({ title: 'Adjustment failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingAdjust(false);
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
              <h1 className="text-2xl font-black text-slate-900">Products & Inventory</h1>
              <p className="text-xs text-slate-500">Track stock levels, barcodes, cost prices, and movement audits.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  selling_price_cents: 0,
                  cost_price_cents: 0,
                  stock_quantity: 0,
                  min_stock_threshold: 5,
                  unit: 'item',
                  is_active: true,
                });
                setProductModal(true);
              }}
              className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add New Product
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, barcode, or SKU..."
              className="pl-10 h-10 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900">No inventory products found</p>
              <p className="text-xs text-slate-400 mt-1">Tap &quot;Add New Product&quot; to register your stock catalogue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">Item Details</th>
                    <th className="py-3.5 px-4">Barcode / SKU</th>
                    <th className="py-3.5 px-4 text-right">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-center">Stock Level</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const isOut = item.stock_quantity <= 0;
                    const isLow = item.stock_quantity > 0 && item.stock_quantity <= item.min_stock_threshold;
                    const margin =
                      item.selling_price_cents > 0
                        ? Math.round(
                            ((item.selling_price_cents - item.cost_price_cents) / item.selling_price_cents) * 100
                          )
                        : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                              <span className="text-[11px] text-slate-400">
                                {item.category_name || 'General'} · {item.unit}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item.barcode || item.sku || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                          R{(item.cost_price_cents / 100).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          R{(item.selling_price_cents / 100).toFixed(2)}
                          <span className="block text-[10px] text-emerald-600 font-bold">{margin}% margin</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black',
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            {item.stock_quantity} in stock
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustTarget(item);
                              setAdjustChange('');
                              setAdjustNotes('');
                              setAdjustModal(true);
                            }}
                            className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 h-8"
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(item);
                              setProductModal(true);
                            }}
                            className="rounded-xl text-xs font-bold h-8 text-amber-600 hover:text-amber-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================= ADD / EDIT PRODUCT MODAL ======================= */}
        <Dialog open={productModal} onOpenChange={setProductModal}>
          <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                {editingProduct?.id ? 'Edit Product' : 'Add New Inventory Product'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure details, prices, barcode, and initial stock level.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">Product Name</label>
                <Input
                  value={editingProduct?.name || ''}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Standard Filter Coffee, Artisan Bread"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={editingProduct?.category_id || ''}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, category_id: e.target.value }))}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="">None (General)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit Type</label>
                  <select
                    value={editingProduct?.unit || 'item'}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, unit: e.target.value }))}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="item">Each / Unit</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Litre (L)</option>
                    <option value="pack">Pack / Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Selling Price (R)</label>
                  <Input
                    type="number"
                    step="0.50"
                    value={editingProduct?.selling_price_cents ? (editingProduct.selling_price_cents / 100).toFixed(2) : ''}
                    onChange={(e) =>
                      setEditingProduct((p) => ({
                        ...p,
                        selling_price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                      }))
                    }
                    placeholder="25.00"
                    className="mt-1 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Cost Price (R)</label>
                  <Input
                    type="number"
                    step="0.50"
                    value={editingProduct?.cost_price_cents ? (editingProduct.cost_price_cents / 100).toFixed(2) : ''}
                    onChange={(e) =>
                      setEditingProduct((p) => ({
                        ...p,
                        cost_price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                      }))
                    }
                    placeholder="12.50"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Barcode / EAN</label>
                  <Input
                    value={editingProduct?.barcode || ''}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, barcode: e.target.value }))}
                    placeholder="6001234567890"
                    className="mt-1 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">SKU / Code</label>
                  <Input
                    value={editingProduct?.sku || ''}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="COF-001"
                    className="mt-1 rounded-xl font-mono"
                  />
                </div>
              </div>

              {!editingProduct?.id && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Initial Stock Quantity</label>
                    <Input
                      type="number"
                      value={editingProduct?.stock_quantity ?? 0}
                      onChange={(e) =>
                        setEditingProduct((p) => ({ ...p, stock_quantity: parseFloat(e.target.value || '0') }))
                      }
                      placeholder="50"
                      className="mt-1 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Low-Stock Alert Level</label>
                    <Input
                      type="number"
                      value={editingProduct?.min_stock_threshold ?? 5}
                      onChange={(e) =>
                        setEditingProduct((p) => ({ ...p, min_stock_threshold: parseFloat(e.target.value || '5') }))
                      }
                      placeholder="5"
                      className="mt-1 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700">Product Photo</label>
                <div className="mt-1">
                  <ImageUploader
                    onImageSelect={(url) => setEditingProduct((p) => ({ ...p, image_url: url }))}
                    label="Upload photo from device"
                    buttonClassName="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={savingProduct}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
                >
                  {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Product'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ======================= STOCK ADJUSTMENT MODAL ======================= */}
        <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
          <DialogContent className="max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Adjust Stock: {adjustTarget?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Current quantity: {adjustTarget?.stock_quantity} {adjustTarget?.unit}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">Quantity Change (+ to add, - to subtract)</label>
                <Input
                  type="number"
                  value={adjustChange}
                  onChange={(e) => setAdjustChange(e.target.value)}
                  placeholder="e.g. +20 or -2"
                  className="mt-1 rounded-xl font-black text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as typeof adjustReason)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                >
                  <option value="manual_adjustment">Manual Count / Audit Correction</option>
                  <option value="purchase_receive">Restock / Direct Delivery</option>
                  <option value="waste_damaged">Damaged / Expired / Waste</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Notes (Optional)</label>
                <Input
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Month-end count verification"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteAdjustment}
                  disabled={savingAdjust}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
                >
                  {savingAdjust ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Adjustment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </GlassBackground>
  );
}
