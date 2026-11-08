'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, UserRound, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { posFetch } from '@/lib/pos/client';
import { PosHeader, usePosContext } from '@/components/pos/pos-header';
import { cn } from '@/lib/utils';

interface Staff { id: string; user_id: string; email: string; full_name: string; display_name?: string; role: string; is_active: boolean; has_pin: boolean; locked_until?: string | null }

const ROLES: { key: string; label: string; text: string }[] = [
  { key: 'cashier', label: 'Cashier', text: 'Sells at the till. Cannot refund, change stock or see reports.' },
  { key: 'stock_controller', label: 'Stock controller', text: 'Products, stock counts, purchase orders and deliveries. Cannot sell.' },
  { key: 'manager', label: 'Manager', text: 'Everything except billing: refunds, bigger discounts, reports, staff.' },
  { key: 'owner', label: 'Co-owner', text: 'Full access, including the subscription.' },
];
const label = (r: string) => ROLES.find((x) => x.key === r)?.label ?? r;

export default function PosStaffPage() {
  const { toast } = useToast();
  const { ctx, can } = usePosContext();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'cashier', displayName: '', pin: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await posFetch('/api/pos/staff');
    if (r.ok) setStaff((r.data.staff as Staff[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const isManager = ctx?.role === 'manager';
  const allowedRoles = ROLES.filter((r) => !isManager || r.key === 'cashier' || r.key === 'stock_controller');
  const writable = can('staff.manage') && ctx?.access.mode === 'full';

  const save = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await posFetch('/api/pos/staff', { method: 'POST', json: body });
    setBusy(false);
    if (!r.ok) {
      toast({ title: 'Not saved', description: String(r.data.error ?? ''), variant: 'destructive' });
      return false;
    }
    load();
    return true;
  };

  const submit = async () => {
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) return toast({ title: 'PIN must be 4 to 6 digits', variant: 'destructive' });
    if (await save({ email: form.email.trim(), role: form.role, displayName: form.displayName || undefined, pin: form.pin || undefined })) {
      toast({ title: 'Staff member saved' });
      setOpen(false);
      setForm({ email: '', role: 'cashier', displayName: '', pin: '' });
    }
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <PosHeader
          title="Staff & PINs"
          subtitle="Each person signs in to the till with their own PIN, so every sale shows who made it."
          ctx={ctx}
          actions={writable ? <Button onClick={() => setOpen(true)} className="rounded-xl bg-amber-400 text-slate-950 font-black text-xs"><Plus className="h-4 w-4 mr-1" /> Add staff</Button> : null}
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.key} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs"><p className="font-black text-slate-900">{r.label}</p><p className="text-slate-600 mt-1">{r.text}</p></div>
          ))}
        </section>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
        ) : staff.length === 0 ? (
          <p className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Only you so far. Add staff by the email address of their VerifiedBizLink account.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((s) => {
              const locked = s.locked_until && new Date(s.locked_until) > new Date();
              const canEdit = writable && !(isManager && (s.role === 'owner' || s.role === 'manager'));
              return (
                <li key={s.id} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4', s.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <UserRound className="h-8 w-8 rounded-full bg-slate-100 p-1.5 text-slate-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{s.display_name || s.full_name} <span className="text-xs font-bold text-slate-500">· {label(s.role)}</span></p>
                      <p className="text-xs text-slate-500 truncate">{s.email} · {s.has_pin ? 'PIN set' : 'No PIN'}{locked ? ' · PIN locked' : ''}{!s.is_active ? ' · deactivated' : ''}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => { setForm({ email: s.email, role: s.role, displayName: s.display_name ?? '', pin: '' }); setOpen(true); }}><KeyRound className="h-3.5 w-3.5 mr-1" /> Edit / reset PIN</Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => save({ email: s.email, role: s.role, isActive: !s.is_active })}><Lock className="h-3.5 w-3.5 mr-1" /> {s.is_active ? 'Deactivate' : 'Reactivate'}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Staff member</DialogTitle><DialogDescription className="text-xs">They need their own VerifiedBizLink account. Their PIN is stored scrambled and never shown again.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-xs">
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Their account email" type="email" aria-label="Email" className="rounded-xl" />
            <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Name on receipts (optional)" aria-label="Display name" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
              {allowedRoles.map((r) => (
                <button key={r.key} role="radio" aria-checked={form.role === r.key} onClick={() => setForm((f) => ({ ...f, role: r.key }))} className={cn('rounded-xl border p-2 font-bold', form.role === r.key ? 'border-amber-400 bg-amber-50' : 'border-slate-200')}>{r.label}</button>
              ))}
            </div>
            <Input value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="Till PIN, 4–6 digits (leave blank to keep)" inputMode="numeric" type="password" autoComplete="new-password" aria-label="PIN" className="rounded-xl" />
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl text-xs">Cancel</Button><Button onClick={submit} disabled={busy || !form.email} className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button></div>
        </DialogContent>
      </Dialog>
    </GlassBackground>
  );
}
