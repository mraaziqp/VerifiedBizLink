
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Building2, Loader2,
  Lock, Eye, EyeOff, CheckCircle2, Circle, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { registerBasicUser } from "@/app/actions/auth-actions";

type AccountRole = "customer" | "business";

// Customer = quick four-field signup (registerBasicUser); Business = full
// signup through /api/auth/signup with company details.
const ROLES: { value: AccountRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "customer", label: "Customer", icon: User, desc: "Browse and review verified businesses" },
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
    fullName: "",
    firstName: "",
    lastName: "",
    userType: "customer" as "customer" | "job_seeker",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    regNumber: "",
    industry: "",
    assistedSignup: false,
    assistedBy: "",
    assistedByUserId: "",
    website: "",
    linkedin: "",
    instagram: "",
    facebook: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [referral, setReferral] = useState<{ code: string; agentName: string } | null>(null);

  /**
   * Picks up ?ref=CODE from an agent's referral link or QR code.
   *
   * Read straight from the URL rather than through useSearchParams so the
   * page needs no Suspense boundary. The code is only used for display here —
   * the server resolves it again on submit and ignores anything the client
   * claims about who gets the commission.
   */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;
    let active = true;
    fetch(`/api/referral?code=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.valid) setReferral({ code: data.code, agentName: data.agentName });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Loaded so an assisted sign-up can be attributed to a real agent record
  // rather than a typed string. Falls back to free text if none exist yet.
  useEffect(() => {
    let active = true;
    fetch("/api/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data?.agents) setAgents(data.agents); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const { toast } = useToast();
  const { refresh } = useAuth();

  const strength = useMemo(() => getStrength(formData.password), [formData.password]);
  // The quick customer signup asks for four fields only, so there is no
  // confirm box to match; the password field has a show/hide toggle instead.
  const passwordsMatch =
    role === "customer" || formData.confirmPassword.length === 0 || formData.password === formData.confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "customer") {
      setIsLoading(true);
      try {
        const result = await registerBasicUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
        });
        if (result.success) {
          await refresh();
          toast({ title: "Welcome to VerifiedBizLink!", description: "We've emailed you a link to confirm your address — you can start right away." });
          window.location.href = result.redirectTo;
        } else {
          toast({ title: "Signup Failed", description: result.error, variant: "destructive" });
        }
      } catch {
        toast({ title: "Signup Failed", description: "Could not connect to server.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (role === "business" && !formData.industry) {
      toast({ title: "Select your business category", variant: "destructive" });
      return;
    }
    if (role === "business" && formData.assistedSignup && !formData.assistedBy.trim()) {
      toast({ title: "Enter who assisted this sign up", variant: "destructive" });
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
          fullName: role === "business" ? (formData.companyName.trim() || "Business Owner") : formData.fullName.trim(),
          role,
          companyName: formData.companyName,
          regNumber: formData.regNumber,
          industry: formData.industry,
          assistedSignup: formData.assistedSignup,
          assistedBy: formData.assistedSignup ? formData.assistedBy.trim() : "",
          assistedByUserId: formData.assistedSignup ? formData.assistedByUserId || null : null,
          // Server re-resolves this; sending it is what links the signup to
          // the agent whose link or QR code brought them here.
          referralCode: referral?.code ?? null,
          website: formData.website,
          socialLinks: {
            linkedin: formData.linkedin,
            instagram: formData.instagram,
            facebook: formData.facebook,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        toast({ title: "Account Created!", description: "Welcome to VerifiedBizLink. Next, choose the plan that suits your business." });
        // Business profile was created with the account: next step is choosing a plan.
        window.location.href = role === "business" ? "/pricing?welcome=business" : "/onboarding";
      } else {
        toast({ title: "Signup Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Signup Failed", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) =>
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
              <VBLLogo variant="full" size="md" theme="dark" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
              <p className="mt-1.5 text-gray-500">Set up your profile and begin the verification process</p>
            </div>

            {/* Role selector */}
            <div className={cn("grid gap-3", ROLES.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
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
                  <span className="text-[10px] text-gray-500 leading-tight hidden sm:block">{desc}</span>
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleSignup} suppressHydrationWarning>
              {/* Account holder's own name - only for Customer accounts */}
              {role === "customer" && (
                <div className="space-y-4" suppressHydrationWarning>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700 mb-1.5">What brings you here?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "customer", label: "Shopping & reviews" },
                        { value: "job_seeker", label: "Looking for work" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={formData.userType === opt.value}
                          onClick={() => setFormData((prev) => ({ ...prev, userType: opt.value }))}
                          className={cn(
                            "h-11 rounded-xl border-2 px-2 text-sm font-semibold transition-colors",
                            formData.userType === opt.value
                              ? "border-yellow-400 bg-yellow-50 text-gray-900"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="first-name" className="text-sm font-semibold text-gray-700">First name</Label>
                      <Input
                        id="first-name"
                        required
                        autoComplete="given-name"
                        placeholder="Jane"
                        className="h-11 rounded-xl border-gray-200 bg-white"
                        value={formData.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last-name" className="text-sm font-semibold text-gray-700">Last name</Label>
                      <Input
                        id="last-name"
                        required
                        autoComplete="family-name"
                        placeholder="Dlamini"
                        className="h-11 rounded-xl border-gray-200 bg-white"
                        value={formData.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Business fields */}
              {role === "business" && (
                <div className="space-y-4 p-4 rounded-2xl border border-blue-100 bg-blue-50/50">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="industry" className="text-sm font-semibold text-gray-700">Category</Label>
                    <select
                      id="industry"
                      required
                      className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                      value={formData.industry}
                      onChange={(e) => update("industry", e.target.value)}
                    >
                      <option value="">Select a category</option>
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400">Helps customers find you when browsing by category.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Assisted Sign Up?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => update("assistedSignup", false)}
                        className={cn(
                          "h-11 rounded-xl border-2 text-sm font-bold transition-all",
                          !formData.assistedSignup
                            ? "border-yellow-400 bg-yellow-50 text-gray-900"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => update("assistedSignup", true)}
                        className={cn(
                          "h-11 rounded-xl border-2 text-sm font-bold transition-all",
                          formData.assistedSignup
                            ? "border-yellow-400 bg-yellow-50 text-gray-900"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        Yes
                      </button>
                    </div>
                    {/* Arrived via an agent's link or QR — attribution is already
                        settled, so the manual picker would only invite mistakes. */}
                    {referral && (
                      <div className="mt-2 rounded-xl border border-green-200 bg-green-50 p-3">
                        <p className="text-sm font-semibold text-green-800">
                          Referred by {referral.agentName}
                        </p>
                        <p className="mt-0.5 text-xs text-green-700">
                          Your sign up will be credited to them automatically. Code {referral.code}.
                        </p>
                      </div>
                    )}
                    {formData.assistedSignup && !referral && (
                      <div className="pt-1.5">
                        <Label htmlFor="assisted-by" className="text-sm font-semibold text-gray-700">Assisted By</Label>
                        {agents.length > 0 ? (
                          <>
                            {/* Picking a real agent records assisted_by_user_id,
                                which is what commission is calculated from. A
                                typed name alone can never be paid out on. */}
                            <select
                              id="assisted-by"
                              required
                              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 mt-1.5 text-sm text-gray-900"
                              value={formData.assistedByUserId}
                              onChange={(e) => {
                                const picked = agents.find((a) => a.id === e.target.value);
                                update("assistedByUserId", e.target.value);
                                update("assistedBy", picked?.name ?? "");
                              }}
                            >
                              <option value="">Select the agent who assisted…</option>
                              {agents.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            {/* Fallback for when the agent list didn't load.
                                The value is resolved server-side against
                                referral code, name and email — a name that
                                matches nobody is refused rather than stored
                                as text no commission can ever be paid on. */}
                            <Input
                              id="assisted-by"
                              required
                              placeholder="Referral code or agent's full name"
                              className="h-11 rounded-xl border-gray-200 bg-white mt-1.5"
                              value={formData.assistedBy}
                              onChange={(e) => update("assistedBy", e.target.value)}
                            />
                            <p className="mt-1.5 text-xs text-gray-500">
                              Ask them for their referral code — it makes sure they
                              get credited for helping you.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="website" className="text-sm font-semibold text-gray-700">Website <span className="font-normal text-gray-400">(optional)</span></Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.co.za"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.website}
                      onChange={(e) => update("website", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Social Media <span className="font-normal text-gray-400">(optional)</span></Label>
                    <Input
                      placeholder="LinkedIn URL or handle"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.linkedin}
                      onChange={(e) => update("linkedin", e.target.value)}
                    />
                    <Input
                      placeholder="Instagram @handle"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                    />
                    <Input
                      placeholder="Facebook page URL or handle"
                      className="h-11 rounded-xl border-gray-200 bg-white"
                      value={formData.facebook}
                      onChange={(e) => update("facebook", e.target.value)}
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
                      strength <= 2 ? "text-red-500" : strength === 3 ? "text-yellow-700" : "text-green-600"
                    )}>
                      {strengthLabel[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password — business accounts only */}
              {role === "business" && <div className="space-y-1.5">
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
              </div>}

              {/* POPI notice */}
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span>
                  {role === "customer" ? (
                    <>We collect only your <strong>name &amp; email</strong>.</>
                  ) : (
                    <>We collect only your <strong>company name, email &amp; CIPC reg number</strong>.</>
                  )}{" "}
                  Passwords are bcrypt-hashed. POPI Act compliant.
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
                  <Link href="/terms" target="_blank" className="font-bold text-yellow-700 hover:underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="font-bold text-yellow-700 hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand how my data is used under the POPI Act.
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !acceptedTerms || !passwordsMatch || (role === "business" && !formData.industry)}
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
              <Link href="/login" className="font-bold text-yellow-700 hover:text-yellow-800 hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

