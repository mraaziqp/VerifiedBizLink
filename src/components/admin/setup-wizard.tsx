"use client";

import { useState } from "react";
import { ChevronRight, Check, Settings, DollarSign, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Step = "welcome" | "stripe" | "tiers" | "complete";

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [stripeKey, setStripeKey] = useState("");
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: "welcome", label: "Welcome", icon: Zap },
    { id: "stripe", label: "Payment", icon: DollarSign },
    { id: "tiers", label: "Tiers", icon: Users },
    { id: "complete", label: "Done!", icon: Check },
  ];

  const handleSaveStripe = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payment-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_key: stripeKey }),
      });
      if (res.ok) {
        setCurrentStep("tiers");
      }
    } catch (error) {
      console.error("Error saving Stripe key:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 shadow-2xl">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800 flex">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex-1 transition-all ${
                idx < steps.findIndex((s) => s.id === currentStep)
                  ? "bg-yellow-400"
                  : step.id === currentStep
                  ? "bg-yellow-400"
                  : "bg-gray-800"
              }`}
            />
          ))}
        </div>

        <div className="p-8 md:p-12">
          {/* Step: Welcome */}
          {currentStep === "welcome" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Welcome! 👋</h1>
                <p className="text-gray-400 text-lg">
                  Let's set up your VerifiedBizLink admin in 5 minutes
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                  <Zap className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-white">What you'll set up:</p>
                    <ul className="text-sm text-gray-300 mt-2 space-y-1">
                      <li>✓ Stripe payment processing</li>
                      <li>✓ Subscription tiers (Free, Standard, Premium, Enterprise)</li>
                      <li>✓ Permission system</li>
                      <li>✓ User management dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep("stripe")}
                className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 py-6 text-lg font-semibold"
              >
                Let's Get Started <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step: Stripe */}
          {currentStep === "stripe" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Connect Stripe 💳</h2>
                <p className="text-gray-400">
                  Enable payments for premium tiers. Takes 2 minutes.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stripe Secret Key
                  </label>
                  <Input
                    type="password"
                    placeholder="sk_live_..."
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get it from{" "}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      className="text-yellow-400 hover:underline"
                    >
                      Stripe Dashboard → API Keys
                    </a>
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/30">
                  <p className="text-sm text-blue-300">
                    💡 <strong>Pro tip:</strong> Use test keys first to try the system.
                    Switch to live keys when ready for real payments.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("welcome")}
                  className="flex-1 text-white border-gray-700"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSaveStripe}
                  disabled={!stripeKey || loading}
                  className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                >
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Tiers */}
          {currentStep === "tiers" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Create Your Tiers 📊</h2>
                <p className="text-gray-400">
                  You have 4 default tiers ready. Customize them in the dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Free", price: "$0", color: "from-gray-600 to-gray-700" },
                  { name: "Standard", price: "$50/mo", color: "from-blue-500 to-blue-600" },
                  { name: "Premium", price: "$100/mo", color: "from-purple-500 to-purple-600" },
                  {
                    name: "Enterprise",
                    price: "Custom",
                    color: "from-yellow-500 to-yellow-600",
                  },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className={`p-4 rounded-lg bg-gradient-to-br ${tier.color} border border-gray-700`}
                  >
                    <p className="font-semibold text-white">{tier.name}</p>
                    <p className="text-sm text-gray-100 mt-1">{tier.price}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-green-400/10 border border-green-400/30">
                <p className="text-sm text-green-300">
                  ✓ <strong>All 11 permissions are ready:</strong> API access, advanced
                  reporting, priority support, and more.
                </p>
              </div>

              <Button
                onClick={() => setCurrentStep("complete")}
                className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 py-6 text-lg font-semibold"
              >
                Everything Looks Great! <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === "complete" && (
            <div className="space-y-6 text-center">
              <div>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">You're All Set! 🎉</h2>
                <p className="text-gray-400 max-w-lg mx-auto">
                  Your admin system is ready. You can now manage tiers, assign users,
                  track revenue, and accept payments.
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-300">
                <p>✓ Stripe connected</p>
                <p>✓ 4 tiers ready to customize</p>
                <p>✓ Dashboard ready to use</p>
                <p>✓ Users can upgrade anytime</p>
              </div>

              <Button
                onClick={onComplete}
                className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 py-6 text-lg font-semibold"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
