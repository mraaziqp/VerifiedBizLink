'use client';

import {
  TrendingUp, TrendingDown, PieChart, AlertCircle,
  ShieldCheck, Banknote
} from 'lucide-react';
import { zar, pct } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

export interface TelemetryData {
  grossSalesCents: number;
  transactionsCount: number;
  averageSaleCents: number;
  yesterdayDiffPct?: number; // e.g. +14.2%
  cogsCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  expectedDrawerCashCents: number;
  openingFloatCents: number;
  pettyCashOutCents: number;
  shiftDurationHours?: number;
  paymentSplit: {
    cardTapCents: number;
    cashCents: number;
    qrPayShapCents: number;
    otherCents: number;
  };
  lowStockCount: number;
  outOfStockCount: number;
  planName: string;
  feeRateBps: number;
  activeTerminalsCount: number;
  offlineQueueCount: number;
}

interface PosTelemetryStripProps {
  data: TelemetryData;
  onFilterLowStock?: () => void;
  onFilterOutOfStock?: () => void;
  onViewPaymentSplit?: () => void;
}

export function PosTelemetryStrip({
  data,
  onFilterLowStock,
  onFilterOutOfStock,
}: PosTelemetryStripProps) {
  // Calculate payment split percentages for visual stacked bar
  const totalSplitCents =
    data.paymentSplit.cardTapCents +
    data.paymentSplit.cashCents +
    data.paymentSplit.qrPayShapCents +
    data.paymentSplit.otherCents;

  const cardPct = totalSplitCents > 0 ? (data.paymentSplit.cardTapCents / totalSplitCents) * 100 : 45;
  const cashPct = totalSplitCents > 0 ? (data.paymentSplit.cashCents / totalSplitCents) * 100 : 35;
  const qrPct = totalSplitCents > 0 ? (data.paymentSplit.qrPayShapCents / totalSplitCents) * 100 : 20;

  const isSalesPositive = (data.yesterdayDiffPct ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. Today's Gross Sales */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Today&apos;s Sales</span>
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono",
            isSalesPositive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
          )}>
            {isSalesPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isSalesPositive ? '+' : ''}{(data.yesterdayDiffPct ?? 8.4).toFixed(1)}%
          </span>
        </div>
        <div className="my-2">
          <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {zar(data.grossSalesCents)}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{data.transactionsCount} bills</span>
          <span>Avg: {zar(data.averageSaleCents)}</span>
        </div>
      </div>

      {/* 2. Net Profit & Margin */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Net Profit & Margin</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 font-mono">
            {data.grossMarginPct.toFixed(1)}% margin
          </span>
        </div>
        <div className="my-2">
          <p className="text-xl font-black font-mono tracking-tight text-blue-950 dark:text-blue-300 tabular-nums">
            {zar(data.grossProfitCents)}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>COGS: {zar(data.cogsCents)}</span>
          <span className="text-blue-700 dark:text-blue-400 font-bold">15% VAT In</span>
        </div>
      </div>

      {/* 3. Active Shift & Drawer Float */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Shift Drawer Float</span>
          <Banknote className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <div className="my-2">
          <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {zar(data.expectedDrawerCashCents)}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Float: {zar(data.openingFloatCents)}</span>
          <span className="text-rose-600 dark:text-rose-400">Drops: -{zar(data.pettyCashOutCents)}</span>
        </div>
      </div>

      {/* 4. Payment Split Breakdown */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Payment Split</span>
          <PieChart className="h-3.5 w-3.5 text-indigo-500" />
        </div>
        {/* Visual Stacked Bar */}
        <div className="my-2 space-y-1.5">
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div style={{ width: `${cardPct}%` }} className="bg-indigo-600 h-full" title={`Card/Tap: ${cardPct.toFixed(0)}%`} />
            <div style={{ width: `${cashPct}%` }} className="bg-emerald-500 h-full" title={`Cash: ${cashPct.toFixed(0)}%`} />
            <div style={{ width: `${qrPct}%` }} className="bg-amber-500 h-full" title={`PayShap/QR: ${qrPct.toFixed(0)}%`} />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Card {cardPct.toFixed(0)}%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cash {cashPct.toFixed(0)}%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> QR {qrPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* 5. Inventory Health */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Inventory Health</span>
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <button
            onClick={onFilterLowStock}
            className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 hover:underline"
          >
            {data.lowStockCount}
          </button>
          <span className="text-xs text-slate-500 font-medium">Low</span>
          <span className="text-slate-300">•</span>
          <button
            onClick={onFilterOutOfStock}
            className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 hover:underline"
          >
            {data.outOfStockCount}
          </button>
          <span className="text-xs text-slate-500 font-medium">Out</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono truncate">
          <span>{data.lowStockCount + data.outOfStockCount > 0 ? 'Reorder action needed' : 'All levels optimal'}</span>
        </div>
      </div>

      {/* 6. POS Plan & Terminal Status */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="uppercase tracking-wider text-[10px]">Plan & Terminal</span>
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div className="my-2">
          <p className="text-sm font-black text-slate-900 dark:text-white truncate">
            {data.planName || 'Standard Tier'}
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            {pct(data.feeRateBps)} per sale fee
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{data.activeTerminalsCount} Terminals</span>
          <span className={cn(data.offlineQueueCount > 0 ? "text-amber-600 font-bold" : "text-emerald-600")}>
            {data.offlineQueueCount > 0 ? `${data.offlineQueueCount} offline` : 'Synced'}
          </span>
        </div>
      </div>
    </div>
  );
}
