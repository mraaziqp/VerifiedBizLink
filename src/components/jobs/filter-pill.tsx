import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A toggle chip with an optional count, used wherever a list is narrowed by
 * status: the employer's roles, the applicant board, a candidate's tracker.
 */
export function FilterPill({
  active, onClick, children, count, size = 'md',
}: { active: boolean; onClick: () => void; children: ReactNode; count?: number; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-colors',
        size === 'sm' ? 'text-xs' : 'text-sm',
        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>
          {count}
        </span>
      )}
    </button>
  );
}
