"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

interface Tier {
  key: string;
  name: string;
  price: number;
  features: string[];
  note?: string | null;
}

interface DisplayTier {
  key: string;
  name: string;
  price: number | null;
  period: string;
  description: string;
  color: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const DESCRIPTIONS: Record<string, string> = {
  free: "Perfect for getting started",
  standard: "Build trust and credibility",
  premium: "For growing businesses",
};

const COLORS: Record<string, string> = {
  free: "from-gray-600 to-gray-700",
  standard: "from-yellow-500 to-yellow-600",
  premium: "from-blue-500 to-blue-600",
};

const ENTERPRISE_CARD: DisplayTier = {
  key: "enterprise",
  name: "Enterprise Partner",
  price: null,
  period: "Custom",
  description: "For established brands",
  color: "from-purple-500 to-purple-600",
  features: [
    "Multiple branches",
    "Dedicated account manager",
    "Featured homepage",
    "Advanced analytics",
    "Sponsored content",
    "Networking access",
    "Custom solutions",
  ],
  cta: "Contact Sales",
  highlighted: false,
};

export default function PricingPage() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<DisplayTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rows: Tier[] = data?.tiers || [];
        const display = rows
          .filter((t) => ["free", "standard", "premium"].includes(t.key))
          .sort((a, b) => ["free", "standard", "premium"].indexOf(a.key) - ["free", "standard", "premium"].indexOf(b.key))
          .map((t): DisplayTier => ({
            key: t.key,
            name: t.key === "free" ? "Basic Listing" : t.key === "standard" ? "Verified Business" : "Premium Business",
            price: t.price || null,
            period: t.price ? "/month" : "Free",
            description: DESCRIPTIONS[t.key] || t.name,
            color: COLORS[t.key] || "from-gray-600 to-gray-700",
            features: t.features,
            cta: t.price ? "Upgrade Now" : "Get Started",
            highlighted: t.key === "standard",
          }));
        setTiers([...display, ENTERPRISE_CARD]);
      })
      .catch(() => setTiers([ENTERPRISE_CARD]))
      .finally(() => setLoading(false));
  }, []);

  // Paid tiers actually check out on /settings (Billing tab); anonymous
  // visitors go to /signup first. Enterprise has no self-serve checkout.
  const ctaHref = (tier: DisplayTier) => {
    if (tier.key === "enterprise") return "/contact";
    if (!tier.price) return user ? "/business/dashboard" : "/signup";
    return user ? "/settings?tab=billing" : "/signup";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="text-center py-12 px-4">
        <h1 className="text-5xl font-bold text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Choose the perfect plan to get verified, build trust, and grow your business
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <Card
                key={tier.key}
                className={`border transition-all flex flex-col ${
                  tier.highlighted
                    ? `bg-gradient-to-br ${tier.color} shadow-2xl shadow-yellow-500/20 border-yellow-500/50`
                    : "bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-gray-600/50"
                } p-6`}
              >
                {/* Badge */}
                {tier.highlighted && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className={`text-2xl font-bold mb-2 ${
                  tier.highlighted ? "text-gray-900" : "text-white"
                }`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mb-4 ${
                  tier.highlighted ? "text-gray-800" : "text-gray-400"
                }`}>
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  {tier.price ? (
                    <>
                      <span className={`text-4xl font-bold ${
                        tier.highlighted ? "text-gray-900" : "text-white"
                      }`}>
                        R{tier.price}
                      </span>
                      <span className={`text-sm ${
                        tier.highlighted ? "text-gray-800" : "text-gray-400"
                      }`}>
                        {tier.period}
                      </span>
                    </>
                  ) : (
                    <span className={`text-3xl font-bold ${
                      tier.highlighted ? "text-gray-900" : "text-white"
                    }`}>
                      {tier.period}
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1 mb-6">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        tier.highlighted ? "text-gray-900" : "text-green-400"
                      }`} />
                      <span className={`text-sm ${
                        tier.highlighted ? "text-gray-900" : "text-gray-300"
                      }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link href={ctaHref(tier)}>
                  <Button className={`w-full ${
                    tier.highlighted
                      ? "bg-gray-900 text-yellow-400 hover:bg-gray-800"
                      : "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  }`}>
                    {tier.cta}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          {[
            {
              q: "Can I change my plan anytime?",
              a: "Yes! Upgrade or downgrade instantly. Changes take effect immediately.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards (Visa, Mastercard, Amex) and EFT transfers.",
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
              a: "We verify your tax compliance status with SARS. Ensures your customers you're legitimate.",
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/30"
            >
              <p className="font-semibold text-white mb-2">{faq.q}</p>
              <p className="text-gray-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to get verified?
        </h2>
        <p className="text-gray-400 mb-8">
          Join 1000+ verified businesses building trust and growing together
        </p>
        <Link href="/signup">
          <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 px-8 py-6 text-lg font-semibold">
            Get Started Now
          </Button>
        </Link>
        <p className="text-gray-500 text-xs mt-6">
          By subscribing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-300">Terms &amp; Conditions</Link> and{" "}
          <Link href="/refund-policy" className="underline hover:text-gray-300">Refund Policy</Link>.
        </p>
      </div>
    </div>
  );
}
