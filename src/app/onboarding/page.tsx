"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, User, Building2, FileText, Lock, Globe, ArrowRight,
  CheckCircle2, ChevronRight, Megaphone, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { id: 1, title: "Welcome", subtitle: "You're in the right place" },
  { id: 2, title: "About VerifiedBizLink", subtitle: "What we do" },
  { id: 3, title: "Your Privacy", subtitle: "How we protect your data" },
  { id: 4, title: "Why We Collect Data", subtitle: "Transparency first" },
  { id: 5, title: "Your Rights", subtitle: "POPI Act — you're in control" },
  { id: 6, title: "Get Started", subtitle: "You're all set" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const router = useRouter();

  const progress = Math.round(((step - 1) / (STEPS.length - 1)) * 100);
  const currentStep = STEPS[step - 1];

  const handleNext = () => {
    if (step < STEPS.length) setStep((s) => s + 1);
    else router.push("/");
  };

  const handleSkip = () => router.push("/");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900 text-sm">VerifiedBizLink</span>
        </div>
        <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          Skip for now
        </button>
      </header>

      {/* Progress bar */}
      <div className="px-6">
        <Progress value={progress} className="h-1.5 rounded-full" />
        <div className="flex justify-between text-xs text-gray-400 font-medium mt-1.5">
          <span>Step {step} of {STEPS.length}</span>
          <span>{progress}% complete</span>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">
                  Welcome{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! 👋
                </h1>
                <p className="mt-3 text-gray-500 font-medium text-lg">
                  You've joined South Africa's most trusted business verification network.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: ShieldCheck, label: "Verified Trust Badges", color: "text-green-600 bg-green-50" },
                  { icon: Users, label: "Professional Network", color: "text-blue-600 bg-blue-50" },
                  { icon: Building2, label: "Business Vetting", color: "text-purple-600 bg-purple-50" },
                  { icon: Globe, label: "Global Trade Ready", color: "text-yellow-600 bg-yellow-50" },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold">Our Platform</Badge>
                <h2 className="text-3xl font-extrabold text-gray-900">What is VerifiedBizLink?</h2>
                <p className="text-gray-500 font-medium">
                  A secure, compliance-first platform for South African businesses.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Business Verification",
                    desc: "We vet businesses through CIPC, VAT, identity and document checks — giving you a trusted Gold Verification badge.",
                    color: "text-green-600 bg-green-50",
                  },
                  {
                    icon: Users,
                    title: "Professional Networking",
                    desc: "Connect with verified businesses and professionals who have been screened for legitimacy and compliance.",
                    color: "text-blue-600 bg-blue-50",
                  },
                  {
                    icon: Megaphone,
                    title: "Business Advertising",
                    desc: "Promote your verified business to thousands of professionals. Boost and extend your ads to grow your reach.",
                    color: "text-purple-600 bg-purple-50",
                  },
                  {
                    icon: FileText,
                    title: "Compliance Management",
                    desc: "Our bankers and lawyers review your documents to ensure you meet all legal requirements.",
                    color: "text-yellow-600 bg-yellow-50",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Badge className="bg-green-100 text-green-700 border-green-200 font-bold">Your Privacy</Badge>
                <h2 className="text-3xl font-extrabold text-gray-900">How We Protect You</h2>
                <p className="text-gray-500 font-medium">
                  We comply with the POPI Act (Act 4 of 2013). Your data is yours.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: Lock,
                    title: "Encrypted Passwords",
                    desc: "Your password is hashed with bcrypt and never stored in plain text. We can't see it.",
                    color: "text-gray-600 bg-gray-100",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Secure Sessions",
                    desc: "We use HttpOnly, Secure cookies for session management — inaccessible to browser scripts.",
                    color: "text-green-600 bg-green-50",
                  },
                  {
                    icon: Globe,
                    title: "TLS Encryption",
                    desc: "All data transmitted between you and our servers is encrypted via TLS 1.3.",
                    color: "text-blue-600 bg-blue-50",
                  },
                  {
                    icon: Users,
                    title: "Role-Based Access",
                    desc: "Your data is only accessible to you and authorised staff. Admin actions are logged and audited.",
                    color: "text-purple-600 bg-purple-50",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 text-sm text-yellow-800">
                <strong>Data Breach Policy:</strong> If your data is ever compromised, we will notify you by email within 72 hours and report to the Information Regulator as required by law.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-bold">Transparency</Badge>
                <h2 className="text-3xl font-extrabold text-gray-900">Why We Collect Your Data</h2>
                <p className="text-gray-500 font-medium">
                  We only collect what is strictly necessary — nothing more.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">What We Collect</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">Why</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ["Email address", "Account login & communication"],
                      ["Full name", "Profile display & verification"],
                      ["Contact address", "Compliance & vetting requirements"],
                      ["Business name & Reg. No.", "Business verification (businesses only)"],
                      ["Hashed password", "Account security — unreadable after storage"],
                    ].map(([what, why], i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{what}</td>
                        <td className="px-4 py-3 text-gray-500">{why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-800">
                <strong>We do NOT collect:</strong> race, religion, health data, biometrics, financial account numbers, or any other sensitive information not required for platform operation.
              </div>
              <p className="text-xs text-gray-400 text-center">
                Read our full{" "}
                <Link href="/privacy" target="_blank" className="text-primary font-bold hover:underline">
                  Privacy Policy
                </Link>
                {" "}for complete details.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold">POPI Act</Badge>
                <h2 className="text-3xl font-extrabold text-gray-900">You Are in Control</h2>
                <p className="text-gray-500 font-medium">
                  Under the Protection of Personal Information Act, you have legal rights to your data.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: "Access Your Data", desc: "Download or view all personal data we hold about you.", icon: FileText },
                  { title: "Edit Your Data", desc: "Update your profile, contact details, and business information at any time from your Settings page.", icon: User },
                  { title: "Delete Your Account", desc: "Request full deletion of your account and data. We'll process it within 30–90 days. You can cancel within 7 days.", icon: Lock },
                  { title: "Contact Us", desc: "Reach our Data Protection Officer at privacy@verifiedbizlink.co.za. We respond within 24 hours.", icon: Globe },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border">
                    <div className="p-2.5 rounded-xl flex-shrink-0 bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">You're all set!</h2>
                <p className="mt-3 text-gray-500 font-medium text-lg">
                  Your account is ready. Here's what to do next:
                </p>
              </div>
              <div className="space-y-3 text-left">
                {[
                  { icon: User, label: "Complete your profile in Settings", href: "/settings" },
                  { icon: Building2, label: "Start your business verification", href: "/vetting" },
                  { icon: Users, label: "Discover verified connections", href: "/network" },
                ].map((item, i) => (
                  <Link key={i} href={item.href}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-bold text-gray-800 text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer nav */}
      <div className="px-6 py-6 border-t bg-white">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-xl font-bold text-gray-500 hover:text-gray-900"
          >
            Back
          </Button>
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`h-2 rounded-full transition-all ${step === s.id ? "w-6 bg-primary" : step > s.id ? "w-2 bg-primary/40" : "w-2 bg-gray-200"}`}
              />
            ))}
          </div>
          <Button
            onClick={handleNext}
            className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl gap-2 px-6"
          >
            {step === STEPS.length ? "Enter Platform" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
