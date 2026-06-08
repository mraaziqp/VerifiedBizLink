"use client";

import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const tiers = [
  {
    name: "Basic Listing",
    price: null,
    period: "Free",
    description: "Perfect for getting started",
    color: "from-gray-600 to-gray-700",
    features: [
      "Business profile",
      "Contact details",
      "Category listing",
      "Basic search visibility",
    ],
    limitations: [
      "No verification badge",
      "No customer reviews",
      "Limited visibility",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Verified Business",
    price: 99,
    period: "/month",
    description: "Build trust and credibility",
    color: "from-yellow-500 to-yellow-600",
    features: [
      "CIPC verification",
      "SARS verification",
      "Verified badge",
      "Customer reviews & ratings",
      "Trust Score",
      "Priority support",
    ],
    limitations: [],
    cta: "Upgrade Now",
    highlighted: true,
  },
  {
    name: "Premium Business",
    price: 299,
    period: "/month",
    description: "For growing businesses",
    color: "from-blue-500 to-blue-600",
    features: [
      "Everything in Verified plus:",
      "Featured search placement",
      "Homepage exposure",
      "Lead analytics",
      "Business networking",
      "Monthly reports",
      "Priority support",
    ],
    limitations: [],
    cta: "Upgrade Now",
    highlighted: false,
  },
  {
    name: "Enterprise Partner",
    price: 999,
    period: "/month",
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
    limitations: [],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
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
                    Free
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

                {tier.limitations.map((limitation, idx) => (
                  <div key={`limit-${idx}`} className="flex items-start gap-2">
                    <X className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      tier.highlighted ? "text-gray-600" : "text-gray-600"
                    }`} />
                    <span className={`text-sm ${
                      tier.highlighted ? "text-gray-700" : "text-gray-500"
                    }`}>
                      {limitation}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href={tier.price ? "/signup?tier=" + tier.name.toLowerCase() : "/signup"}>
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
      </div>
    </div>
  );
}
