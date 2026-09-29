'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ScrollText } from 'lucide-react';
import { AdminCard, SectionTitle } from '@/components/admin/ui';
import { formatRandCents } from '@/lib/format-number';

interface BillingEventRow {
  id: string;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  amount_cents: number | null;
  reference: string | null;
  detail: string | null;
  created_at: string;
  company_name: string | null;
  user_email: string | null;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-gray-200 bg-white',
};

const LABELS: Record<string, string> = {
  charge_succeeded: 'Payment received',
  renewal_succeeded: 'Renewal received',
  charge_failed: 'Payment failed',
  renewal_failed: 'Renewal failed',
  renewal_overdue: 'Renewal did not charge',
  failure_notice_sent: 'Customer emailed (payment failed)',
  final_notice_sent: 'Customer emailed (final reminder)',
  notice_email_failed: 'Customer email FAILED',
  downgraded_nonpayment: 'Downgraded for non-payment',
  pay_now_started: 'Customer opened Pay now',
  old_subscription_cancelled: 'PayFast subscription cancelled',
  old_subscription_cancel_failed: 'PayFast cancel FAILED — do by hand',
  charge_on_replaced_subscription: 'Possible double charge',
  payment_unrecorded: 'Charge not recorded',
  payment_unapplied: 'Charge not applied',
};

/**
 * The billing log: every charge, failure, customer notice and downgrade. A
 * failed or missing payment is never only in a server log nobody reads.
 */
export function BillingLog() {
  const [events, setEvents] = useState<BillingEventRow[]>([]);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const load = useCallback(async (problems: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing-events${problems ? '?severity=problems' : ''}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setEvents(data.events || []);
      setSetupError(data.error || null);
    } catch {
      /* keep what is shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(problemsOnly); }, [problemsOnly, load]);

  return (
    <AdminCard className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6 pb-0 sm:pb-0">
        <SectionTitle icon={ScrollText}>Billing log</SectionTitle>
        <div className="flex gap-2 pb-5 sm:pb-6">
          {[{ key: false, label: 'All events' }, { key: true, label: 'Problems only' }].map((f) => (
            <button
              key={f.label}
              onClick={() => setProblemsOnly(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                problemsOnly === f.key ? 'bg-yellow-500 text-slate-950' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
        </div>
      ) : setupError ? (
        <p className="px-6 pb-6 text-sm text-red-700">{setupError}</p>
      ) : events.length === 0 ? (
        <p className="px-6 pb-8 text-center text-sm text-gray-500">
          {problemsOnly ? 'No billing problems recorded.' : 'No billing events yet.'}
        </p>
      ) : (
        <ul className="space-y-2 px-4 pb-5 sm:px-6">
          {events.map((e) => (
            <li key={e.id} className={`rounded-xl border p-3 text-sm ${SEVERITY_STYLE[e.severity] || SEVERITY_STYLE.info}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {e.severity === 'critical' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                ) : e.severity === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                ) : e.event.endsWith('succeeded') ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <span className="font-semibold text-gray-900">{LABELS[e.event] || e.event}</span>
                {e.company_name && <span className="text-gray-600">{e.company_name}</span>}
                {e.amount_cents != null && (
                  <span className="font-medium text-gray-900">{formatRandCents(e.amount_cents)}</span>
                )}
                <span className="ml-auto text-xs text-gray-500">
                  {new Date(e.created_at).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {e.detail && <p className="mt-1 break-words text-gray-700">{e.detail}</p>}
              {(e.reference || e.user_email) && (
                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  {[e.user_email, e.reference].filter(Boolean).join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
