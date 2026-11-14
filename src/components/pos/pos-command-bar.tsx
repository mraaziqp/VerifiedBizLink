'use client';

import Link from 'next/link';
import {
  ShoppingCart, Plus, ArrowDownRight, Truck, FileSpreadsheet,
  Wifi, WifiOff, RefreshCw, SmartphoneNfc, Store, Clock, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PosContext } from '@/components/pos/pos-header';

interface PosCommandBarProps {
  ctx: PosContext | null;
  activeTill?: {
    id: string;
    name: string;
    status: string;
    current_float_cents?: number | string;
    till_number?: number;
  } | null;
  activeShift?: {
    shiftNumber?: number | string;
    cashierName?: string;
    openedAt?: string;
  } | null;
  isOnline: boolean;
  offlineQueueCount: number;
  syncingOffline?: boolean;
  onSyncOffline?: () => void;
  onOpenShift?: () => void;
  onCloseShift?: () => void;
  onQuickProduct?: () => void;
  onReceiveStock?: () => void;
  onCashDrop?: () => void;
  onExportZReport?: () => void;
  onLaunchTill?: () => void;
}

export function PosCommandBar({
  ctx,
  activeTill,
  activeShift,
  isOnline,
  offlineQueueCount,
  syncingOffline = false,
  onSyncOffline,
  onOpenShift,
  onCloseShift,
  onQuickProduct,
  onReceiveStock,
  onCashDrop,
  onExportZReport,
  onLaunchTill,
}: PosCommandBarProps) {
  const isTillOpen = activeTill?.status === 'open';

  return (
    <div className="space-y-3">
      {/* Upper Status Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Business / Till Identifier */}
          <div className="flex items-center gap-1.5 font-bold text-white pr-2 border-r border-slate-700/80">
            <Store className="h-3.5 w-3.5 text-amber-400" />
            <span className="truncate max-w-[180px] sm:max-w-[260px]">{ctx?.businessName || 'VerifiedBizLink Till'}</span>
          </div>

          {/* Active Shift Status */}
          <div className="flex items-center gap-1.5 font-mono">
            {isTillOpen ? (
              <Badge variant="outline" className="bg-emerald-950/60 text-emerald-400 border-emerald-800 text-[11px] font-medium flex items-center gap-1 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Shift #{activeShift?.shiftNumber || activeTill?.till_number || '1'}</span>
                <span className="text-slate-500">•</span>
                <UserCheck className="h-3 w-3 text-emerald-300" />
                <span className="font-sans font-semibold text-emerald-300">{activeShift?.cashierName || 'Cashier on Duty'}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-[11px] font-medium flex items-center gap-1 px-2 py-0.5">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>Till Closed</span>
              </Badge>
            )}
          </div>

          {/* SoftPOS NFC Tap to Pay Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-indigo-950/50 text-indigo-300 border border-indigo-800/60 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            <SmartphoneNfc className="h-3 w-3 text-indigo-400" />
            <span>Tap to Pay: Ready</span>
          </div>
        </div>

        {/* Network & Offline Queue Pill */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <Wifi className="h-3.5 w-3.5" /> Online • Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
              <WifiOff className="h-3.5 w-3.5" /> Offline Mode
            </span>
          )}

          {offlineQueueCount > 0 && (
            <button
              onClick={onSyncOffline}
              disabled={syncingOffline || !isOnline}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
                "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
              )}
            >
              <RefreshCw className={cn("h-3 w-3", syncingOffline && "animate-spin")} />
              <span>{offlineQueueCount} Pending Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Command Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Primary CTA: Launch Digital Till */}
        <div className="flex items-center gap-2">
          {onLaunchTill ? (
            <Button
              onClick={onLaunchTill}
              size="default"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm h-10 px-5 rounded-xl shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Launch Digital Till</span>
              <kbd className="hidden md:inline-flex items-center justify-center bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-900 font-bold">
                F2
              </kbd>
            </Button>
          ) : (
            <Button
              asChild
              size="default"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm h-10 px-5 rounded-xl shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Link href="/business/pos/terminal">
                <ShoppingCart className="h-4 w-4" />
                <span>Launch Digital Till</span>
                <kbd className="hidden md:inline-flex items-center justify-center bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-900 font-bold">
                  F2
                </kbd>
              </Link>
            </Button>
          )}

          {/* Quick Shift Button */}
          {isTillOpen ? (
            <Button
              onClick={onCloseShift}
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 rounded-xl"
            >
              Close Shift (Z-Report)
            </Button>
          ) : (
            <Button
              onClick={onOpenShift}
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 rounded-xl"
            >
              Open Shift (Float)
            </Button>
          )}
        </div>

        {/* Secondary Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            onClick={onQuickProduct}
            variant="ghost"
            size="sm"
            className="h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-amber-600" />
            <span>+ Quick Product</span>
          </Button>

          <Button
            onClick={onReceiveStock}
            variant="ghost"
            size="sm"
            className="h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
          >
            <Truck className="h-3.5 w-3.5 text-blue-600" />
            <span>Receive Stock (GRV)</span>
          </Button>

          <Button
            onClick={onCashDrop}
            variant="ghost"
            size="sm"
            className="h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-orange-600" />
            <span>Cash Drop / Payout</span>
          </Button>

          <Button
            onClick={onExportZReport}
            variant="ghost"
            size="sm"
            className="h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Z-Report</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
