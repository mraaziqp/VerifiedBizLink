"use client";

import { ShieldCheck, Search, Handshake, Star } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    icon: ShieldCheck,
    step: "01",
    title: "Get Verified",
    desc: "Submit your CIPC registration, tax clearance and directors' ID. Our team vets every application manually.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-100",
  },
  {
    icon: Search,
    step: "02",
    title: "Discover Partners",
    desc: "Browse 18+ industry categories. Filter by province, trust score and service type to find the right business.",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    icon: Handshake,
    step: "03",
    title: "Connect & Engage",
    desc: "Send a connection request, exchange verified business credentials and start building trusted B2B relationships.",
    color: "text-primary",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    icon: Star,
    step: "04",
    title: "Rate & Review",
    desc: "After working together, leave an honest star rating. Authentic reviews help other businesses make informed choices.",
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-100",
  },
];

export function HowItWorks() {
  return (
    <div className="px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900">How It Works</h3>
          <p className="text-xs text-slate-500 mt-0.5">Four simple steps to verified business connections</p>
        </div>
        <Link
          href="/onboarding"
          className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors active:scale-95"
        >
          Get started →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className={`relative flex gap-3.5 p-4 rounded-xl border ${step.bg} transition-all duration-300 hover:shadow-md`}
              style={{ animation: `slide-up 0.4s ease-out ${idx * 0.08}s both` }}
            >
              {/* Step number */}
              <span className="absolute top-3 right-3.5 text-[10px] font-black text-slate-300">
                {step.step}
              </span>

              {/* Icon */}
              <div className="flex-shrink-0 flex items-start pt-0.5">
                <Icon size={22} className={step.color} />
              </div>

              {/* Content */}
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1 leading-tight">{step.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
