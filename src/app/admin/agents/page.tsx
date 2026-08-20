'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, UserPlus, Link2, Copy, Check, Wallet, TrendingUp,
  Users, QrCode, Banknote, SlidersHorizontal, Download, Ban, RotateCcw, RefreshCw, X, CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard } from '@/components/admin/ui';
import { formatRand } from '@/lib/commission';

interface Agent {
  id: string;
  fullName: string;
  email: string;
  referralCode: string | null;
  isSuspended: boolean;
  effectiveRate: number;
  rateOverride: number | null;
  notes: string;
  signups: number;
  sales: number;
  linkSignups: number;
  revenueCents: number;
  commissionEarnedCents: number;
  commissionPaidCents: number;
  commissionOwedCents: number;
  link: string | null;
  qrUrl: string | null;
}

interface PendingInvite {
  id: string;
  fullName: string;
  email: string;
  referralCode: string;
  invitedBy: string;
  expiresAt: string;
}

interface Milestone {
  sales: number;
  name: string;
  reward: string;
}

interface CommissionSettings {
  defaultRate: number;
  basis: 'first_payment' | 'every_payment';
  milestones: Milestone[];
}

interface Payout {
  id: string;
  agentName: string;
  amountCents: number;
  reference: string;
  paidAt: string;
  recordedBy: string;
  status: 'recorded' | 'reconciled' | 'disputed';
  bankReference: string;
  statementAmountCents: number | null;
  varianceCents: number | null;
  reconciledBy: string | null;
  reconciliationNote: string;
}

interface PayoutSummary {
  total: number;
  recorded: number;
  reconciled: number;
  disputed: number;
  unreconciledCents: number;
}

