'use client';

import { useState, useMemo } from 'react';
import {
  Search, Barcode, Printer, SlidersHorizontal, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { zar, calcGrossMargin, calcMarkup } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

export interface MatrixProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  cost_price_cents: number | string;
  selling_price_cents: number | string;
  tax_rate_percent: number | string;
  stock_quantity: number | string;
  min_stock_threshold: number | string;
  unit: string;
  is_active: boolean;
  sync_online?: boolean;
}

interface PosProductMatrixProps {
  products: MatrixProduct[];
  categories: Array<{ id: string; name: string }>;
  onAdjustStock: (productId: string, qtyDelta: number, reason: string) => Promise<void>;
  onSaveProduct?: (productData: Record<string, unknown>) => Promise<void>;
  onPrintBarcodeLabels?: (product: MatrixProduct) => void;
}

export function PosProductMatrix({
  products,
  categories,
  onAdjustStock,
  onSaveProduct: _onSaveProduct,
  onPrintBarcodeLabels: _onPrintBarcodeLabels,
}: PosProductMatrixProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MatrixProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stocktake Variance');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Label Print Modal
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [labelProduct, setLabelProduct] = useState<MatrixProduct | null>(null);
  const [labelCopies, setLabelCopies] = useState(10);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === 'all' || p.category_id === categoryFilter;

      const stockNum = Number(p.stock_quantity);
      const minThreshold = Number(p.min_stock_threshold || 5);

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = stockNum > 0 && stockNum <= minThreshold;
      } else if (stockFilter === 'out') {
        matchStock = stockNum <= 0;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const handleOpenAdjust = (prod: MatrixProduct) => {
    setSelectedProduct(prod);
    setAdjustQty('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const delta = parseFloat(adjustQty);
    if (isNaN(delta) || delta === 0) return;
    setAdjustSubmitting(true);
    try {
      await onAdjustStock(selectedProduct.id, delta, adjustReason);
      setAdjustModalOpen(false);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleOpenLabels = (prod: MatrixProduct) => {
    setLabelProduct(prod);
    setLabelModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search product, SKU, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Level Quick Toggles */}
        <div className="flex items-center gap-1 font-mono text-xs">
          <Button
            size="sm"
            variant={stockFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStockFilter('all')}
            className={cn("h-8 px-2.5 text-xs font-bold", stockFilter === 'all' && "bg-slate-900 text-white")}
          >
            All ({products.length})
          </Button>
          <Button
            size="sm"
            variant={stockFilter === 'low' ? 'default' : 'outline'}
            onClick={() => setStockFilter('low')}
            className={cn("h-8 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-300", stockFilter === 'low' && "bg-amber-500 text-slate-950")}
          >
            Low Stock
          </Button>
          <Button
            size="sm"
            variant={stockFilter === 'out' ? 'default' : 'outline'}
            onClick={() => setStockFilter('out')}
            className={cn("h-8 px-2.5 text-xs font-bold text-rose-700 dark:text-rose-300", stockFilter === 'out' && "bg-rose-600 text-white")}
          >
            Out of Stock
          </Button>
        </div>
      </div>

      {/* High-Density Product Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3.5">SKU / Barcode</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Cost (Excl)</th>
                <th className="py-2.5 px-3 text-right">Selling (Incl)</th>
                <th className="py-2.5 px-3 text-right">Margin / Markup</th>
                <th className="py-2.5 px-2 text-center">VAT</th>
                <th className="py-2.5 px-3 text-center">In Stock</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const cost = Number(prod.cost_price_cents);
                  const sell = Number(prod.selling_price_cents);
                  const stock = Number(prod.stock_quantity);
                  const minThresh = Number(prod.min_stock_threshold || 5);
                  const marginPct = calcGrossMargin(sell, cost);
                  const markupPct = calcMarkup(sell, cost);

                  const isLow = stock > 0 && stock <= minThresh;
                  const isOut = stock <= 0;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* SKU / Barcode */}
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {prod.sku || 'NO-SKU'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {prod.barcode || '—'}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-white max-w-[200px]">
                        <span className="truncate block">{prod.name}</span>
                        {marginPct < 15 && sell > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5" /> Margin Guard
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-slate-500 font-sans">
                        {prod.category_name || 'General'}
                      </td>

                      {/* Cost Price */}
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {zar(cost)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                        {zar(sell)}
                      </td>

                      {/* Margin & Markup */}
                      <td className="py-2.5 px-3 text-right">
                        <span className={cn(
                          "font-bold block",
                          marginPct >= 35 ? "text-emerald-600" : marginPct >= 15 ? "text-blue-600" : "text-amber-600"
                        )}>
                          {marginPct.toFixed(1)}% margin
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          +{markupPct.toFixed(1)}% mark
                        </span>
                      </td>

                      {/* VAT Code */}
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-slate-300">
                          {Number(prod.tax_rate_percent) > 0 ? '15%' : '0%'}
                        </Badge>
                      </td>

                      {/* In Stock */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "inline-block font-bold text-xs px-2 py-0.5 rounded-full",
                          isOut
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : isLow
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        )}>
                          {stock} {prod.unit || 'unit'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            title="Adjust Stock Quantity"
                            onClick={() => handleOpenAdjust(prod)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Print Barcode Labels"
                            onClick={() => handleOpenLabels(prod)}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-600"
                          >
                            <Barcode className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= STOCK ADJUSTMENT MODAL ================= */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-500" />
              Adjust Stock: {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Current recorded on-hand quantity: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedProduct?.stock_quantity}</strong>. Every manual adjustment is permanently recorded in the inventory audit log.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmAdjust} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Adjustment Quantity (+ to add, - to write off)</Label>
              <Input
                type="number"
                step="1"
                placeholder="e.g. +10 or -3"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="font-mono text-sm font-bold"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Mandatory Audit Reason</Label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              >
                <option value="Stocktake Variance">Stocktake Variance (Count Correction)</option>
                <option value="Damaged/Spoilage">Damaged / Spoilage / Expired</option>
                <option value="Internal Use / Store Sample">Internal Use / Store Sample</option>
                <option value="Theft / Unexplained Loss">Theft / Unexplained Loss</option>
                <option value="Supplier Return">Supplier Return</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setAdjustModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustSubmitting || !adjustQty}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                {adjustSubmitting ? 'Logging...' : 'Confirm Stock Adjustment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= BARCODE LABEL PRINTER MODAL ================= */}
      <Dialog open={labelModalOpen} onOpenChange={setLabelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Barcode className="h-4 w-4 text-blue-600" />
              Print Barcode Labels: {labelProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate formatted retail shelf or sticker barcode tags for thermal label printers (38x25mm or standard sheet).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Label Preview Card */}
            <div className="mx-auto max-w-[220px] p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center font-mono space-y-1">
              <p className="font-sans font-bold text-xs truncate">{labelProduct?.name}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {labelProduct ? zar(Number(labelProduct.selling_price_cents)) : 'R 0.00'}
              </p>
              <div className="py-1 flex flex-col items-center">
                {/* Visual Barcode bars mockup */}
                <div className="h-8 w-36 bg-slate-900 dark:bg-white flex justify-between p-0.5">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className={cn("h-full bg-white dark:bg-slate-900", i % 3 === 0 ? "w-1" : "w-0.5")} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {labelProduct?.barcode || labelProduct?.sku || '600123456789'}
                </p>
              </div>
              <p className="text-[9px] text-slate-400">VerifiedBizLink</p>
            </div>

            <div className="flex items-center justify-between text-xs">
              <Label>Number of labels to print:</Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={labelCopies}
                onChange={(e) => setLabelCopies(parseInt(e.target.value || '1', 10))}
                className="w-20 text-center h-8 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setLabelModalOpen(false)} className="text-xs">
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.print();
                  setLabelModalOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print {labelCopies} Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
