"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Background Blur Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-cyan-500 to-transparent rounded-full blur-3xl opacity-10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-500 to-transparent rounded-full blur-3xl opacity-10"></div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left: Logo & Text */}
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 shadow-2xl shadow-cyan-500/20 border border-cyan-400/30">
                <span className="text-4xl font-bold text-white">VB</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Verified<span className="text-cyan-400">BizLink</span>
                </h1>
                <p className="text-cyan-400 font-semibold mt-1">Connecting you to Trusted Businesses</p>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Build <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Trust</span>.
                <br />
                Grow <span className="bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">Together</span>.
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl">
                Connect with verified businesses in your industry. Build meaningful relationships, expand your network, and grow your business with confidence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 px-8 py-6 text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all gap-2">
                  Get Verified Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10 px-8 py-6 text-lg font-semibold"
                >
                  View Plans
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {[
                { icon: "✓", text: "CIPC Verified" },
                { icon: "✓", text: "SARS Compliant" },
                { icon: "✓", text: "Industry Trusted" },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 backdrop-blur-md"
                >
                  <span className="text-cyan-400 font-bold">{badge.icon}</span>
                  <span className="text-gray-300 text-sm font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Feature Visual */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Main Card */}
              <div className="rounded-3xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 backdrop-blur-xl p-8 shadow-2xl">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Verified Business</h3>
                      <p className="text-gray-400 text-sm">ABC Consulting</p>
                    </div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="space-y-4">
                  {[
                    "CIPC Registered & Verified",
                    "SARS Tax Compliant",
                    "Customer Reviews (4.8⭐)",
                    "Industry Network Access",
                    "Lead Analytics Dashboard",
                    "Featured Placement",
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                      <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button className="w-full mt-8 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 py-3 font-semibold">
                  Learn More
                </Button>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-6 -right-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-xl p-4 shadow-xl max-w-xs hidden xl:block">
                <p className="text-gray-300 text-sm font-medium">
                  "VerifiedBizLink helped us connect with 50+ trusted partners in just 3 months."
                </p>
                <p className="text-gray-500 text-xs mt-3">- Johnson & Co.</p>
              </div>

              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 backdrop-blur-xl p-4 shadow-xl max-w-xs hidden xl:block">
                <p className="text-white font-bold text-lg">1,200+</p>
                <p className="text-gray-400 text-sm">Verified Businesses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 pt-12 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { number: "1,200+", label: "Verified Businesses" },
            { number: "98%", label: "Trust Rating" },
            { number: "50+", label: "Industries" },
            { number: "24/7", label: "Support" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {stat.number}
              </p>
              <p className="text-gray-400 text-sm md:text-base mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
