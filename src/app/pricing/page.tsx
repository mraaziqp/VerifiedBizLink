"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, BadgeCheck, Zap, Crown, Building2, ReceiptText, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { SubpageNav } from "@/components/layout/subpage-nav";
import { AgentReferralField } from "@/components/billing/agent-referral-field";
import { startPayfastCheckout } from "@/lib/payfast-checkout";

interface Tier {
  key: string;
  name: string;
  price: number;
  features: string[];
  note?: string | null;
}

const TIER_ICON: Record<string, LucideIcon> = {
  free: ShieldCheck,
  verified: BadgeCheck,
  standard: Zap,
  premium: Crown,
};

const DEFAULT_TIERS: Tier[] = [
  {
    key: "verified",
    name: "Verified Business",
    price: 99,
    features: [
      "CIPC & ID document verification",
      "Official Verified Trust Badge",
      "Customer reviews & Trust Score",
      "Priority discovery in search",
      "Up to 2 business listings",
      "Email priority support",
    ],
    note: "Essential verification & monthly tools",
  },
  {
    key: "standard",
    name: "Standard",
    price: 299,
    features: [
      "Everything in Verified Business",
      "1 active ad per month (14 days boost)",
      "Priority discovery listing",
      "Unlimited connections & posts",
      "Advanced analytics dashboard",
      "10GB file storage",
      "Email priority support",
    ],
    note: "For growing businesses",
  },
  {
    key: "premium",
    name: "Premium",
    price: 699,
    features: [
      "Everything in Standard",
      "Gold Verified badge (fast-tracked 24h)",
      "Boosted ad placement (5 active ads)",
      "Full analytics dashboard & lead reports",
      "AI content assistant (unlimited)",
      "100GB file storage",
      "Phone & email priority support",
      "Dedicated account manager",
    ],
    note: "For serious enterprises",
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [onceOffLoading, setOnceOffLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tiers && data.tiers.length > 0) {
          const purchasable = data.tiers.filter((t: Tier) => t.key !== "free");
          if (purchasable.length > 0) setTiers(purchasable);
        }
      })
      .catch(() => setTiers(DEFAULT_TIERS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== "business") return;
    fetch("/api/business/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.business) {
          setCurrentTier(data.business.package_type || "free");
          if (data.business.status === "verified" || data.business.verification_paid) {
            setIsVerified(true);
          }
        }
      })
      .catch(() => {});
  }, [user?.role]);

  const handleCheckout = async (tier: Tier) => {
    if (!user) { router.push("/signup"); return; }
    if (user.role !== "business") {
      toast({ title: "Business account required", description: "Only business accounts can choose a subscription plan.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(tier.key);
    const result = await startPayfastCheckout({
      amount: tier.price,
      description: `${tier.name} Subscription (R${tier.price}/month)`,
      purchaseType: `subscription_${tier.key}`,
    });
    // Only reached if checkout could not be started
    toast({ title: "Payment error", description: result.error, variant: "destructive" });
    setCheckoutLoading(null);
  };

  const handleOnceOffVerification = async () => {
    if (!user) { router.push("/signup"); return; }
    if (user.role !== "business") {
      toast({ title: "Business account required", description: "Only business accounts can get verified.", variant: "destructive" });
      return;
    }
    setOnceOffLoading(true);
    const result = await startPayfastCheckout({
      amount: 49,
      description: "VerifiedBizLink Verification Fee (R49 once-off)",
      purchaseType: "verification_fee",
    });
    toast({ title: "Payment error", description: result.error, variant: "destructive" });
    setOnceOffLoading(false);
  };

  const ctaAction = (tier: Tier) => {
    if (!user) return { href: "/signup" };
    return { onClick: () => handleCheckout(tier) };
  };

  const ctaLabel = (tier: Tier) => {
    if (!user) return "Get Started";
    if (currentTier === tier.key) return "Current Plan";
    return `Upgrade to ${tier.name}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation & Back Button */}
      <SubpageNav title="Pricing & Plans" />

      <div className="text-center pt-10 pb-12 px-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400 bg-yellow-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-700 mb-6">
          Simple, transparent pricing
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Grow with the plan that fits you
        </h1>
        <p className="text-lg text-gray-500">
          Get verified with our affordable R49 once-off badge, or subscribe to a monthly growth plan with extra listings, ad boosts, and priority discovery.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold">
          <ReceiptText className="h-4 w-4 text-yellow-400" />
          Secure checkout via PayFast · Cancel monthly subscriptions anytime.
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 pb-16 space-y-10">
        {/* Once-Off R49 Verification Card */}
        <div className="rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50/70 to-white p-6 sm:p-8 shadow-md">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-block rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-extrabold tracking-wide text-slate-950">
                ONCE-OFF · NOT A SUBSCRIPTION
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
                <ShieldCheck className="h-7 w-7 text-yellow-600 shrink-0" />
                Vetting &amp; Verified Badge — R49 Once-Off
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Don&apos;t want a monthly subscription? Pay a single, once-off fee of <span className="font-bold text-gray-900">R49</span> to submit your CIPC &amp; director ID for official review and activate your permanent Gold Verified Badge.
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
                {[
                  "CIPC and ID document vetting",
                  "Permanent Gold Verified Badge",
                  "Higher placement in search & discovery",
                  "No recurring monthly fees",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-yellow-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 w-full lg:w-60 bg-white rounded-2xl border border-yellow-200 p-6 text-center shadow-sm">
              <p className="text-4xl font-black text-gray-900">R49</p>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Once-off payment</p>
              <Button
                onClick={handleOnceOffVerification}
                disabled={isVerified || onceOffLoading}
                className="w-full mt-4 h-12 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl text-sm shadow-md shadow-yellow-400/20"
              >
                {onceOffLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : isVerified ? (
                  "Badge Active"
                ) : (
                  "Get Verified for R49"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Credit the advisor before paying */}
        {user?.role === 'business' && <AgentReferralField className="max-w-xl mx-auto" />}

        {/* Monthly Subscription Tiers Heading */}
        <div className="text-center pt-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Monthly Growth Subscriptions
          </h2>
          <p className="text-sm text-gray-500 mt-1.5">
            Full-featured monthly plans with ad boosts, expanded listings, and advanced analytics.
          </p>
        </div>

        {/* Monthly Subscription Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {tiers.map((tier) => {
              const highlighted = tier.key === "standard";
              const isCurrent = currentTier === tier.key;
              const Icon = TIER_ICON[tier.key] || Building2;
              const action = ctaAction(tier);
              const isLoadingThis = checkoutLoading === tier.key;
              return (
                <div
                  key={tier.key}
                  className={`relative rounded-2xl p-6 flex flex-col bg-white transition-all duration-300 ${
                    highlighted
                      ? "border-2 border-yellow-400 shadow-xl lg:-translate-y-2"
                      : "border border-gray-150 shadow-sm hover:shadow-md"
                  }`}
                >
                  {highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 text-gray-900 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 shadow-lg">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute top-4 right-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">
                      Your Plan
                    </span>
                  )}

                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 bg-yellow-50">
                    <Icon className="h-5 w-5 text-yellow-600" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500 mb-5 min-h-[2.5rem]">
                    {tier.note || (tier.key === "verified" ? "Essential verification & monthly tools" : "Build trust and grow your reach")}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">R{tier.price}</span>
                    <span className="text-sm text-gray-500 ml-1 font-medium">/month</span>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-green-500" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {action.href ? (
                    <Link href={action.href}>
                      <Button
                        disabled={isCurrent}
                        className={`w-full font-bold h-11 rounded-xl ${
                          highlighted
                            ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {ctaLabel(tier)}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={action.onClick}
                      disabled={isCurrent || checkoutLoading !== null}
                      className={`w-full font-bold h-11 rounded-xl ${
                        highlighted
                          ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      {isLoadingThis ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting…</> : ctaLabel(tier)}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enterprise — separated from the self-serve cards since it's not a fixed price */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Need something bigger?</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Enterprise Partner: multiple branches, a dedicated account manager, featured homepage placement,
                advanced analytics, and custom solutions — priced for your business.
              </p>
            </div>
          </div>
          <Link href="/contact" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-xl h-11 px-6">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "Can I change my plan anytime?",
              a: "Yes — cancel your current plan in Settings → Billing (takes effect immediately) and subscribe to the new one. We're working on switching between paid plans in one step.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards (Visa, Mastercard, Amex) and EFT transfers via PayFast.",
            },
            {
              q: "Is there a contract?",
              a: "No! Cancel anytime. No hidden fees or long-term commitments.",
            },
            {
              q: "How does business verification work?",
              a: "Our compliance team manually reviews your CIPC registration certificate, director ID, proof of bank account, and proof of address, plus your social media presence and location. Verification typically takes 3–7 business days after you submit your documents.",
            },
          ].map((faq) => (
            <div
              key={faq.q}
              className="p-5 rounded-2xl bg-white border border-gray-150 shadow-sm"
            >
              <p className="font-semibold text-gray-900 mb-1.5">{faq.q}</p>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to get verified?
        </h2>
        <p className="text-gray-500 mb-8">
          Join the verified businesses building trust and growing together on VerifiedBizLink
        </p>
        <Link href={user ? "/business/dashboard" : "/signup"}>
          <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 px-8 py-6 text-lg font-bold rounded-xl">
            Get Started Now
          </Button>
        </Link>
        <p className="text-gray-400 text-xs mt-6">
          By subscribing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-600">Terms &amp; Conditions</Link> and{" "}
          <Link href="/refund-policy" className="underline hover:text-gray-600">Refund Policy</Link>.
        </p>
      </div>
    </div>
  );
}
