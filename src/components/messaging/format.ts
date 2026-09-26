import { formatNumber } from '@/lib/format-number';
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

/** "14:05", "Yesterday", "Mon", "12 Sep" — the way inboxes read. */
export function shortTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-ZA', { weekday: 'short' });
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const rand = (n: number) =>
  `R ${formatNumber(n, 2)}`;

export const fileSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const CATEGORY_META: Record<string, { label: string; tone: string }> = {
  general: { label: 'General', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  lead: { label: 'Lead', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  support: { label: 'Support', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
  verification: { label: 'Verification', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};
