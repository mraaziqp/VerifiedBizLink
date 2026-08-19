'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, UserPlus, Link2, Copy, Check, Wallet, TrendingUp,
  Users, QrCode, Banknote,
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

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState({ fullName: '', email: '' });
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchAgents();
        if (active) apply(data);
      } catch (e) {
        console.error('Failed to load agents:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchAgents, apply]);

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
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>

        {/* The agents themselves */}
        <AdminCard className="overflow-hidden p-0">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Link2 className="h-5 w-5 text-amber-600" /> Agents &amp; referral links
            </h2>
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
                    <th className="px-5 py-3">Earned</th>
                    <th className="px-5 py-3">Owed</th>
                    <th className="px-5 py-3">Payout</th>
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
                        <div className="font-semibold text-gray-900">{formatRand(a.commissionEarnedCents)}</div>
                        <div className="text-xs text-gray-500">paid {formatRand(a.commissionPaidCents)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={a.commissionOwedCents > 0 ? 'font-bold text-amber-700' : 'text-gray-400'}>
                          {formatRand(a.commissionOwedCents)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || a.commissionOwedCents === 0}
                          onClick={() => recordPayout(a)}
                          className="gap-1.5 border-gray-300 text-gray-700"
                        >
                          <Banknote className="h-4 w-4" /> Record
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
          Commission is 50% of each referred business&apos;s first payment, calculated
          from actual payments rather than stored — so it can never drift from the
          money that really moved. &ldquo;Record&rdquo; logs a payment you have already
          made; it does not transfer any funds.
        </p>
      </div>
    </AdminBackground>
  );
}