interface SettingsChange {
  id: string;
  changedBy: string;
  createdAt: string;
  oldValue: { defaultRate?: number } | null;
  newValue: { defaultRate?: number };
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState({ fullName: '', email: '' });
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [ratePercent, setRatePercent] = useState('50');
  const [history, setHistory] = useState<SettingsChange[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const { toast } = useToast();

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/admin/agents', { cache: 'no-store' });
    if (!res.ok) throw new Error(`agents ${res.status}`);
    return res.json();
  }, []);

  const apply = useCallback((data: { agents?: Agent[]; pendingInvites?: PendingInvite[] }) => {
    setAgents(data.agents || []);
    setInvites(data.pendingInvites || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/admin/commission-settings', { cache: 'no-store' });
    if (!res.ok) throw new Error(`settings ${res.status}`);
    return res.json();
  }, []);

  const fetchPayouts = useCallback(async () => {
    const res = await fetch('/api/admin/agents/payouts', { cache: 'no-store' });
    if (!res.ok) throw new Error(`payouts ${res.status}`);
    const data = await res.json();
    setPayouts(data.payouts || []);
    setPayoutSummary(data.summary ?? null);
  }, []);

  /**
   * Matches a recorded payout to a line on the bank statement. The statement
   * amount is stored next to the recorded one, so a difference is flagged
   * rather than silently absorbed.
   */
  const reconcile = async (p: Payout) => {
    const bankReference = window.prompt(
      `Reconcile the ${formatRand(p.amountCents)} payout to ${p.agentName}.\n\nBank reference from the statement:`,
      p.bankReference || p.reference || '',
    );
    if (bankReference === null) return;
    const amount = window.prompt(
      `Amount shown on the statement, in Rand.\n\nWe recorded ${formatRand(p.amountCents)}. Leave as-is if they match.`,
      (p.amountCents / 100).toFixed(2),
    );
    if (amount === null) return;

    const differs = Math.round(Number(amount) * 100) !== p.amountCents;
    let force = false;
    let note = '';
    if (differs) {
      note =
        window.prompt(
          `That differs from what we recorded.\n\nExplain the difference (bank fee, part payment, error). Leave blank to flag it as disputed for review.`,
          '',
        ) ?? '';
      force = note.trim().length > 0;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/agents/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: p.id, bankReference, statementAmountRand: amount, note, force,
        }),
      });
      const data = await res.json();
      toast({
        title: res.ok ? (data.status === 'disputed' ? 'Flagged as disputed' : 'Reconciled') : 'Could not reconcile',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
      if (res.ok) await fetchPayouts();
    } catch {
      toast({ title: 'Could not reconcile', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [agentData, settingsData] = await Promise.all([
          fetchAgents(),
          fetchSettings().catch(() => null),
          fetchPayouts().catch(() => null),
        ]);
        if (!active) return;
        apply(agentData);
        if (settingsData?.settings) {
          setSettings(settingsData.settings);
          setRatePercent(String(Math.round(settingsData.settings.defaultRate * 100)));
          setHistory(settingsData.history || []);
        }
      } catch (e) {
        console.error('Failed to load agents:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchAgents, fetchSettings, fetchPayouts, apply]);

  /** Saves the platform-wide scheme. Milestones are edited in place. */
  const saveSettings = async (milestones?: Milestone[]) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/commission-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultRatePercent: Number(ratePercent),
          basis: settings?.basis ?? 'first_payment',
          milestones: milestones ?? settings?.milestones ?? [],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setRatePercent(String(Math.round(data.settings.defaultRate * 100)));
        toast({ title: 'Scheme updated', description: data.message });
        const [agentData, settingsData] = await Promise.all([fetchAgents(), fetchSettings()]);
        apply(agentData);
        setHistory(settingsData.history || []);
      } else {
        toast({ title: 'Could not save', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not save settings', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  /** Per-agent actions: rate override, notes, suspend, new code. */
  const agentAction = async (agent: Agent, action: string, value?: string | null) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Updated', description: data.message });
        apply(await fetchAgents());
      } else {
        toast({ title: 'Could not update', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update agent', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (invite: PendingInvite) => {
    if (!window.confirm(`Withdraw the invite for ${invite.fullName}? Their link will stop working.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agents/${invite.id}`, { method: 'DELETE' });
      const data = await res.json();
      toast({
        title: res.ok ? 'Invite withdrawn' : 'Could not withdraw',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
      if (res.ok) apply(await fetchAgents());
    } finally {
      setBusy(false);
    }
  };

  /** Payroll export — what Finance actually needs to pay people. */
  const exportCsv = () => {
    const header = ['Agent', 'Email', 'Code', 'Rate %', 'Sign-ups', 'Paid sales', 'Earned (R)', 'Paid (R)', 'Owed (R)'];
    const rows = agents.map((a) => [
      a.fullName, a.email, a.referralCode ?? '', Math.round(a.effectiveRate * 100),
      a.signups, a.sales,
      (a.commissionEarnedCents / 100).toFixed(2),
      (a.commissionPaidCents / 100).toFixed(2),
      (a.commissionOwedCents / 100).toFixed(2),
    ]);
    // Quote every field so names containing commas cannot shift columns.
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast({ title: 'Could not copy', description: value, variant: 'destructive' });
    }
  };

  const createInvite = async () => {
    if (!newInvite.fullName.trim() || !newInvite.email.trim()) {
      toast({ title: 'Enter their name and email', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvite),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUrl(data.inviteUrl);
        setNewInvite({ fullName: '', email: '' });
        apply(await fetchAgents());
        toast({ title: 'Invite created', description: 'Copy the link below — it is shown only once.' });
      } else {
        toast({ title: 'Could not create invite', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not create invite', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const recordPayout = async (agent: Agent) => {
    const suggested = (agent.commissionOwedCents / 100).toFixed(2);
    const input = window.prompt(
      `Record a commission payout for ${agent.fullName}.\n\n` +
        `Outstanding: ${formatRand(agent.commissionOwedCents)}\n\n` +
        `Amount paid (in Rand):`,
      suggested,
    );
    if (input === null) return;
    const reference = window.prompt('Payment reference (optional — e.g. EFT number):', '') ?? '';

    setBusy(true);
    try {
      const res = await fetch('/api/admin/agents/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, amountRand: input, reference }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Payout recorded', description: data.message });
        apply(await fetchAgents());
        await fetchPayouts().catch(() => {});
      } else {
        toast({ title: 'Could not record payout', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not record payout', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const totals = agents.reduce(
    (a, x) => ({
      signups: a.signups + x.signups,
      sales: a.sales + x.sales,
      owed: a.owed + x.commissionOwedCents,
      earned: a.earned + x.commissionEarnedCents,
    }),
    { signups: 0, sales: 0, owed: 0, earned: 0 },
  );

  return (
    <AdminBackground>
      <AdminPageHeader
        title="Sales Agents"
        subtitle="Referral links, performance and commission payouts"
      >
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 content-bottom-safe sm:py-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Active agents" value={agents.length} icon={Users} gradient="from-blue-500 to-cyan-500" loading={loading} />
          <StatCard label="Total sign-ups" value={totals.signups} icon={UserPlus} gradient="from-teal-500 to-emerald-500" loading={loading} />
          <StatCard label="Paid sales" value={totals.sales} icon={TrendingUp} gradient="from-green-500 to-emerald-500" loading={loading} />
          <StatCard label="Commission owed" value={formatRand(totals.owed)} icon={Wallet} gradient="from-amber-500 to-orange-500" loading={loading} />
        </div>

        {/* Commission scheme — changeable on the fly, no deploy needed */}
        <AdminCard>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
            <SlidersHorizontal className="h-5 w-5 text-amber-600" /> Commission scheme
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Applies to every agent who does not have their own negotiated rate.
            Changes take effect immediately and are recorded below.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="rate" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Commission rate
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="rate"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={ratePercent}
                  onChange={(e) => setRatePercent(e.target.value)}
                  className="w-28 border-gray-200 bg-white text-lg font-bold text-gray-900"
                />
                <span className="text-lg font-bold text-gray-500">%</span>
              </div>
            </div>
            <div className="min-w-[220px] flex-1">
              <p className="text-sm text-gray-600">
                An agent earns{' '}
                <span className="font-bold text-gray-900">{ratePercent || 0}%</span> of each
                referred business&apos;s first payment. On a R99 tier that is{' '}
                <span className="font-bold text-gray-900">
                  {formatRand(Math.floor(9900 * ((Number(ratePercent) || 0) / 100)))}
                </span>
                .
              </p>
            </div>
            <Button
              onClick={() => saveSettings()}
              disabled={busy || ratePercent === String(Math.round((settings?.defaultRate ?? 0.5) * 100))}
              className="bg-yellow-500 text-slate-950 hover:bg-yellow-600"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save rate
            </Button>
          </div>

          {/* Targets */}
          {settings && (
            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sales targets &amp; rewards
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {settings.milestones.map((m, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={m.sales}
                        onChange={(e) => {
                          const next = [...settings.milestones];
                          next[i] = { ...m, sales: Number(e.target.value) };
                          setSettings({ ...settings, milestones: next });
                        }}
                        className="w-20 border-gray-200 bg-white text-gray-900"
                      />
                      <span className="text-sm text-gray-500">sales</span>
                    </div>
                    <Input
                      value={m.name}
                      placeholder="Tier name"
                      onChange={(e) => {
                        const next = [...settings.milestones];
                        next[i] = { ...m, name: e.target.value };
                        setSettings({ ...settings, milestones: next });
                      }}
                      className="mt-2 border-gray-200 bg-white text-gray-900"
                    />
                    <Input
                      value={m.reward}
                      placeholder="Reward"
                      onChange={(e) => {
                        const next = [...settings.milestones];
                        next[i] = { ...m, reward: e.target.value };
                        setSettings({ ...settings, milestones: next });
                      }}
                      className="mt-2 border-gray-200 bg-white text-gray-900"
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-3 border-gray-300"
                disabled={busy}
                onClick={() => saveSettings(settings.milestones)}
              >
                Save targets
              </Button>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Recent changes
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {history.slice(0, 5).map((h) => (
                  <li key={h.id}>
                    <span className="text-gray-900">
                      {Math.round((h.oldValue?.defaultRate ?? 0) * 100)}% →{' '}
                      {Math.round((h.newValue?.defaultRate ?? 0) * 100)}%
                    </span>{' '}
                    by {h.changedBy} on {new Date(h.createdAt).toLocaleDateString('en-ZA')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>

        {/* Hire a marketer */}
        <AdminCard>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
            <UserPlus className="h-5 w-5 text-amber-600" /> Invite a new marketer
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Creates a one-time link. They set their own password, and their referral
            code is issued automatically.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Full name"
              value={newInvite.fullName}
              onChange={(e) => setNewInvite((s) => ({ ...s, fullName: e.target.value }))}
              className="border-gray-200 bg-white text-gray-900"
            />
            <Input
              type="email"
              placeholder="Email address"
              value={newInvite.email}
              onChange={(e) => setNewInvite((s) => ({ ...s, email: e.target.value }))}
              className="border-gray-200 bg-white text-gray-900"
            />
            <Button onClick={createInvite} disabled={busy} className="bg-yellow-500 text-slate-950 hover:bg-yellow-600">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create invite
            </Button>
          </div>

          {inviteUrl && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Send this link to them — it is shown once and cannot be retrieved again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-gray-800">
                  {inviteUrl}
                </code>
                <Button size="sm" variant="outline" onClick={() => copy(inviteUrl, 'invite')} className="shrink-0 border-gray-300">
                  {copied === 'invite' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Invites not yet accepted
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{i.fullName}</span>
                    <span className="text-gray-500">{i.email}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{i.referralCode}</span>
                    <span className="text-xs text-gray-400">
                      expires {new Date(i.expiresAt).toLocaleDateString('en-ZA')}
                    </span>
                    <button
                      type="button"
                      title="Withdraw this invite"
                      disabled={busy}
                      onClick={() => revokeInvite(i)}
                      className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>

        {/* The agents themselves */}
        <AdminCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Link2 className="h-5 w-5 text-amber-600" /> Agents &amp; referral links
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={agents.length === 0}
              className="gap-2 border-gray-300 text-gray-700"
            >
              <Download className="h-4 w-4" /> Export for payroll
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No agents yet. Invite your first marketer above, or set an existing
              user&apos;s role to Sales Agent in User Management.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Referral link</th>
                    <th className="px-5 py-3">Sign-ups</th>
                    <th className="px-5 py-3">Paid sales</th>
                    <th className="px-5 py-3">Rate</th>
                    <th className="px-5 py-3">Earned</th>
                    <th className="px-5 py-3">Owed</th>
                    <th className="px-5 py-3">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {agents.map((a) => (
                    <tr key={a.id} className="text-gray-600 transition-colors hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{a.fullName}</div>
                        <div className="text-xs text-gray-500">{a.email}</div>
                        {a.isSuspended && (
                          <span className="mt-1 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {a.referralCode ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                              {a.referralCode}
                            </span>
                            <button
                              type="button"
                              title="Copy referral link"
                              onClick={() => a.link && copy(a.link, a.id)}
                              className="text-gray-400 transition-colors hover:text-amber-600"
                            >
                              {copied === a.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              title="Show QR code"
                              onClick={() => setShowQr(showQr === a.id ? null : a.id)}
                              className="text-gray-400 transition-colors hover:text-amber-600"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">no code</span>
                        )}
                        {showQr === a.id && a.qrUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={a.qrUrl} alt={`QR code for ${a.fullName}`} className="mt-2 h-32 w-32 rounded-lg border border-gray-200 bg-white p-1" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{a.signups}</div>
                        <div className="text-xs text-gray-500">{a.linkSignups} via link</div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{a.sales}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          title="Set a negotiated rate for this agent"
                          disabled={busy}
                          onClick={() => {
                            const input = window.prompt(
                              `Commission rate for ${a.fullName}, as a percentage.\n\n` +
                                `Leave blank to use the platform default (${Math.round((settings?.defaultRate ?? 0.5) * 100)}%).`,
                              a.rateOverride !== null ? String(Math.round(a.rateOverride * 100)) : '',
                            );
                            if (input === null) return;
                            agentAction(a, 'set_rate', input.trim() === '' ? null : input.trim());
                          }}
                          className="rounded px-2 py-1 font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                        >
                          {Math.round(a.effectiveRate * 100)}%
                          {a.rateOverride !== null && (
                            <span className="ml-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              custom
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{formatRand(a.commissionEarnedCents)}</div>
                        <div className="text-xs text-gray-500">paid {formatRand(a.commissionPaidCents)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={a.commissionOwedCents > 0 ? 'font-bold text-amber-700' : 'text-gray-400'}>
                          {formatRand(a.commissionOwedCents)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || a.commissionOwedCents === 0}
                            onClick={() => recordPayout(a)}
                            className="gap-1.5 border-gray-300 text-gray-700"
                          >
                            <Banknote className="h-4 w-4" /> Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            title={a.isSuspended ? 'Reinstate this agent' : 'Suspend — their code stops crediting new signups'}
                            onClick={() => {
                              if (a.isSuspended) return agentAction(a, 'reinstate');
                              const reason = window.prompt(
                                `Suspend ${a.fullName}?\n\nTheir referral code stops crediting new signups and their sessions end. Existing records, commission and payouts are kept.\n\nReason (optional):`,
                                '',
                              );
                              if (reason === null) return;
                              agentAction(a, 'suspend', reason);
                            }}
                            className={`gap-1.5 border-gray-300 ${a.isSuspended ? 'text-green-700' : 'text-gray-700'}`}
                          >
                            {a.isSuspended ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            title="Issue a new referral code — the old link stops working"
                            onClick={() => {
                              if (!window.confirm(`Issue a new code for ${a.fullName}? Any link or QR already handed out will stop working.`)) return;
                              agentAction(a, 'regenerate_code');
                            }}
                            className="gap-1.5 border-gray-300 text-gray-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Bank reconciliation */}
        <AdminCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Banknote className="h-5 w-5 text-amber-600" /> Payouts &amp; bank reconciliation
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Match each recorded payout to a line on your bank statement.
              </p>
            </div>
            {payoutSummary && payoutSummary.total > 0 && (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  {payoutSummary.recorded} awaiting
                </span>
                <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-green-700">
                  {payoutSummary.reconciled} matched
                </span>
                {payoutSummary.disputed > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-700">
                    {payoutSummary.disputed} disputed
                  </span>
                )}
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-700">
                  {formatRand(payoutSummary.unreconciledCents)} unmatched
                </span>
              </div>
            )}
          </div>

          {payouts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No payouts recorded yet. Use &ldquo;Pay&rdquo; on an agent above once you have
              paid them, then match it here against your statement.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Recorded</th>
                    <th className="px-5 py-3">Statement</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payouts.map((p) => (
                    <tr key={p.id} className="text-gray-600 transition-colors hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{p.agentName}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(p.paidAt).toLocaleDateString('en-ZA')} · {p.recordedBy}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatRand(p.amountCents)}</td>
                      <td className="px-5 py-3">
                        {p.statementAmountCents === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <>
                            <div className="text-gray-900">{formatRand(p.statementAmountCents)}</div>
                            {p.varianceCents !== null && p.varianceCents !== 0 && (
                              <div className="text-xs font-semibold text-red-700">
                                {p.varianceCents > 0 ? '+' : '−'}
                                {formatRand(Math.abs(p.varianceCents))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">
                        {p.bankReference || p.reference || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            p.status === 'reconciled'
                              ? 'bg-green-500/15 text-green-700'
                              : p.status === 'disputed'
                                ? 'bg-red-500/15 text-red-700'
                                : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.reconciliationNote && (
                          <div className="mt-1 max-w-[220px] text-xs text-gray-500">{p.reconciliationNote}</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => reconcile(p)}
                          className="gap-1.5 border-gray-300 text-gray-700"
                        >
                          <CheckCheck className="h-4 w-4" />
                          {p.status === 'recorded' ? 'Match' : 'Re-check'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <p className="px-1 text-xs text-gray-500">
          Commission is a share of each referred business&apos;s first payment, calculated
          from actual payments rather than stored — so it can never drift from the
          money that really moved. &ldquo;Record&rdquo; logs a payment you have already
          made; it does not transfer any funds.
        </p>
      </div>
    </AdminBackground>
  );
}
