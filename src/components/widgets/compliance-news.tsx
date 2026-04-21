
"use client";

import { Info, Zap, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// Curated compliance & B2B news for South African businesses
const NEWS = [
  {
    id: 1,
    title: "POPIA Compliance: Key obligations for B2B data processors in 2026",
    source: "Information Regulator SA",
  },
  {
    id: 2,
    title: "CIPC company status checks now available via API for verified partners",
    source: "CIPC Official",
  },
  {
    id: 3,
    title: "SARS VAT registration threshold remains at R1 million for 2026",
    source: "SARS",
  },
];

export function ComplianceNews() {
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-6">
      {/* News Widget */}
      <Card className="shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold text-gray-900">BizLink News</CardTitle>
          <Info className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent className="space-y-4">
          {NEWS.map((item) => (
            <div
              key={item.id}
              className="cursor-pointer group"
              onClick={() =>
                toast({ title: item.title, description: `Source: ${item.source}` })
              }
            >
              <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-primary group-hover:underline underline-offset-4 decoration-2 decoration-primary/30 transition-all">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <ExternalLink className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">{item.source}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Premium Promo */}
      <Card className="shadow-lg border-none overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <CardContent className="p-6 space-y-4">
          <div className="bg-primary/20 w-fit p-3 rounded-2xl border border-primary/30 mb-2">
            <Zap className="h-6 w-6 text-primary fill-primary" />
          </div>
          <h3 className="text-lg font-bold leading-tight">Elevate Your Business Status</h3>
          <p className="text-sm text-gray-300 font-medium">Get the Premium Vetting Badge and appear higher in partner search results.</p>
          <Button className="w-full bg-primary text-gray-900 hover:bg-yellow-300 font-bold rounded-xl h-11" asChild>
            <Link href="/vetting">Start Vetting</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-2">
        {[
          { label: "About", href: "/contact" },
          { label: "Privacy & Terms", href: "/privacy" },
          { label: "Help Center", href: "/contact" },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            {link.label}
          </Link>
        ))}
        <p className="text-[11px] text-gray-300 w-full mt-2 font-medium">
          VerifiedBizLink © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

