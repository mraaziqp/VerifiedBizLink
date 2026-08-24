'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { startPayfastCheckout } from '@/lib/payfast-checkout';

interface Status {
  hasBusiness: boolean;
  verified: boolean;
  verificationPaid: boolean;
  canPurchase: boolean;
  feeRand: number;
}

const BENEFITS = [
  'The gold verified badge on your public profile',
  'Higher placement in search and discovery',
  'CIPC and supporting document review by our team',
  'Yours permanently — not a monthly charge',
];

/**
 * The once-off verification fee, offered where people actually look.
 *
 * This was only ever reachable from a single banner on one tab of the
 * business dashboard, and never appeared on /pricing — the page everyone goes
 * to when they want to buy something. A product nobody can find does not sell.
 *
 * Deliberately distinct from the monthly "Verified Business" PLAN: this buys
 * the badge outright, that one is a subscription with its own features.
 */
export function VerificationOffer({
  variant = 'full',
  className = '',
}: {
  /** 'full' for a standalone section, 'compact' inside an existing card. */
  variant?: 'full' | 'compact';
  className?: string;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/businesses/verification', { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load();
      if (!active) return;
      if (data) setStatus(data);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [load]);

  const pay = async () => {
    setPaying(true);
    const fee = status?.feeRand ?? 49;
    const result = await startPayfastCheckout({
      amount: fee,
      description: `VerifiedBizLink Verification Fee (R${fee} once-off)`,
      purchaseType: 'verification_fee',
    });
    // Only reached when the checkout could not be started.
    toast({ title: 'Payment error', description: result.error, variant: 'destructive' });
    setPaying(false);
  };

  if (!loaded || !status?.hasBusiness) return null;

  if (status.verified || status.verificationPaid) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 ${className}`}>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-900">
          Your business is <span className="font-bold">verified</span> — the gold badge is
          active on your profile.
        </p>
      </div>
    );
  }

  if (!status.canPurchase) return null;

  const fee = status.feeRand;

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-3 rounded-2xl border-2 border-yellow-300 bg-yellow-50/70 p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 shrink-0 text-yellow-600" />
          <div>
            <p className="font-bold text-gray-900">Get the verified badge — R{fee} once-off</p>
            <p className="text-xs text-gray-600">
              A single payment, not a subscription. Includes document review.
            </p>
          </div>
        </div>
        <Button
          onClick={pay}
          disabled={paying}
          className="h-11 shrink-0 gap-2 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Pay R{fee}
        </Button>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50/60 to-white p-6 shadow-sm sm:p-8 ${className}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-extrabold tracking-wide text-slate-950">
            ONCE-OFF · NOT A SUBSCRIPTION
          </span>
          <h2 className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <ShieldCheck className="h-7 w-7 text-yellow-600" />
            Just want the verified badge?
          </h2>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            You do not need a monthly plan to be verified. Pay once, get reviewed,
            and keep the badge — you can stay on the Free plan.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 rounded-2xl border border-yellow-300 bg-white p-6 text-center lg:w-56">
          <p className="text-4xl font-black text-gray-900">R{fee}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">once-off payment</p>
          <Button
            onClick={pay}
            disabled={paying}
            className="mt-4 h-12 w-full gap-2 bg-yellow-400 text-base font-bold text-gray-900 hover:bg-yellow-300"
          >
            {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
            Get Verified
          </Button>
        </div>
      </div>
    </div>
  );
}
