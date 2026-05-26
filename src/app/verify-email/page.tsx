"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VBLLogo } from "@/components/ui/vbl-logo";
import Link from "next/link";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const success = params.get("success") === "1";
  const error = params.get("error");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) setResent(true);
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push("/"), 4000);
      return () => clearTimeout(t);
    }
  }, [success, router]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border p-8 text-center space-y-5">
      {!success && !error && (
        <>
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              We sent a verification link to your email address. Click it to verify your account.
            </p>
          </div>
          <p className="text-xs text-gray-400">Didn&apos;t receive it? Check your spam folder.</p>
          {!resent ? (
            <Button variant="outline" className="rounded-xl font-bold" onClick={handleResend} disabled={resending}>
              {resending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : "Resend verification email"}
            </Button>
          ) : (
            <p className="text-sm font-semibold text-green-600">Verification email resent!</p>
          )}
          <Link href="/" className="block text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Continue to app →
          </Link>
        </>
      )}

      {success && (
        <>
          <div className="flex justify-center">
            <div className="p-4 bg-green-100 rounded-2xl">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="text-sm text-gray-500 mt-2">Your email address has been confirmed. Redirecting you now…</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Taking you to your feed…
          </div>
        </>
      )}

      {error && (
        <>
          <div className="flex justify-center">
            <div className="p-4 bg-red-50 rounded-2xl">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verification failed</h1>
            <p className="text-sm text-gray-500 mt-2">
              {error === "invalid" ? "This verification link is invalid or has already been used." : "Something went wrong. Please try again."}
            </p>
          </div>
          <Button className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl" onClick={handleResend} disabled={resending}>
            {resending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : "Send a new verification email"}
          </Button>
          {resent && <p className="text-sm font-semibold text-green-600">New link sent! Check your inbox.</p>}
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <VBLLogo variant="full" size="md" theme="dark" className="mx-auto" />
        </div>
        <Suspense fallback={<div className="bg-white rounded-3xl shadow-sm border p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
