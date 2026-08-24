'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CheckCircle2, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard } from '@/components/shared/glass-ui';
import { AgentReferralField } from '@/components/billing/agent-referral-field';
import { startPayfastCheckout } from '@/lib/payfast-checkout';
import { VERIFICATION_FEE_RAND } from '@/lib/tiers';
import Link from 'next/link';

export default function BusinessVerifyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verificationPaid, setVerificationPaid] = useState(false);
  // Server-supplied so the page can never quote a price the webhook rejects.
  const [feeRand, setFeeRand] = useState(VERIFICATION_FEE_RAND);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'business' && !['admin', 'banker', 'lawyer', 'finance_admin', 'compliance_admin'].includes(user.role))) {
      router.replace('/');
      return;
    }
    // /api/businesses/packages does not select verification_paid, so this
    // check read undefined every time and someone who had already paid was
    // shown the pay button again. This endpoint reports it properly.
    fetch('/api/businesses/verification', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.verificationPaid || data?.verified) setVerificationPaid(true);
        if (typeof data?.feeRand === 'number') setFeeRand(data.feeRand);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  const handlePayment = async () => {
    setPaying(true);
    const result = await startPayfastCheckout({
      amount: feeRand,
      description: `VerifiedBizLink Verification Fee (R${feeRand} once-off)`,
      purchaseType: 'verification_fee',
    });
    // Only reached if the checkout could not be started — success navigates.
    toast({ title: 'Payment error', description: result.error, variant: 'destructive' });
    setPaying(false);
  };

  if (authLoading || loading) {
    return (
      <GlassBackground>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/business/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <GlassCard>
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>

            {verificationPaid ? (
              <>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">You&apos;re Verified!</h1>
                  <p className="mt-2 text-gray-500">Your business displays the trusted verified badge.</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-800 font-semibold">Verification Complete</p>
                  <p className="text-green-700 text-sm mt-1">The verified badge is active on your public profile.</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">Get Verified</h1>
                  <p className="mt-2 text-gray-500 max-w-md mx-auto">
                    Pay a once-off fee of <span className="font-bold text-gray-900">R{feeRand}</span> to get the verified badge on your business profile. Build trust with customers instantly.
                  </p>
                </div>

                <div className="grid gap-4 text-left max-w-sm mx-auto">
                  {[
                    'Verified badge on your profile',
                    'Higher visibility in search results',
                    'Customers trust verified businesses more',
                    'One-time payment — no recurring fees',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-yellow-500 shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-6">
                  <p className="text-4xl font-extrabold text-gray-900">R{feeRand}</p>
                  <p className="text-sm text-gray-500 mt-1">Once-off payment</p>
                </div>

                {/* Credit the advisor before paying — after the payment lands
                    the commission has already been calculated without them. */}
                <AgentReferralField className="max-w-sm mx-auto text-left" />

                <Button
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full max-w-sm h-14 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-lg shadow-lg shadow-yellow-400/30"
                >
                  {paying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" /> Pay R{feeRand} &amp; Get Verified
                    </span>
                  )}
                </Button>

                <p className="text-xs text-gray-400">Secure payment via PayFast. You can continue using the free tier without verification.</p>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </GlassBackground>
  );
}
