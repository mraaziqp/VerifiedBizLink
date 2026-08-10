'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Search, ShieldAlert, Ban, RotateCcw,
  Trash2, AlertTriangle, ShieldOff, ShieldCheck, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard, SectionTitle } from '@/components/admin/ui';

interface ModUser {
  id: string;
  fullName: string;
  email: string;
  companyName: string | null;
  createdAt: string;
  emailVerified: boolean;
  isSuspended: boolean;
  suspendedReason: string;
  strikes: number;
  warnings: number;
  lastActionAt: string | null;
}

interface HistoryRow {
  id: string;
  action: string;
  reason: string;
  issuedByName: string;
  createdAt: string;
  targetName: string;
  targetEmail: string;
}

const ACTION_STYLES: Record<string, string> = {
  warning: 'bg-amber-500/15 text-amber-700',
  strike: 'bg-orange-500/15 text-orange-700',
  ban: 'bg-red-500/15 text-red-700',
  unban: 'bg-green-500/15 text-green-700',
  unverify: 'bg-purple-500/15 text-purple-700',
  verify: 'bg-blue-500/15 text-blue-700',
};

const when = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminSecurityPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ModUser[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/moderation', { signal });
      if (res.ok) {
        const data = await res.json();
        if (signal?.aborted) return;
        setUsers(data.users || []);
        setHistory(data.history || []);
      }
    } catch {
      /* surfaced by the empty state */
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const act = async (u: ModUser, action: string, opts?: { needsReason?: boolean; confirm?: string }) => {
    if (opts?.confirm && !window.confirm(opts.confirm)) return;
    let reason = '';
    if (opts?.needsReason) {
      const r = window.prompt(`Reason for "${action}" on ${u.fullName || u.email}:`, '');
      if (r === null) return;
      if (!r.trim()) {
        toast({ title: 'A reason is required', variant: 'destructive' });
        return;
      }
      reason = r.trim();
    }
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: `${action} applied to ${u.fullName || u.email}` });
        await load();
      } else {
        toast({ title: `Could not apply ${action}`, description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: `Could not apply ${action}`, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u: ModUser) => {
    if (!window.confirm(
      `Permanently delete ${u.fullName || u.email}?\n\nThis removes their account, posts, connections, messages and business listing. This cannot be undone.`
    )) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast({ title: 'User deleted' });
      } else {
        toast({ title: 'Could not delete user', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not delete user', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const q = search.toLowerCase();
  const filtered = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.companyName || '').toLowerCase().includes(q)
  );

  const banned = users.filter((u) => u.isSuspended).length;
  const flagged = users.filter((u) => u.strikes > 0 || u.warnings > 0).length;
  const atRisk = users.filter((u) => u.strikes >= 3).length;

  return (
    <AdminBackground>
      <AdminPageHeader title="Security & Moderation" subtitle="Warnings, strikes, bans and account verification control">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Members" value={users.length} icon={ShieldCheck} gradient="from-blue-500 to-cyan-500" loading={loading} />
          <StatCard label="Flagged" value={flagged} icon={AlertTriangle} gradient="from-amber-500 to-orange-500" loading={loading} />
          <StatCard label="3+ Strikes" value={atRisk} icon={ShieldAlert} gradient="from-orange-500 to-red-500" loading={loading} />
          <StatCard label="Banned" value={banned} icon={Ban} gradient="from-red-500 to-rose-500" loading={loading} />
        </div>

        <AdminCard>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name, email or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-gray-200 bg-white pl-10 text-gray-900 placeholder-gray-400 focus-visible:ring-amber-400"
            />
          </div>
        </AdminCard>

        <AdminCard className="p-0 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="font-semibold text-gray-900">{filtered.length} Members</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No members found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Record</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Moderate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((u) => {
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className="text-gray-600 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">{u.fullName}</div>
                          <div className="text-xs text-gray-500">{u.companyName || u.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {u.warnings > 0 && (
                              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                {u.warnings} warning{u.warnings === 1 ? '' : 's'}
                              </span>
                            )}
                            {u.strikes > 0 && (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.strikes >= 3 ? 'bg-red-500/15 text-red-700' : 'bg-orange-500/15 text-orange-700'}`}>
                                {u.strikes} strike{u.strikes === 1 ? '' : 's'}
                              </span>
                            )}
                            {u.warnings === 0 && u.strikes === 0 && <span className="text-xs text-gray-400">Clean</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {u.isSuspended ? (
                              <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-700">Banned</span>
                            ) : (
                              <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-700">Active</span>
                            )}
                            {!u.emailVerified && (
                              <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">Unverified</span>
                            )}
                          </div>
                          {u.isSuspended && u.suspendedReason && (
                            <div className="mt-1 max-w-[220px] truncate text-xs text-gray-500" title={u.suspendedReason}>
                              {u.suspendedReason}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" disabled={busy}
                              onClick={() => act(u, 'warning', { needsReason: true })}
                              className="gap-1 border-amber-500/30 text-amber-700" title="Record a warning">
                              <AlertTriangle className="h-3 w-3" /> Warn
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy}
                              onClick={() => act(u, 'strike', { needsReason: true })}
                              className="gap-1 border-orange-500/30 text-orange-700" title="Record a strike">
                              <ShieldAlert className="h-3 w-3" /> Strike
                            </Button>
                            {u.isSuspended ? (
                              <Button size="sm" variant="outline" disabled={busy}
                                onClick={() => act(u, 'unban')}
                                className="gap-1 border-green-500/30 text-green-700">
                                <RotateCcw className="h-3 w-3" /> Unban
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled={busy}
                                onClick={() => act(u, 'ban', { needsReason: true })}
                                className="gap-1 border-red-500/30 text-red-700">
                                <Ban className="h-3 w-3" /> Ban
                              </Button>
                            )}
                            {u.emailVerified ? (
                              <Button size="sm" variant="outline" disabled={busy}
                                onClick={() => act(u, 'unverify', { confirm: `Remove verified status from ${u.fullName || u.email}? They will be signed out and locked out of posting until they verify again.` })}
                                className="gap-1 border-purple-500/30 text-purple-700">
                                <ShieldOff className="h-3 w-3" /> Unverify
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled={busy}
                                onClick={() => act(u, 'verify')}
                                className="gap-1 border-blue-500/30 text-blue-700">
                                <ShieldCheck className="h-3 w-3" /> Verify
                              </Button>
                            )}
                            <Button size="sm" variant="outline" disabled={busy}
                              onClick={() => remove(u)}
                              className="gap-1 border-red-500/30 text-red-700" title="Permanently delete">
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <SectionTitle icon={History}>Recent Moderation History</SectionTitle>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No moderation actions recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[h.action] || 'bg-gray-200 text-gray-700'}`}>
                    {h.action}
                  </span>
                  <span className="font-medium text-gray-900">{h.targetName}</span>
                  {h.reason && <span className="text-sm text-gray-600">— {h.reason}</span>}
                  <span className="ml-auto text-xs text-gray-500">
                    by {h.issuedByName} · {when(h.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
