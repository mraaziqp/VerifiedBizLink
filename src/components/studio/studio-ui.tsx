import { CheckCircle2, Clock, Hammer, PackageCheck, Eye, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStage } from '@/lib/studio';

/** Rand, without cents unless there are some: R1 299 or R12.50. */
export function rand(value: number): string {
  const whole = Math.round(value * 100) % 100 === 0;
  const text = Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return `${value < 0 ? '−' : ''}R${text}`;
}

export const STAGES: Record<OrderStage, { label: string; className: string; icon: typeof Clock }> = {
  awaiting_payment: { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-900 ring-amber-200', icon: Clock },
  paid: { label: 'Paid · queued', className: 'bg-sky-100 text-sky-900 ring-sky-200', icon: CheckCircle2 },
  building: { label: 'Building', className: 'bg-indigo-100 text-indigo-900 ring-indigo-200', icon: Hammer },
  ready: { label: 'Ready to view', className: 'bg-emerald-100 text-emerald-900 ring-emerald-200', icon: Eye },
  delivered: { label: 'Delivered', className: 'bg-emerald-600 text-white ring-emerald-600', icon: PackageCheck },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 ring-slate-200', icon: XCircle },
};

export function StageBadge({ stage, className }: { stage: OrderStage; className?: string }) {
  const info = STAGES[stage] ?? STAGES.paid;
  const Icon = info.icon;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', info.className, className)}>
      <Icon className="h-3.5 w-3.5" /> {info.label}
    </span>
  );
}

export function ProgressBar({ value, stage, className }: { value: number; stage: OrderStage; className?: string }) {
  const pct = stage === 'cancelled' ? 0 : Math.max(stage === 'awaiting_payment' ? 0 : 4, Math.min(100, Math.round(value)));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-700', pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-[11px] font-semibold text-slate-500">{stage === 'cancelled' ? 'Cancelled' : `${pct}%`}</p>
    </div>
  );
}
