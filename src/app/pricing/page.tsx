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
    key: "free",
    name: "Starter (Once-Off)",
    price: 49,
    features: [
      "Official CIPC & business vetting",
      "Gold Verified Badge on profile",
      "Priority placement in search & discovery",
      "Public company profile & directory listing",
      "Customer reviews & direct inquiries",
      "1 post per day",
      "Once-off payment — no subscription",
    ],
    note: "Once-off verification · No monthly subscription",
  },
  {
    key: "standard",
    name: "Standard",
    price: 299,
    features: [
      "Everything in Starter / Verified",
      "1 active ad per month (14 days boost)",
      "Priority discovery listing",
      "Unlimited connections & posts",
      "Basic analytics dashboard",
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

  useEffect(() => {
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tiers && data.tiers.length > 0) {
          setTiers(data.tiers);
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
      toast({ title: "Business account required", description: "Only business accounts can choose a plan.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(tier.key);
    const isOnceOff = tier.key === "free" || tier.price === 49;
    const result = await startPayfastCheckout({
      amount: tier.price || 49,
      description: isOnceOff
        ? `VerifiedBizLink Verification Fee (R${tier.price || 49} once-off)`
        : `${tier.name} Subscription (R${tier.price}/month)`,
      purchaseType: isOnceOff ? 'verification_fee' : `subscription_${tier.key}`,
    });
    // Only reached if the checkout could not be started — success navigates.
    toast({ title: "Payment error", description: result.error, variant: "destructive" });
    setCheckoutLoading(null);
  };

  const ctaAction = (tier: Tier) => {
    if (!user) return { href: "/signup" };
    return { onClick: () => handleCheckout(tier) };
  };

  const ctaLabel = (tier: Tier) => {
    if (!user) return "Get Started";
    if (tier.key === "free") {
      if (isVerified) return "Active & Verified";
      return "Get Verified (R49 Once-Off)";
    }
    if (currentTier === tier.key) return "Current Plan";
    return "Upgrade Now";
  };

  const isButtonDisabled = (tier: Tier) => {
    if (!user) return false;
    if (tier.key === "free" && isVerified) return true;
    if (tier.key !== "free" && currentTier === tier.key) return true;
    return checkoutLoading !== null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation & Back Button */}
      <SubpageNav title="Pricing & Plans" />

      <div className="text-center pt-10 pb-16 px-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400 bg-yellow-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-700 mb-6">
          Simple, transparent pricing
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Grow with the plan that fits you
        </h1>
        <p className="text-lg text-gray-500">
          Start with our once-off verified starter plan or supercharge your business reach with our monthly growth tiers.
          Cancel subscriptions anytime from Settings → Billing — no long-term contracts.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold">
          <ReceiptText className="h-4 w-4 text-yellow-400" />
          Secure checkout via PayFast · Once-off &amp; monthly plans available.
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Credit the advisor before paying, not after — this is the last
            moment the sale can still be attributed to whoever earned it. */}
        {user?.role === 'business' && <AgentReferralField className="mb-6 max-w-xl mx-auto" />}

        {loading ? (
          <div className="flex justify-center py-24">
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
              const isOnceOff = tier.key === "free" || tier.price === 49;
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
                      {isOnceOff && isVerified ? "Verified" : "Your Plan"}
                    </span>
                  )}

                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 bg-yellow-50">
                    <Icon className="h-5 w-5 text-yellow-600" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500 mb-5 min-h-[2.5rem]">
                    {tier.note || (isOnceOff ? "Vetting & lifetime verified badge" : "Build trust and grow your reach")}
                  </p>

                  <div className="mb-6">
                    {isOnceOff ? (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">R{tier.price || 49}</span>
                        <span className="text-sm text-gray-500 ml-1 font-medium">once-off</span>
                      </>
                    ) : tier.price < 0 ? (
                      <span className="text-3xl font-extrabold text-gray-900">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">R{tier.price}</span>
                        <span className="text-sm text-gray-500 ml-1">/month</span>
                      </>
                    )}
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
                        disabled={isButtonDisabled(tier)}
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
                      disabled={isButtonDisabled(tier)}
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
