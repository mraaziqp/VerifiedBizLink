'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Outcome = 'checking' | 'completed' | 'pending' | 'failed' | 'unknown';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10; // ~20s — PayFast's ITN typically lands within a few seconds

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [outcome, setOutcome] = useState<Outcome>(ref ? 'checking' : 'unknown');

  useEffect(() => {
    if (!ref) return;
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payfast/status?ref=${encodeURIComponent(ref)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.status === 'completed') {
            setOutcome('completed');
            return;
          }
          if (data.status === 'failed') {
            setOutcome('failed');
            return;
          }
        }
      } catch {
        // network hiccup — just retry on the next tick
      }
      attempts += 1;
      if (attempts >= MAX_POLLS) {
        if (!cancelled) setOutcome('pending');
        return;
      }
      if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-600 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className={
              outcome === 'completed' ? 'bg-green-500/20 p-4 rounded-full'
              : outcome === 'failed' ? 'bg-red-500/20 p-4 rounded-full'
              : 'bg-yellow-500/20 p-4 rounded-full'
            }>
              {outcome === 'checking' ? (
                <Loader2 className="h-12 w-12 text-yellow-400 animate-spin" />
              ) : outcome === 'completed' ? (
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              ) : outcome === 'failed' ? (
                <Clock className="h-12 w-12 text-red-400" />
              ) : (
                <Clock className="h-12 w-12 text-yellow-400" />
              )}
            </div>
          </div>

          <div>
            {outcome === 'checking' && (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Confirming your payment…</h1>
                <p className="text-slate-300">We&apos;re checking with PayFast now. This usually takes a few seconds.</p>
              </>
            )}
            {outcome === 'completed' && (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
                <p className="text-slate-300">Your payment has been confirmed and applied to your account.</p>
              </>
            )}
            {outcome === 'failed' && (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Payment Failed</h1>
                <p className="text-slate-300">PayFast reported this payment as unsuccessful. No charge should have gone through — please try again.</p>
              </>
            )}
            {(outcome === 'pending' || outcome === 'unknown') && (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Still Confirming…</h1>
                <p className="text-slate-300">
                  PayFast hasn&apos;t confirmed this payment yet. If money left your account, it will be reflected here
                  shortly — check <strong>Settings → Billing → Transaction History</strong> in a few minutes, or
                  contact info@verifiedbizlink.co.za if it&apos;s still showing pending after 30 minutes.
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/settings?tab=billing" className="flex-1">
              <Button className="w-full gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                View Billing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/business/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300">
                Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
