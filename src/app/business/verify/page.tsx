'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CheckCircle2, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard } from '@/components/shared/glass-ui';
import Link from 'next/link';

export default function BusinessVerifyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verificationPaid, setVerificationPaid] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'business' && !['admin', 'banker', 'lawyer', 'finance_admin', 'compliance_admin'].includes(user.role))) {
      router.replace('/');
      return;
    }
    // Check verification status
    fetch('/api/businesses/packages')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.business?.verification_paid) setVerificationPaid(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const res = await fetch('/api/payfast/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 49,
          description: 'VerifiedBizLink Verification Fee',
          purchaseType: 'verification_fee',
        }),
      });
      const data = await res.json();
      if (res.ok && data.payfastUrl) {
        // Create and submit PayFast form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfastUrl;
        Object.entries(data.data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        const sig = document.createElement('input');
        sig.type = 'hidden';
        sig.name = 'signature';
        sig.value = data.signature;
        form.appendChild(sig);
        document.body.appendChild(form);
        form.submit();
      } else {
        toast({ title: 'Payment Error', description: data.error || 'Could not start payment', variant: 'destructive' });
        setPaying(false);
      }
    } catch {
      toast({ title: 'Connection Error', description: 'Could not reach payment server', variant: 'destructive' });
      setPaying(false);
    }
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
                    Pay a once-off fee of <span className="font-bold text-gray-900">R49</span> to get the verified badge on your business profile. Build trust with customers instantly.
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
                  <p className="text-4xl font-extrabold text-gray-900">R49</p>
                  <p className="text-sm text-gray-500 mt-1">Once-off payment</p>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full max-w-sm h-14 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-lg shadow-lg shadow-yellow-400/30"
                >
                  {paying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" /> Pay R49 &amp; Get Verified
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
