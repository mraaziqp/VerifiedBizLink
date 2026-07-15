"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, User, Building2, FileText, Lock, Globe, ArrowRight,
  CheckCircle2, ChevronRight, Users, Star, MapPin, Briefcase,
  Zap, Award, TrendingUp, Package, Sparkles, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  "Agriculture & Farming","Construction & Infrastructure","Education & Training",
  "Finance & Insurance","Food & Beverage","Healthcare & Medical",
  "Information Technology","Legal & Compliance","Logistics & Transport",
  "Manufacturing","Media & Marketing","Mining & Resources",
  "Retail & E-commerce","Real Estate & Property","Renewable Energy",
  "Tourism & Hospitality","Wholesale & Distribution","Other",
];

const SERVICES = [
  "Accounting & Bookkeeping","Business Consulting","Cloud & Software Solutions",
  "Compliance & Regulatory","Digital Marketing","Financial Services",
  "HR & Recruitment","Legal Services","Logistics & Courier",
  "Manufacturing & Production","Property Management","Security Services",
  "Supply Chain","Training & Development","Web Design & Development",
];

const SA_PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo",
  "Mpumalanga","North West","Northern Cape","Western Cape",
];

// Presentation metadata per tier key — prices and features come live from
// /api/tiers (admin-managed), this just controls how each card looks.
const PACKAGE_STYLES: Record<string, { color: string; activeColor: string; badge: string | null; badgeColor: string }> = {
  free: { color: "border-gray-200 bg-gray-50", activeColor: "border-gray-400 bg-gray-100", badge: null, badgeColor: "" },
  standard: { color: "border-blue-200 bg-blue-50", activeColor: "border-blue-500 bg-blue-100", badge: "Popular", badgeColor: "bg-blue-500" },
  premium: { color: "border-yellow-200 bg-yellow-50", activeColor: "border-yellow-400 bg-yellow-100", badge: "Best Value", badgeColor: "bg-yellow-500" },
};
const PACKAGE_ORDER = ["free", "standard", "premium"];

interface ApiTier {
  key: string;
  name: string;
  price: number;
  features: string[];
}

const CUSTOMER_STEPS = [
  { id: 1, title: "Welcome", subtitle: "You're in the right place" },
  { id: 2, title: "Your Interests", subtitle: "Tell us what matters to you" },
  { id: 3, title: "Services You Need", subtitle: "We'll personalise your experience" },
  { id: 4, title: "Your Location", subtitle: "Find local businesses near you" },
  { id: 5, title: "Privacy & Rights", subtitle: "POPI Act — you're in control" },
  { id: 6, title: "All Set!", subtitle: "Your feed is ready" },
];

