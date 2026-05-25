
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Building2, User, Loader2,
  Lock, Eye, EyeOff, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { VBLLogo } from "@/components/ui/vbl-logo";

type AccountRole = "customer" | "business";

const ROLES: { value: AccountRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "customer", label: "Customer", icon: User, desc: "Browse and connect with business profiles" },
  { value: "business", label: "Business", icon: Building2, desc: "Set up your company profile for review" },
];

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

const strengthLabel = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-lime-500", "bg-green-500"];

export default function SignupPage() {
  const [role, setRole] = useState<AccountRole>("customer");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    regNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAuth();

  const strength = useMemo(() => getStrength(formData.password), [formData.password]);
  const passwordsMatch =
    formData.confirmPassword.length === 0 || formData.password === formData.confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          role,
          companyName: formData.companyName,
          regNumber: formData.regNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        toast({ title: "Account Created!", description: "Welcome to VerifiedBizLink." });
        router.push("/onboarding");
      } else {
        toast({ title: "Signup Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Signup Failed", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
      >
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full border border-yellow-500/10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full border border-blue-500/10 -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 flex flex-col h-full p-14 justify-between">
          <div>
            <VBLLogo variant="full" size="lg" theme="light" />
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
                Build your<br />
                professional<br />
                <span className="text-yellow-400">profile.</span>
              </h1>
              <p className="mt-4 text-slate-400 leading-relaxed max-w-xs">
                Start with a business profile designed for verification, discovery, and future partnerships.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Business identity and document review",
                "CIPC and supporting file checks",
                "Profile details that support due diligence",
                "POPI Act compliant data handling",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-yellow-400 shrink-0" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-bold text-sm">Your data is protected</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                We collect only what&apos;s needed. Passwords are bcrypt-hashed. All connections are
                encrypted. Full POPI Act compliance.
              </p>
            </div>
          </div>

          <p className="text-slate-600 text-xs">© 2026 VerifiedBizLink. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="min-h-full flex items-center justify-center p-8 lg:p-14">
          <div className="w-full max-w-[480px] space-y-6">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 justify-center">
              <VBLLogo variant="full" size="sm" theme="dark" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
              <p className="mt-1.5 text-gray-500">Set up your profile and begin the verification process</p>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center transition-all",
                    role === value
                      ? "border-yellow-400 bg-yellow-50 shadow-md shadow-yellow-400/20"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center",
                    role === value ? "bg-yellow-400 text-gray-900" : "bg-gray-200 text-gray-500"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    role === value ? "text-gray-900" : "text-gray-500"
                  )}>{label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">{desc}</span>
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleSignup}>
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name" className="text-sm font-semibold text-gray-700">First Name</Label>
                  <Input
                    id="first-name"
                    required
                    placeholder="John"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                    value={formData.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name" className="text-sm font-semibold text-gray-700">Last Name</Label>
                  <Input
                    id="last-name"
                    required
                    placeholder="Doe"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                    value={formData.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                </div>
              </div>

              {/* Business fields */}
              {role === "business" && (
                <div className="space-y-4 p-4 rounded-2xl border border-blue-100 bg-blue-50/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Business Details
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name" className="text-sm font-semibold text-gray-700">Company Name</Label>
                    <Input
                      id="company-name"
                      required
                      placeholder="Acme Corp Pty Ltd"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.companyName}
                      onChange={(e) => update("companyName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-number" className="text-sm font-semibold text-gray-700">CIPC Registration Number</Label>
                    <Input
                      id="reg-number"
                      required
                      placeholder="2024/123456/07"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.regNumber}
                      onChange={(e) => update("regNumber", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white pr-11"
                    value={formData.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {formData.password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            n <= strength ? strengthColor[strength] : "bg-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn(
                      "text-xs font-semibold",
                      strength <= 2 ? "text-red-500" : strength === 3 ? "text-yellow-600" : "text-green-600"
                    )}>
                      {strengthLabel[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className={cn(
                      "h-11 rounded-xl bg-gray-50 focus:bg-white pr-11",
                      !passwordsMatch ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                    )}
                    value={formData.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {formData.confirmPassword.length > 0 && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {!passwordsMatch && (
                  <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
                )}
              </div>

              {/* POPI notice */}
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span>
                  We collect only your <strong>name & email</strong>
                  {role === "business" && <>, <strong>company name & CIPC reg number</strong></>}. Passwords
                  are bcrypt-hashed. POPI Act compliant.
                </span>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                  className="mt-0.5 border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-gray-900"
                />
                <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="font-bold text-yellow-600 hover:underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="font-bold text-yellow-600 hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand how my data is used under the POPI Act.
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !acceptedTerms || !passwordsMatch}
                className="w-full h-12 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-base shadow-lg shadow-yellow-400/30 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Create Account
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-yellow-600 hover:text-yellow-700 hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

