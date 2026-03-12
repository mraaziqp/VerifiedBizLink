
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck, Building2, User, Loader2, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function SignupPage() {
  const [role, setRole] = useState<"customer" | "business" | "shareholder">("customer");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
    regNumber: "",
    inviteCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAuth();

  const heroImage = PlaceHolderImages.find(img => img.id === 'auth-hero');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          role,
          companyName: formData.companyName,
          regNumber: formData.regNumber,
          inviteCode: formData.inviteCode,
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

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-gray-900 overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover opacity-60"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-gray-900/80 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary p-2 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-gray-900" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">VerifiedBizLink</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Build your professional reputation.
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Join the network of thousands of vetted companies and secure your business future.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
            <p className="mt-2 text-gray-600 font-medium">Join the circle of trust today</p>
          </div>

          <div className="flex flex-col gap-6">
            <Tabs
              defaultValue="customer"
              className="w-full"
              onValueChange={(v) => setRole(v as any)}
            >
              <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 h-14 rounded-2xl">
                <TabsTrigger value="customer" className="rounded-xl font-bold flex gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="business" className="rounded-xl font-bold flex gap-2">
                  <Building2 className="h-4 w-4" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="shareholder" className="rounded-xl font-bold flex gap-1 text-amber-700">
                  <Crown className="h-4 w-4" />
                  Shareholder
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    required
                    placeholder="John"
                    className="h-12 rounded-xl"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    required
                    placeholder="Doe"
                    className="h-12 rounded-xl"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </div>
              </div>

              {role === "business" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      required
                      placeholder="Acme Corp"
                      className="h-12 rounded-xl"
                      value={formData.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-number">Registration Number (CIPC)</Label>
                    <Input
                      id="reg-number"
                      required
                      placeholder="2024/123456/07"
                      className="h-12 rounded-xl"
                      value={formData.regNumber}
                      onChange={(e) => updateField("regNumber", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {role === "shareholder" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 p-4 border border-amber-200 bg-amber-50 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <Crown className="h-4 w-4" />
                    Shareholder Access — Invite Code Required
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-code">Shareholder Invite Code</Label>
                    <Input
                      id="invite-code"
                      required
                      placeholder="Enter your invite code"
                      className="h-12 rounded-xl border-amber-300 bg-white"
                      value={formData.inviteCode}
                      onChange={(e) => updateField("inviteCode", e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-amber-700">
                    This creates a full administrator account with platform-wide access.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="h-12 rounded-xl"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  className="h-12 rounded-xl"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                />
              </div>

              {/* POPI Notice */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2.5 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                <span>
                  We collect only your <strong>name, email, contact address</strong>, and (for businesses) <strong>company name & registration number</strong> — as required by the POPI Act. Your password is encrypted and never stored in plain text.
                </span>
              </div>

              {/* T&C Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                  className="mt-0.5"
                />
                <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                  I have read and agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-primary font-bold hover:underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-primary font-bold hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand how my data is collected and used in accordance with the POPI Act.
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !acceptedTerms}
                  className="w-full h-12 bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl text-base shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                </Button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-gray-600 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