const BUSINESS_STEPS = [
  { id: 1, title: "Welcome", subtitle: "Your business journey starts here" },
  { id: 2, title: "Free Trial", subtitle: "2 weeks of Premium — on us" },
  { id: 3, title: "Choose a Package", subtitle: "Pick the right plan for you" },
  { id: 4, title: "Documents Required", subtitle: "What you'll need to get verified" },
  { id: 5, title: "Privacy & Compliance", subtitle: "POPI Act compliant" },
  { id: 6, title: "All Set!", subtitle: "Start your verification" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("free");
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<ApiTier[]>(
    PACKAGE_ORDER.map((key) => ({ key, name: key, price: 0, features: [] }))
  );

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const tiers: ApiTier[] = data?.tiers || [];
        const ordered = PACKAGE_ORDER
          .map((key) => tiers.find((t) => t.key === key))
          .filter((t): t is ApiTier => !!t);
        if (ordered.length) setPackages(ordered);
      })
      .catch(() => {});
  }, []);

  const isBusiness = user?.role === "business";
  const STEPS = isBusiness ? BUSINESS_STEPS : CUSTOMER_STEPS;
  const totalSteps = STEPS.length;
  const progress = Math.round(((step - 1) / (totalSteps - 1)) * 100);
  const currentStep = STEPS[step - 1];
  const firstName = user?.fullName?.split(" ")[0] || "";

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : prev.length < 5 ? [...prev, ind] : prev
    );
  };

  const toggleService = (svc: string) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : prev.length < 6 ? [...prev, svc] : prev
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (isBusiness) {
        await fetch("/api/businesses/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageType: selectedPackage, onboardingCompleted: true }),
        });
        router.push("/vetting");
      } else {
        await fetch("/api/users/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industries: selectedIndustries,
            services: selectedServices,
            province: selectedProvince,
            interests: selectedIndustries,
          }),
        });
        router.push("/");
      }
    } catch {
      toast({ title: "Could not save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) setStep((s) => s + 1);
    else handleFinish();
  };

  const handleSkip = () => {
    if (isBusiness) router.push("/vetting");
    else router.push("/");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-1.5 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900 text-sm">VerifiedBizLink</span>
        </div>
        <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          Skip for now
        </button>
      </header>

      <div className="px-6 pt-4">
        <Progress value={progress} className="h-1.5 rounded-full" />
        <div className="flex justify-between text-xs text-gray-400 font-medium mt-1.5">
          <span>{currentStep.title}</span>
          <span>Step {step} of {totalSteps}</span>
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center p-6 pt-8 overflow-y-auto">
        <div className="w-full max-w-lg">

          {!isBusiness && (
            <>
              {step === 1 && (
                <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                      <User className="h-10 w-10 text-yellow-600" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">
                      Welcome{firstName ? `, ${firstName}` : ""}! 👋
                    </h1>
                    <p className="mt-3 text-gray-500 font-medium text-lg">Let&apos;s personalise your VerifiedBizLink experience.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { icon: Star, label: "Personalised Feed", color: "text-yellow-600 bg-yellow-50" },
                      { icon: Users, label: "Verified Network", color: "text-blue-600 bg-blue-50" },
                      { icon: Briefcase, label: "Relevant Businesses", color: "text-green-600 bg-green-50" },
                      { icon: MapPin, label: "Local Discovery", color: "text-purple-600 bg-purple-50" },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-2xl border flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${item.color}`}><item.icon className="h-4 w-4" /></div>
                        <span className="text-sm font-bold text-gray-800">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">This takes about 2 minutes. You can skip any step.</p>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-bold mb-2">Your Interests</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Which industries interest you?</h2>
                    <p className="text-gray-500 mt-1 text-sm">Select up to 5. We&apos;ll show you relevant businesses and posts.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((ind) => {
                      const active = selectedIndustries.includes(ind);
                      return (
                        <button key={ind} onClick={() => toggleIndustry(ind)}
                          className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
                            active ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400")}>
                          {active && <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-0.5" />}{ind}
                        </button>
                      );
                    })}
                  </div>
                  {selectedIndustries.length > 0 && (
                    <p className="text-xs text-green-600 font-semibold">{selectedIndustries.length} selected (max 5)</p>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold mb-2">Services</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">What services are you looking for?</h2>
                    <p className="text-gray-500 mt-1 text-sm">Select up to 6. We&apos;ll connect you with the right providers.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((svc) => {
                      const active = selectedServices.includes(svc);
                      return (
                        <button key={svc} onClick={() => toggleService(svc)}
                          className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
                            active ? "bg-blue-500 border-blue-500 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400")}>
                          {active && <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-0.5" />}{svc}
                        </button>
                      );
                    })}
                  </div>
                  {selectedServices.length > 0 && (
                    <p className="text-xs text-blue-600 font-semibold">{selectedServices.length} selected (max 6)</p>
                  )}
                </div>
              )}
              {step === 4 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-green-100 text-green-700 border-green-200 font-bold mb-2">Location</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Where are you based?</h2>
                    <p className="text-gray-500 mt-1 text-sm">We&apos;ll surface local businesses and opportunities near you.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SA_PROVINCES.map((prov) => {
                      const active = selectedProvince === prov;
                      return (
                        <button key={prov} onClick={() => setSelectedProvince(prov)}
                          className={cn("p-3 rounded-xl border text-sm font-semibold text-left flex items-center gap-2 transition-all",
                            active ? "border-green-400 bg-green-50 text-green-800 shadow-sm" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300")}>
                          <MapPin className={cn("h-3.5 w-3.5", active ? "text-green-500" : "text-gray-400")} />{prov}
                        </button>
                      );
                    })}
                    <button onClick={() => setSelectedProvince("Prefer not to say")}
                      className={cn("p-3 rounded-xl border text-sm font-semibold text-left col-span-2 transition-all",
                        selectedProvince === "Prefer not to say" ? "border-gray-400 bg-gray-100 text-gray-800" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300")}>
                      Prefer not to say
                    </button>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold mb-2">POPI Act</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Your Data, Your Rights</h2>
                    <p className="text-gray-500 mt-1 text-sm">Under the POPI Act (Act 4 of 2013), you are in full control of your data.</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Lock, title: "Encrypted Storage", desc: "Passwords are bcrypt-hashed. Preferences stored securely and never sold." },
                      { icon: User, title: "Edit Anytime", desc: "Update or delete your preferences at any time from Settings." },
                      { icon: FileText, title: "Data Access", desc: "Request a full export at privacy@verifiedbizlink.co.za." },
                      { icon: Globe, title: "No Third-Party Sale", desc: "We do not sell or share your personal data with third parties." },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border">
                        <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Read our full{" "}
                    <Link href="/privacy" target="_blank" className="text-yellow-600 font-bold hover:underline">Privacy Policy</Link>
                  </p>
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
                    <h2 className="text-3xl font-extrabold text-gray-900">You&apos;re all set!</h2>
                    <p className="mt-2 text-gray-500 font-medium">Your personalised feed is ready. We&apos;ll surface the most relevant businesses and opportunities for you.</p>
                  </div>
                  <div className="space-y-3 text-left">
                    {[
                      { icon: Star, label: "Explore your personalised feed", href: "/" },
                      { icon: Users, label: "Discover verified connections", href: "/network" },
                      { icon: Building2, label: "Browse verified businesses", href: "/network" },
                    ].map((item, i) => (
                      <Link key={i} href={item.href} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 rounded-xl"><item.icon className="h-4 w-4 text-yellow-600" /></div>
                          <span className="font-bold text-gray-800 text-sm">{item.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                  <Button onClick={handleFinish} disabled={saving}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl h-12 text-base">
                    {saving ? "Saving..." : "Go to My Feed →"}
                  </Button>
                </div>
              )}
            </>
          )}

          {isBusiness && (
            <>
              {step === 1 && (
                <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">
                      Welcome{firstName ? `, ${firstName}` : ""}! 🚀
                    </h1>
                    <p className="mt-3 text-gray-500 font-medium text-lg">Let&apos;s set up your business on South Africa&apos;s most trusted B2B platform.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { icon: Award, label: "Get Gold Verified", color: "text-yellow-600 bg-yellow-50" },
                      { icon: TrendingUp, label: "Grow Your Network", color: "text-blue-600 bg-blue-50" },
                      { icon: Zap, label: "2-Week Free Trial", color: "text-green-600 bg-green-50" },
                      { icon: Package, label: "Choose a Package", color: "text-purple-600 bg-purple-50" },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-2xl border flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${item.color}`}><item.icon className="h-4 w-4" /></div>
                        <span className="text-sm font-bold text-gray-800">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-extrabold text-lg">Your Free Trial Has Started!</span>
                    </div>
                    <p className="text-sm font-medium opacity-90">
                      As a new business, you automatically receive <strong>half of our Premium package — free for 2 weeks</strong>.
                    </p>
                    <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl p-3">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold">14 days remaining on your trial</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 mb-3">Trial includes:</h2>
                    <div className="space-y-2">
                      {[
                        { icon: Award, label: "Gold Verified badge eligibility", color: "text-yellow-600" },
                        { icon: Zap, label: "Up to 3 active ads", color: "text-blue-600" },
                        { icon: TrendingUp, label: "Enhanced analytics dashboard", color: "text-green-600" },
                        { icon: Sparkles, label: "AI content assistant", color: "text-purple-600" },
                        { icon: Star, label: "Priority vetting review", color: "text-orange-600" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                          <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
                          <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                          <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">After 14 days, your account reverts to Free unless you choose a paid plan.</p>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold mb-2">Packages</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Choose your plan</h2>
                    <p className="text-gray-500 mt-1 text-sm">You can upgrade anytime. Your trial gives you Premium features right now.</p>
                  </div>
                  <div className="space-y-3">
                    {packages.map((pkg) => {
                      const active = selectedPackage === pkg.key;
                      const style = PACKAGE_STYLES[pkg.key] || PACKAGE_STYLES.free;
                      return (
                        <button key={pkg.key} onClick={() => setSelectedPackage(pkg.key)}
                          className={cn("w-full p-4 rounded-2xl border-2 text-left transition-all",
                            active ? style.activeColor : style.color, active ? "shadow-md" : "hover:shadow-sm")}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900">{pkg.name}</span>
                              {style.badge && (
                                <span className={cn("text-xs text-white font-bold px-2 py-0.5 rounded-full", style.badgeColor)}>
                                  {style.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">{pkg.price ? `R${pkg.price}/mo` : "R0/mo"}</span>
                              {active && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            </div>
                          </div>
                          <ul className="space-y-1">
                            {pkg.features.map((f, fi) => (
                              <li key={fi} className="text-xs text-gray-600 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 text-center">No credit card required for Free plan. Paid plans billed monthly.</p>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-bold mb-2">Documents</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Documents you&apos;ll need</h2>
                    <p className="text-gray-500 mt-1 text-sm">
                      Gather these before visiting the Vetting Hub. Our team reviews them within 3–5 business days.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { title: "CIPC Company Registration Certificate", desc: "Confirms your company's legal registration with the Companies and Intellectual Property Commission.", required: true },
                      { title: "VAT Registration Letter (if applicable)", desc: "SARS-issued VAT certificate. Required if VAT registered.", required: false },
                      { title: "Proof of Identity (ID/Passport)", desc: "A clear copy of the ID or passport of the company director.", required: true },
                      { title: "Bank Confirmation Letter", desc: "Issued by your bank confirming business account details. Not older than 3 months.", required: true },
                      { title: "Proof of Business Address", desc: "A utility bill or lease agreement showing your business trading address.", required: true },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border">
                        <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", doc.required ? "bg-red-100" : "bg-gray-100")}>
                          <FileText className={cn("h-3.5 w-3.5", doc.required ? "text-red-500" : "text-gray-500")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">{doc.title}</p>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              doc.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500")}>
                              {doc.required ? "Required" : "Optional"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700 font-medium">
                    💡 Upload documents directly in the <strong>Vetting Hub</strong> after onboarding.
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold mb-2">POPI Act</Badge>
                    <h2 className="text-2xl font-extrabold text-gray-900">Your Data, Your Rights</h2>
                    <p className="text-gray-500 mt-1 text-sm">Under the POPI Act (Act 4 of 2013), you are in full control.</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Lock, title: "Encrypted Storage", desc: "Passwords are bcrypt-hashed. Business documents stored with strict access controls." },
                      { icon: FileText, title: "Document Privacy", desc: "Uploaded verification documents are only accessible to authorised compliance reviewers." },
                      { icon: Globe, title: "No Third-Party Sale", desc: "We do not sell or share your business data with third parties for marketing." },
                      { icon: ShieldCheck, title: "POPI Compliant", desc: "All data handling complies with the Protection of Personal Information Act (Act 4 of 2013)." },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border">
                        <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 6 && (
                <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Award className="h-10 w-10 text-yellow-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-gray-900">You&apos;re ready to launch!</h2>
                    <p className="mt-2 text-gray-500 font-medium">
                      Head to the Vetting Hub to upload your documents and start your verification journey.
                    </p>
                  </div>
                  <div className="space-y-3 text-left">
                    {[
                      { icon: FileText, label: "Upload documents in Vetting Hub", href: "/vetting" },
                      { icon: Users, label: "Start building your network", href: "/network" },
                      { icon: TrendingUp, label: "View your trial analytics", href: "/analytics" },
                    ].map((item, i) => (
                      <Link key={i} href={item.href} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border hover:bg-gray-100 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 rounded-xl"><item.icon className="h-4 w-4 text-yellow-600" /></div>
                          <span className="font-bold text-gray-800 text-sm">{item.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                  <Button onClick={handleFinish} disabled={saving}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl h-12 text-base">
                    {saving ? "Saving..." : "Go to Vetting Hub →"}
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      <footer className="px-6 pb-8 flex items-center justify-between border-t bg-white pt-4">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 font-medium transition-colors"
        >
          ← Back
        </button>
        {step < totalSteps && (
          <Button onClick={handleNext} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl px-6">
            Continue <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </footer>
    </div>
  );
}
