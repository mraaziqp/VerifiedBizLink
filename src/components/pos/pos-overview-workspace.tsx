'use client';

import { useState } from 'react';
import {
  Printer, MessageSquare, RotateCcw, AlertTriangle, ArrowUpRight,
  Sparkles, PackagePlus, CheckCircle2, Clock, TrendingUp, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { zar } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

export interface OverviewTransaction {
  id: string;
  receiptNumber: string;
  timeStr: string;
  cashierName?: string;
  itemsCount: number;
  paymentMethod: string;
  vatCents: number;
  totalCents: number;
  status: string;
  lines?: Array<{ name: string; quantity: number; unitPriceCents: number; totalCents: number }>;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  sku?: string;
  stockQuantity: number;
  minThreshold: number;
  costPriceCents: number;
  sellingPriceCents: number;
}

export interface TopProductItem {
  name: string;
  quantitySold: number;
  salesCents: number;
  grossProfitCents: number;
}

export interface SlowMovingItem {
  id: string;
  name: string;
  stockQuantity: number;
  daysWithoutSale: number;
  costPriceCents: number;
}

interface PosOverviewWorkspaceProps {
  transactions: OverviewTransaction[];
  lowStockItems: LowStockAlertItem[];
  topProducts: TopProductItem[];
  slowMovingItems: SlowMovingItem[];
  hourlyVelocity: Array<{ hour: string; salesCents: number; transactions: number }>;
  onPrintReceipt: (tx: OverviewTransaction) => void;
  onWhatsAppReceipt: (tx: OverviewTransaction) => void;
  onRefundTransaction: (tx: OverviewTransaction) => void;
  onGeneratePO: (item: LowStockAlertItem) => void;
  onCreatePromoBundle: (item: SlowMovingItem) => void;
  onViewAllTransactions?: () => void;
}

export function PosOverviewWorkspace({
  transactions,
  lowStockItems,
  topProducts,
  slowMovingItems,
  hourlyVelocity,
  onPrintReceipt,
  onWhatsAppReceipt,
  onRefundTransaction,
  onGeneratePO,
  onCreatePromoBundle,
  onViewAllTransactions,
}: PosOverviewWorkspaceProps) {
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);

  // Find max hourly sales to normalize bar heights
  const maxHourlyCents = Math.max(1, ...hourlyVelocity.map((h) => h.salesCents));

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card_tap':
      case 'card':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-none text-[10px] font-bold">
            Tap to Pay
          </Badge>
        );
      case 'cash':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-none text-[10px] font-bold">
            Cash
          </Badge>
        );
      case 'qr_online':
      case 'payshap':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-none text-[10px] font-bold">
            PayShap / QR
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-none text-[10px] font-bold">
            {method}
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* ================= LEFT 2/3 COLUMN ================= */}
      <div className="lg:col-span-2 space-y-5">
        {/* Hourly Sales & Margin Velocity */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                Hourly Sales Velocity
              </h2>
              <p className="text-[11px] text-slate-500">Real-time transaction volume across trade hours today</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              Peak: {zar(maxHourlyCents)}
            </span>
          </div>

          {/* Interactive Bar Chart */}
          <div className="pt-4 pb-2">
            <div className="flex items-end gap-1.5 h-36 w-full px-2">
              {hourlyVelocity.map((h, i) => {
                const heightPct = Math.max(8, Math.round((h.salesCents / maxHourlyCents) * 100));
                const isHovered = hoveredHour === h.hour;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredHour(h.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-slate-900 text-white rounded-lg px-2.5 py-1 text-[10px] font-mono shadow-md whitespace-nowrap pointer-events-none">
                        <span className="font-bold">{h.hour}</span> • {zar(h.salesCents)} ({h.transactions} sales)
                      </div>
                    )}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={cn(
                        "w-full rounded-t transition-all duration-200",
                        h.salesCents > 0
                          ? isHovered
                            ? "bg-amber-400"
                            : "bg-amber-500/80 group-hover:bg-amber-400"
                          : "bg-slate-100 dark:bg-slate-800"
                      )}
                    />
                    <span className="mt-2 text-[9px] font-mono text-slate-600 dark:text-slate-400 select-none">
                      {h.hour.split(':')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Transactions Stream Table */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-600" />
                Live Transactions Stream
              </h2>
              <p className="text-[11px] text-slate-500">Latest completed sales and customer tender activities</p>
            </div>
            {onViewAllTransactions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAllTransactions}
                className="h-8 text-xs font-bold text-amber-700 dark:text-amber-400"
              >
                View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3.5">Receipt #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-2 text-center">Items</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">15% VAT</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans text-xs">
                      No transactions recorded yet today. Click &quot;Launch Digital Till&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 10).map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{tx.timeStr}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans truncate max-w-[110px]">
                        {tx.cashierName || 'Cashier'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400">
                        {tx.itemsCount}
                      </td>
                      <td className="py-2.5 px-3 font-sans">{getMethodBadge(tx.paymentMethod)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{zar(tx.vatCents)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                        {zar(tx.totalCents)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            title="Print 80mm Receipt"
                            onClick={() => onPrintReceipt(tx)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="WhatsApp Receipt"
                            onClick={() => onWhatsAppReceipt(tx)}
                            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Void / Refund"
                            onClick={() => onRefundTransaction(tx)}
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= RIGHT 1/3 COLUMN ================= */}
      <div className="space-y-5">
        {/* Low Stock & 1-Click Restock Widget */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Low Stock Thresholds
              </h2>
              <p className="text-[11px] text-slate-500">Items requiring restocking action</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-amber-600 border-amber-300">
              {lowStockItems.length} SKUs
            </Badge>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-sans">
                All inventory levels are above safety thresholds.
              </p>
            ) : (
              lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      SKU: {item.sku || 'N/A'} • Available: <span className="font-bold text-rose-600">{item.stockQuantity}</span> (Min: {item.minThreshold})
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onGeneratePO(item)}
                    className="h-7 px-2 text-[11px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 shrink-0"
                  >
                    <PackagePlus className="h-3 w-3 mr-1" /> Reorder
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performing SKUs Today */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Top Performing SKUs Today
              </h2>
              <p className="text-[11px] text-slate-500">Ranked by revenue contribution</p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Waiting for today&apos;s first sale.
              </p>
            ) : (
              topProducts.slice(0, 5).map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 min-w-0 font-sans">
                    <span className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {prod.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {zar(prod.salesCents)}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {prod.quantitySold} units sold
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Retail Insights & Dead-Stock Alert */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-700/60 p-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
              AI Retail Insights & Dead Stock
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Identified items with zero sales velocity over the past 30 days. Recommend discounting or bundle packaging to free up tied working capital.
          </p>

          <div className="mt-3 space-y-2">
            {slowMovingItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {item.stockQuantity} units inactive &gt; 30d
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onCreatePromoBundle(item)}
                  className="h-7 text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg px-2 shrink-0 flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" /> Bundle Promo
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
