'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2, CreditCard, AlertTriangle, Receipt, ShieldCheck } from 'lucide-react';
import { GlassBackground, GlassCard, SectionTitle } from '@/components/shared/glass-ui';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatRand, formatDate } from '@/lib/billing';

interface Subscription {
  tierKey: string;
  tierName: string;
  renewalPriceCents: number;
  autoRenew: boolean;
  intervalMonths: number;
  nextBillingAt: string | null;
  status: string;
  paymentFailedAt: string | null;
  graceHoursRemaining: number;
  graceEndsAt: string | null;
  downgradedFrom: string | null;
  terms: string;
}

interface Invoice {
  invoiceNumber: string;
  tierName: string;
  description: string;
  amountCents: number;
  intervalMonths: number;
  issuedAt: string;
  nextBillingAt: string | null;
  status: string;
}

export default function BillingSettingsPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Returns the parsed payload rather than setting state itself, so the
  // effect below owns every setState and none of them happen synchronously
  // during render.
  const fetchBilling = useCallback(async () => {
    const res = await fetch('/api/billing/subscription', { cache: 'no-store' });
    if (!res.ok) throw new Error(`billing ${res.status}`);
    return res.json();
  }, []);

  const apply = useCallback((data: { subscription: Subscription | null; invoices?: Invoice[] }) => {
    setSub(data.subscription);
    setInvoices(data.invoices || []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchBilling();
        if (active) apply(data);
      } catch (e) {
        console.error('Failed to load billing:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchBilling, apply]);

  const toggleAutoRenew = async (next: boolean) => {
    // Turning it off is a meaningful decision, so it confirms — but it is one
    // tap to confirm, not a maze. Turning it back on is instant.
    let reason: string | null = null;
    if (!next) {
      reason = window.prompt(
        'Cancel auto-renew?\n\nYou keep every paid feature until your current term ends, then move to the Free tier. Your business stays listed and nothing is deleted.\n\nOptional — what made you cancel?',
        '',
      );
      if (reason === null) return; // dismissed
    }

    setSaving(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: next, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: next ? 'Auto-renew on' : 'Auto-renew off', description: data.message });
        apply(await fetchBilling());
      } else {
        toast({ title: 'Could not update', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isPaid = !!sub && sub.tierKey !== 'free';

  return (
    <GlassBackground>
      <div className="mx-auto max-w-3xl px-4 py-6 content-bottom-safe">
        <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4" /> Back to Settings
        </Link>

        {loading ? (
          <GlassCard>
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your billing…
            </div>
          </GlassCard>
        ) : !sub ? (
          <GlassCard>
            <SectionTitle icon={CreditCard}>Billing</SectionTitle>
            <p className="text-gray-500">
              Billing applies to business accounts. Once you create a business profile your plan and
              invoices appear here.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-5">
            {/* Failed payment banner — the 72-hour window */}
            {sub.paymentFailedAt && sub.graceHoursRemaining > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-bold text-red-800">We couldn&apos;t process your payment</p>
                    <p className="mt-1 text-sm text-red-700">
                      You have about <strong>{sub.graceHoursRemaining} hours</strong> (until{' '}
                      {formatDate(sub.graceEndsAt)}) to update it. After that your account moves to
                      the Free tier — your business stays listed and nothing is deleted.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {sub.downgradedFrom && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                Your account was moved from <strong>{sub.downgradedFrom}</strong> to the Free tier.
                Everything you created is still here — resubscribe any time to restore your features.
              </div>
            )}

            <GlassCard>
              <SectionTitle icon={CreditCard}>Your plan</SectionTitle>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{sub.tierName}</p>
                  {isPaid && (
                    <p className="mt-1 text-sm text-gray-500">
                      {formatRand(sub.renewalPriceCents)}
                      {sub.intervalMonths > 1 ? ` every ${sub.intervalMonths} months` : ' per month'}
                    </p>
                  )}
                </div>
                {isPaid ? (
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Next billing date</p>
                    <p className="font-semibold text-gray-900">{formatDate(sub.nextBillingAt)}</p>
                  </div>
                ) : (
                  <Button asChild className="bg-yellow-500 text-slate-950 hover:bg-yellow-600">
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                )}
              </div>

              {isPaid && (
                <>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">Auto-renew</p>
                      <p className="text-sm text-gray-500">
                        {sub.autoRenew
                          ? 'On — your subscription continues until you cancel.'
                          : 'Off — your plan ends on your next billing date.'}
                      </p>
                    </div>
                    <Button
                      onClick={() => toggleAutoRenew(!sub.autoRenew)}
                      disabled={saving}
                      variant={sub.autoRenew ? 'outline' : 'default'}
                      className={sub.autoRenew
                        ? 'border-gray-300 text-gray-700'
                        : 'bg-yellow-500 text-slate-950 hover:bg-yellow-600'}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {sub.autoRenew ? 'Cancel auto-renew' : 'Turn auto-renew on'}
                    </Button>
                  </div>

                  {/* The exact wording the terms promise. */}
                  <p className="mt-4 text-sm leading-relaxed text-gray-500">{sub.terms}</p>
                </>
              )}
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="p-5 pb-0 sm:p-6 sm:pb-0">
                <SectionTitle icon={Receipt}>Invoices</SectionTitle>
              </div>
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No invoices yet. Receipts appear here automatically after each payment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-5 py-3">Invoice</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((inv) => (
                        <tr key={inv.invoiceNumber} className="text-gray-600 hover:bg-gray-50">
                          <td className="px-5 py-3 font-mono text-xs text-gray-900">{inv.invoiceNumber}</td>
                          <td className="px-5 py-3 text-gray-900">{inv.tierName || inv.description}</td>
                          <td className="px-5 py-3 font-semibold text-gray-900">{formatRand(inv.amountCents)}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{formatDate(inv.issuedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>

            <p className="flex items-start gap-2 px-1 text-xs text-gray-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              Cancelling never deletes your data. Your profile, gallery, documents and messages are
              retained, and your business stays listed on the Free tier.
            </p>
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
