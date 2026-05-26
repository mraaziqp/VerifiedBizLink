
"use client";

import { ExternalLink, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const NEWS = [
  {
    id: 1,
    title: "POPIA Compliance: Key obligations for B2B data processors in 2026",
    source: "Information Regulator SA",
    tag: "Privacy",
    url: "https://www.informationregulator.org.za/home",
  },
  {
    id: 2,
    title: "CIPC company status checks now available via API for verified partners",
    source: "CIPC Official",
    tag: "Regulatory",
    url: "https://www.cipc.co.za/",
  },
  {
    id: 3,
    title: "SARS VAT registration threshold remains at R1 million for 2026",
    source: "SARS",
    tag: "Tax",
    url: "https://www.sars.gov.za/types-of-tax/value-added-tax/",
  },
  {
    id: 4,
    title: "B-BBEE verification agencies reminded of updated scorecard criteria for 2026",
    source: "DTIC South Africa",
    tag: "B-BBEE",
    url: "https://www.dtic.gov.za/content/broad-based-black-economic-empowerment",
  },
  {
    id: 5,
    title: "NCC updates consumer goods sector compliance guidelines for e-commerce",
    source: "National Consumer Commission",
    tag: "Consumer",
    url: "https://www.thencc.org.za/",
  },
  {
    id: 6,
    title: "Companies Act Amendment: New disclosure requirements for close corporations",
    source: "CIPC Official",
    tag: "Corporate",
    url: "https://www.cipc.co.za/",
  },
];

const TAG_COLORS: Record<string, string> = {
  Privacy: "bg-blue-100 text-blue-700",
  Regulatory: "bg-purple-100 text-purple-700",
  Tax: "bg-green-100 text-green-700",
  "B-BBEE": "bg-orange-100 text-orange-700",
  Consumer: "bg-pink-100 text-pink-700",
  Corporate: "bg-gray-100 text-gray-600",
};

export function ComplianceNews() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-wider">BizLink News</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {NEWS.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 group block"
            >
              <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${TAG_COLORS[item.tag] ?? "bg-gray-100 text-gray-500"}`}>
                {item.tag}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-primary group-hover:underline underline-offset-2 decoration-primary/40 transition-colors">
                  {item.title}
                </p>
                <span className="flex items-center gap-1 mt-0.5">
                  <ExternalLink className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                  <span className="text-[10px] text-gray-400 font-medium">{item.source}</span>
                </span>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <CardContent className="p-5 space-y-3">
          <div className="bg-primary/20 w-fit p-2.5 rounded-xl border border-primary/30">
            <Zap className="h-5 w-5 text-primary fill-primary" />
          </div>
          <h3 className="text-sm font-bold leading-tight">Elevate Your Business Status</h3>
          <p className="text-xs text-gray-300 font-medium leading-relaxed">Get the Verified Badge and appear higher in partner search results.</p>
          <Button className="w-full bg-primary text-gray-900 hover:bg-yellow-300 font-bold rounded-xl h-10 text-sm" asChild>
            <Link href="/vetting">Start Vetting</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
        {[
          { label: "About", href: "/contact" },
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
          { label: "Help", href: "/contact" },
        ].map((link) => (
          <Link key={link.label} href={link.href}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
            {link.label}
          </Link>
        ))}
        <p className="text-[10px] text-gray-300 w-full mt-1 font-medium">
          VerifiedBizLink © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
