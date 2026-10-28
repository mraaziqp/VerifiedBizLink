'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, Search, ShieldCheck, Store, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, isStaffRole } from '@/lib/roles';

interface SwitchAccount {
  id: string;
  email: string;
  fullName: string;
  role: string;
  businessName: string | null;
}

interface SwitchState {
  canSwitch: boolean;
  owner?: SwitchAccount;
  currentId?: string;
  accounts: SwitchAccount[];
}

/**
 * Switch accounts: the developer account's admin and VerifiedBizLink accounts
 * in one click, any other by search. Renders nothing for anyone else.
 */
export function AccountSwitcher({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [state, setState] = useState<SwitchState | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SwitchAccount[] | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/auth/switch', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ canSwitch: false, accounts: [] }));
  }, [open]);

  // Search any account, a moment after typing stops.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/auth/switch?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((data: SwitchState) => setResults(data.accounts ?? []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const switchTo = useCallback(
    async (account: SwitchAccount) => {
      setSwitching(account.id);
      try {
        const res = await fetch('/api/auth/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: account.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: 'Could not switch', description: data.error, variant: 'destructive' });
          setSwitching(null);
          return;
        }
        // A full load: every part of the app picks up the new account.
        window.location.href = isStaffRole(account.role) ? '/admin/dashboard' : '/dashboard';
      } catch {
        toast({ title: 'Could not switch', description: 'Check your connection and try again.', variant: 'destructive' });
        setSwitching(null);
      }
    },
    [toast],
  );

  const list = results ?? state?.accounts ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !switching && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <ArrowLeftRight className="h-5 w-5 text-amber-500" /> Switch account
          </DialogTitle>
          <DialogDescription>
            Step into an account to test or run it, then switch back. Every switch is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        {!state ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : !state.canSwitch ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Switching accounts is only for the developer account.</p>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Any account by email or name…" className="rounded-xl pl-9" />
            </div>
            {results && results.length === 0 && <p className="text-center text-xs text-slate-500">No account matches that.</p>}
            <ul className="space-y-1.5">
              {list.map((account) => {
                const current = account.id === state.currentId;
                const own = account.id === state.owner?.id;
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      disabled={current || switching !== null}
                      onClick={() => switchTo(account)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/50 disabled:cursor-default disabled:opacity-60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        {account.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : account.businessName ? <Store className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {account.fullName}
                          {own && <span className="ml-1.5 text-xs font-semibold text-amber-700">(you)</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {account.email} · {ROLE_LABELS[account.role] ?? account.role}
                          {account.businessName ? ` · ${account.businessName}` : ''}
                        </span>
                      </span>
                      {switching === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      ) : current ? (
                        <span className="text-[11px] font-bold text-emerald-700">Signed in</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A button that opens the switcher; only the developer account sees it. */
export function AccountSwitchButton({ className }: { className?: string }) {
  const { user, actor } = useAuth();
  const [canSwitch, setCanSwitch] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/auth/switch', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: SwitchState) => setCanSwitch(data.canSwitch === true))
      .catch(() => setCanSwitch(false));
  }, [user]);

  if (!canSwitch || actor) return null;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className={className}>
        <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Switch account
      </Button>
      <AccountSwitcher open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Across the top of every page while switched into another account. */
export function SwitchedAccountBanner() {
  const { user, actor } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (!user || !actor) return null;

  const switchBack = async () => {
    setLeaving(true);
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: actor.id }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = '/admin/dashboard';
      return;
    }
    const data = await res?.json().catch(() => ({}));
    toast({ title: 'Could not switch back', description: data?.error ?? 'Check your connection.', variant: 'destructive' });
    setLeaving(false);
  };

  return (
    <>
      <div role="status" className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-400 px-4 py-2 text-center text-xs font-bold text-slate-950 shadow-sm">
        <span className="flex items-center gap-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          You are signed in as {user.fullName || user.email} (switched from {actor.fullName || actor.email})
        </span>
        <span className="flex gap-2">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-950/10 px-2.5 py-1 hover:bg-slate-950/20">
            Switch to…
          </button>
          <button type="button" onClick={switchBack} disabled={leaving} className="rounded-lg bg-slate-950 px-2.5 py-1 text-white hover:bg-slate-800 disabled:opacity-60">
            {leaving ? 'Switching back…' : 'Switch back'}
          </button>
        </span>
      </div>
      <AccountSwitcher open={open} onOpenChange={setOpen} />
    </>
  );
}
