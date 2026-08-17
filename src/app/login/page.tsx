
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck, Loader2, Eye, EyeOff, BadgeCheck,
  Users, Building2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { VBLLogo } from "@/components/ui/vbl-logo";

import { STAFF_ROLES, ROLES } from "@/lib/roles";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { refresh } = useAuth();

  const completeLogin = async (user: { email: string; role: string }) => {
    try {
      await refresh();
    } catch {
      // ignore
    }
    toast({ title: "Welcome back!", description: `Signed in as ${user.email}` });
    const from = searchParams.get("from");
    // A sales agent's home is their own portal — they have no admin access
    // and the consumer feed isn't where their work lives.
    const target = user.role === ROLES.SALES_AGENT
      ? "/agent"
      : STAFF_ROLES.includes(user.role)
        ? "/admin"
        : (from && from !== "/login" ? from : "/");
    window.location.href = target;
  };

  /**
   * Posts the credentials, retrying once on a gateway-level failure.
   *
   * The serverless container that runs the API sleeps when idle, and a cold
   * start occasionally takes long enough for the gateway to give up and
   * return 502/503/504 — measured at ~7s against a ~0.2s median. The request
   * never reached the login logic, so replaying it is safe: a failed attempt
   * creates no session and has no side effect. The second attempt lands on
   * the container the first one just woke.
   *
   * Deliberately NOT retried on 4xx — those are real answers (wrong password,
   * validation) and repeating them would only slow the user down.
   */
  const postLoginWithRetry = async (credentials: { email: string; password: string }) => {
    const send = () =>
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

    let res: Response;
    try {
      res = await send();
    } catch {
      // Connection dropped outright — the same cold-start symptom.
      await new Promise((r) => setTimeout(r, 1200));
      return send();
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      await new Promise((r) => setTimeout(r, 1200));
      return send();
    }
    return res;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await postLoginWithRetry({ email, password });
      const data = await res.json();
      if (res.ok && data.requiresTwoFactor) {
        setChallengeToken(data.challengeToken);
      } else if (res.ok) {
        await completeLogin(data.user);
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Login Failed", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: twoFactorCode }),
      });
      const data = await res.json();
      if (res.ok) {
        await completeLogin(data.user);
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid code. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Verification Failed", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (challengeToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <ShieldCheck className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Two-factor verification</h2>
            <p className="mt-2 text-gray-500 text-sm">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <form className="space-y-5" onSubmit={handleVerifyTwoFactor}>
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="123456"
              className="h-14 rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-center text-2xl tracking-[0.3em] text-gray-900"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              maxLength={10}
            />
            <Button
              type="submit"
              disabled={isLoading || twoFactorCode.length < 6}
              className="w-full h-12 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-base"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => { setChallengeToken(null); setTwoFactorCode(""); }}
              className="w-full text-sm text-gray-400 hover:text-gray-600"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}>
        {/* decorative rings */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full border border-yellow-500/10" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full border border-yellow-500/10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full border border-blue-500/10 -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 flex flex-col h-full p-14 justify-between">
          {/* Logo */}
          <div>
            <VBLLogo variant="full" size="lg" theme="light" />
          </div>

          {/* Hero text */}
          <div className="space-y-6">
            <div>
              <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
                Where ambitious<br />
                <span className="text-yellow-400">businesses</span><br />
                connect.
              </h1>
              <p className="mt-5 text-lg text-slate-400 leading-relaxed max-w-sm">
                A verification-first platform for companies that want cleaner introductions and stronger partner trust.
              </p>
            </div>

            {/* Platform highlights */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BadgeCheck, label: "Verification-first", value: "Built in" },
                { icon: Users, label: "Partner discovery", value: "Focused" },
                { icon: Building2, label: "Business profiles", value: "Structured" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 text-center">
                  <Icon className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-xl font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Positioning note */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                Built for teams that want a cleaner path to due diligence, profile discovery, and business introductions.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                  <span className="text-yellow-400 font-bold text-xs">VB</span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold">Verification-first networking</p>
                  <p className="text-slate-500 text-xs">Built for business accounts</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-xs">© 2026 VerifiedBizLink. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10 justify-center">
            <VBLLogo variant="full" size="md" theme="dark" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-gray-500">Sign in to your account to continue</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <div className="flex gap-2">
                  <Link href="/forgot-username" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 hover:underline">
                    Forgot username?
                  </Link>
                  <span className="text-xs text-gray-300">|</span>
                  <Link href="/forgot-password" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors pr-12 text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-base shadow-lg shadow-yellow-400/30 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Sign In Securely
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-bold text-yellow-600 hover:text-yellow-700 hover:underline">
                Create one for free
              </Link>
            </p>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-500">Staff &amp; Admin accounts</span> are redirected
              to the Admin Hub automatically upon sign-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


