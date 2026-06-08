"use client";

import { useState } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionManager({
  subscription,
  onUpdate,
}: {
  subscription: any;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "Up to 3 ads",
        "Basic analytics",
        "Email support",
        "Single location targeting",
      ],
      limitations: ["No API access", "Limited support"],
    },
    {
      name: "Standard",
      price: "$50",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Up to 50 ads",
        "Advanced analytics",
        "Priority email support",
        "Multiple location targeting",
        "AI ad generation",
      ],
      limitations: [],
      highlighted: subscription?.tier === "Standard",
    },
    {
      name: "Premium",
      price: "$100",
      period: "/month",
      description: "For established businesses",
      features: [
        "Unlimited ads",
        "Advanced analytics & reports",
        "24/7 priority support",
        "Nationwide targeting",
        "AI ad generation",
        "Custom branding",
        "API access",
      ],
      limitations: [],
      highlighted: subscription?.tier === "Premium",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations",
      features: [
        "Everything in Premium",
        "Dedicated account manager",
        "Custom integrations",
        "White-label solution",
        "Advanced security",
      ],
      limitations: [],
      highlighted: subscription?.tier === "Enterprise",
    },
  ];

  const handleUpgrade = async (tierName: string) => {
    try {
      setLoading(true);

      // Get tier ID (in real app, fetch from DB)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_name: tierName }),
      });

      const { sessionId } = await res.json();

      // Redirect to Stripe checkout
      if (sessionId) {
        window.location.href = `/checkout?sessionId=${sessionId}`;
      }
    } catch (error) {
      console.error("Error initiating upgrade:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      setLoading(true);
      const res = await fetch("/api/subscription/cancel", { method: "POST" });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Subscription */}
      {subscription?.tier && subscription.tier !== "Free" && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/30 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-yellow-400 font-semibold mb-1">Current Plan</p>
              <h3 className="text-2xl font-bold text-white">{subscription.tier}</h3>
              <p className="text-gray-300 mt-1">
                ${subscription.price_usd}/month
              </p>
            </div>
            <Badge className="bg-yellow-500 text-gray-900">Active</Badge>
          </div>

          <div className="flex gap-3 pt-4 border-t border-yellow-500/30">
            <Button
              variant="outline"
              className="flex-1 text-yellow-400 border-yellow-500/30 hover:border-yellow-500"
            >
              Billing Details
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 text-red-400 border-red-500/30 hover:border-red-500"
            >
              {loading ? "Cancelling..." : "Cancel Plan"}
            </Button>
          </div>
        </Card>
      )}

      {/* Tier Comparison */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Choose Your Plan</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`border transition-all ${
                tier.highlighted
                  ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                  : "bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-gray-600/50"
              } p-6`}
            >
              {tier.highlighted && (
                <div className="mb-4">
                  <Badge className="bg-yellow-500 text-gray-900">Current Plan</Badge>
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{tier.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-400">{tier.period}</span>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}

                {tier.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              {tier.highlighted ? (
                <Button disabled className="w-full bg-yellow-400/20 text-yellow-400 cursor-default">
                  Current Plan
                </Button>
              ) : tier.name === "Enterprise" ? (
                <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                  Contact Sales
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(tier.name)}
                  disabled={loading}
                  className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Upgrading...
                    </>
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl bg-gray-800/30 border border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Billing Questions?</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-white">Can I change plans anytime?</p>
            <p className="text-gray-400">Yes! Upgrade or downgrade instantly. Changes take effect immediately.</p>
          </div>
          <div>
            <p className="font-semibold text-white">What payment methods do you accept?</p>
            <p className="text-gray-400">Credit cards (Visa, Mastercard, American Express) and PayPal.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Is there a contract?</p>
            <p className="text-gray-400">No! Cancel anytime. No hidden fees or long-term commitments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
