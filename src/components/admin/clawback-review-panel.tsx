'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Undo2, ShieldAlert, Check, HandCoins, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AdminCard } from '@/components/admin/ui';
import { formatRand } from '@/lib/commission';

interface Clawback {
  id: string;
  agentName: string;
  agentEmail: string;
  companyName: string | null;
  paymentReference: string;
  commissionCents: number;
  paymentCents: number;
  ratePercent: number | null;
  reason: string;
  alreadyPaidOut: boolean;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-red-500/15 text-red-700',
  recovered: 'bg-red-500/15 text-red-700',
  waived: 'bg-green-500/15 text-green-700',
};

/**
 * Commission clawbacks — Policy §12.
 *
 * The policy says the Company MAY recover commission on a reversed payment.
 * That "may" is why this screen exists: nothing is deducted until a person
 * decides. While a clawback is pending the Advisor's balance is untouched.
 */
export function ClawbackReviewPanel() {
  const { toast } = useToast();

  const [clawbacks, setClawbacks] = useState<Clawback[]>([]);
  const [summary, setSummary] = useState({ pending: 0, pendingCents: 0, approvedCents: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const fetchClawbacks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents/clawbacks', { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to load clawbacks:', e);
      return null;
    }
  }, []);

  const apply = useCallback((data: { clawbacks?: Clawback[]; summary?: typeof summary } | null) => {
    if (data) {
      setClawbacks(data.clawbacks || []);
      setSummary(data.summary || { pending: 0, pendingCents: 0, approvedCents: 0 });
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    apply(await fetchClawbacks());
  }, [apply, fetchClawbacks]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchClawbacks();
      if (active) apply(data);
    })();
    return () => { active = false; };
  }, [fetchClawbacks, apply]);

  const reverse = async () => {
    if (!reference.trim() || !reason.trim()) {
      toast({ title: 'Reference and reason are both needed', variant: 'destructive' });
      return;
    }
    setReversing(true);
    try {
      const res = await fetch('/api/admin/agents/clawbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReference: reference.trim(), reason: reason.trim() }),
      });
      const data = await res.json();
      toast({
        title: res.ok ? 'Done' : 'Could not reverse',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
      if (res.ok) { setReference(''); setReason(''); await load(); }
    } catch {
      toast({ title: 'Could not reverse that payment', variant: 'destructive' });
    } finally {
      setReversing(false);
    }
  };

  const decide = async (c: Clawback, status: 'approved' | 'waived' | 'recovered') => {
    setBusyId(c.id);
    try {
      const res = await fetch('/api/admin/agents/clawbacks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clawbackId: c.id, status, note: notes[c.id] || '' }),
      });
      const data = await res.json();
      toast({
        title: res.ok ? 'Recorded' : 'Could not update',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
      if (res.ok) { setNotes((n) => ({ ...n, [c.id]: '' })); await load(); }
    } catch {
      toast({ title: 'Could not record that decision', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminCard>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
        <ShieldAlert className="h-5 w-5 text-amber-600" /> Commission clawbacks
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        When a payment is refunded or reversed, the commission it earned is flagged
        here. Nothing comes off an agent&apos;s balance until you decide — a bank
        error and a bad registration deserve different answers.
      </p>

      {/* Reverse a payment */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Undo2 className="h-4 w-4 text-amber-600" /> Reverse a payment
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
          <div>
            <Label className="text-xs font-semibold text-gray-600">Payment reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VBL-..."
              className="mt-1 border-gray-200 bg-white"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600">Why</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Chargeback from PayFast, duplicate charge, fraudulent signup…"
              className="mt-1 border-gray-200 bg-white"
            />
          </div>
          <Button
            onClick={reverse}
            disabled={reversing}
            className="gap-2 bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600"
          >
            {reversing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            Reverse
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Refunds are issued from the PayFast dashboard — this tells the app one
          happened so the commission follows it.
        </p>
      </div>

      {/* Pending value */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-700">Awaiting a decision</p>
          <p className="text-lg font-bold text-amber-900">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">Value on hold</p>
          <p className="text-lg font-bold text-gray-900">{formatRand(summary.pendingCents)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">Confirmed recoveries</p>
          <p className="text-lg font-bold text-gray-900">{formatRand(summary.approvedCents)}</p>
        </div>
      </div>

      {/* The list */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : clawbacks.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            No clawbacks. Nothing has been reversed.
          </p>
        ) : (
          <ul className="space-y-3">
            {clawbacks.map((c) => (
              <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{c.agentName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status] ?? STATUS_STYLES.pending}`}>
                    {c.status}
                  </span>
                  {c.alreadyPaidOut && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700">
                      already paid out — money to recover
                    </span>
                  )}
                  <span className="ml-auto text-lg font-bold text-gray-900">
                    {formatRand(c.commissionCents)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  {c.companyName ? `${c.companyName} · ` : ''}
                  {formatRand(c.paymentCents)} payment
                  {c.ratePercent !== null ? ` at ${c.ratePercent}%` : ''} ·{' '}
                  <span className="font-mono text-xs">{c.paymentReference}</span>
                </p>
                <p className="mt-1 text-sm text-gray-700">{c.reason}</p>

                {c.status === 'pending' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={notes[c.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                      placeholder="Note for the record (optional)"
                      className="h-9 max-w-xs border-gray-200 bg-white text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => decide(c, 'approved')}
                      className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
                    >
                      {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve deduction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === c.id}
                      onClick={() => decide(c, 'recovered')}
                      className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <HandCoins className="h-4 w-4" /> Money recovered
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === c.id}
                      onClick={() => decide(c, 'waived')}
                      className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Ban className="h-4 w-4" /> Waive — agent keeps it
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    {c.reviewedBy ? `${c.reviewedBy} · ` : ''}
                    {c.reviewedAt ? new Date(c.reviewedAt).toLocaleDateString('en-ZA') : ''}
                    {c.reviewNote ? ` — ${c.reviewNote}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminCard>
  );
}
