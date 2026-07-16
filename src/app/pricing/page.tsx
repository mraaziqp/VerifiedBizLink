"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, BadgeCheck, Zap, Crown, Building2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { GlassBackground } from "@/components/shared/glass-ui";

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

const ENTERPRISE_TIER: Tier = {
  key: "enterprise",
  name: "Enterprise Partner",
  price: -1, // sentinel: renders as "Custom" instead of a Rand amount
  features: [
    "Multiple branches",
    "Dedicated account manager",
    "Featured homepage placement",
    "Advanced analytics",
    "Sponsored content",
    "Custom solutions",
  ],
};

export default function PricingPage() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rows: Tier[] = data?.tiers || [];
        setTiers([...rows, ENTERPRISE_TIER]);
      })
      .catch(() => setTiers([ENTERPRISE_TIER]))
      .finally(() => setLoading(false));
  }, []);

  // Paid tiers check out on /settings (Billing tab); anonymous visitors go
  // to /signup first. Enterprise is a sales conversation, not a checkout.
  const ctaHref = (tier: Tier) => {
    if (tier.key === "enterprise") return "/contact";
    if (!user) return "/signup";
    return tier.key === "free" ? "/business/dashboard" : "/settings?tab=billing";
  };

  const ctaLabel = (tier: Tier) => {
    if (tier.key === "enterprise") return "Contact Sales";
    if (tier.key === "free") return "Get Started";
    return "Upgrade Now";
  };

  return (
    <GlassBackground>
      <div className="min-h-screen">
        {/* Header */}
        <div className="text-center py-16 px-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-400 mb-6">
            Simple, transparent pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Grow with the plan that fits you
          </h1>
          <p className="text-lg text-slate-400">
            Every plan includes CIPC &amp; SARS verification support. Upgrade or downgrade anytime — changes
            take effect immediately.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 pb-20">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">
              {tiers.map((tier) => {
                const highlighted = tier.key === "standard";
                const Icon = TIER_ICON[tier.key] || Building2;
                return (
                  <div
                    key={tier.key}
                    className={`relative rounded-3xl p-6 flex flex-col transition-all duration-300 ${
                      highlighted
                        ? "border-2 border-yellow-400 bg-gradient-to-b from-yellow-400/[0.08] to-transparent shadow-2xl shadow-yellow-500/10 lg:-translate-y-2"
                        : "border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:border-white/20"
                    }`}
                  >
                    {highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 text-slate-900 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 shadow-lg">
                        Most Popular
                      </span>
                    )}

                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-5 ${
                      highlighted ? "bg-yellow-400 text-slate-900" : "bg-white/5 text-yellow-400"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                    <p className="text-sm text-slate-400 mb-5 min-h-[2.5rem]">
                      {tier.note || (tier.key === "free" ? "Perfect for getting started" : "Build trust and grow your reach")}
                    </p>

                    <div className="mb-6">
                      {tier.key === "free" ? (
                        <span className="text-3xl font-bold text-white">Free</span>
                      ) : tier.price < 0 ? (
                        <span className="text-3xl font-bold text-white">Custom</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-white">R{tier.price}</span>
                          <span className="text-sm text-slate-400 ml-1">/month</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-3 flex-1 mb-6">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${highlighted ? "text-yellow-400" : "text-green-400"}`} />
                          <span className="text-sm text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={ctaHref(tier)}>
                      <Button className={`w-full font-bold h-11 rounded-xl ${
                        highlighted
                          ? "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}>
                        {ctaLabel(tier)}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Can I change my plan anytime?",
                a: "Yes! Upgrade or downgrade instantly. Changes take effect immediately.",
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
                q: "How does CIPC verification work?",
                a: "We verify your business is registered with CIPC. Takes 24-48 hours after signup.",
              },
              {
                q: "What about SARS verification?",
                a: "We verify your tax compliance status with SARS, so customers know you're legitimate.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"
              >
                <p className="font-semibold text-white mb-1.5">{faq.q}</p>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 pb-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get verified?
          </h2>
          <p className="text-slate-400 mb-8">
            Join the verified businesses building trust and growing together on VerifiedBizLink
          </p>
          <Link href={user ? "/business/dashboard" : "/signup"}>
            <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-8 py-6 text-lg font-bold rounded-xl">
              Get Started Now
            </Button>
          </Link>
          <p className="text-slate-500 text-xs mt-6">
            By subscribing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-300">Terms &amp; Conditions</Link> and{" "}
            <Link href="/refund-policy" className="underline hover:text-slate-300">Refund Policy</Link>.
          </p>
        </div>
      </div>
    </GlassBackground>
  );
}
