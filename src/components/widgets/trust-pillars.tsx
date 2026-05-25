"use client";

import { ShieldCheck, BadgeCheck, Gavel, Users, Lock, BarChart2 } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "CIPC Verified",
    desc: "Every business is cross-referenced with the Companies and Intellectual Property Commission.",
  },
  {
    icon: BadgeCheck,
    title: "Tax Clearance Checked",
    desc: "SARS tax compliance pin is validated during the vetting process — no shortcuts.",
  },
  {
    icon: Gavel,
    title: "POPIA Compliant",
    desc: "We handle all personal and company data in line with South Africa's Protection of Personal Information Act.",
  },
  {
    icon: Users,
    title: "Peer-Reviewed",
    desc: "Businesses earn star ratings from verified partners who have actually worked with them.",
  },
  {
    icon: Lock,
    title: "Secure Messaging",
    desc: "All connection requests and messages are authenticated — no anonymous outreach.",
  },
  {
    icon: BarChart2,
    title: "Trust Score System",
    desc: "A dynamic score based on verification status, reviews, engagement and compliance history.",
  },
];

export function TrustPillars() {
  return (
    <div className="px-4 py-6 space-y-4 animate-fade-in">
      <div>
        <h3 className="text-xl font-black tracking-tight text-slate-900">Why Businesses Trust Us</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          A verification-first platform built for the South African B2B market
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="group flex flex-col gap-2 p-4 rounded-xl border border-primary/15 bg-white hover:border-primary/40 hover:bg-amber-50/30 transition-all duration-300 shadow-sm"
              style={{ animation: `slide-up 0.4s ease-out ${idx * 0.07}s both` }}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/8 group-hover:bg-primary/15 transition-all border border-primary/20">
                <Icon size={18} className="text-primary" />
              </div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{pillar.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{pillar.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
