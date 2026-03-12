
"use client";

import { Info, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const NEWS = [
  { id: 1, title: "New Compliance standards for EU 2025 released", reads: "4.5k" },
  { id: 2, title: "Top 10 Vetted Supply Chain Partners this Quarter", reads: "2.1k" },
  { id: 3, title: "Upcoming B2B Networking Expo in Berlin", reads: "1.2k" },
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
              onClick={() => toast({ title: item.title, description: "Full article available in the premium news section." })}
            >
              <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-primary group-hover:underline underline-offset-4 decoration-2 decoration-primary/30 transition-all">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">{item.reads} reads</span>
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
          <p className="text-sm text-gray-300 font-medium">Get the Premium Vetting Badge and appear 5x more often in search results.</p>
          <Button className="w-full bg-primary text-gray-900 hover:bg-yellow-300 font-bold rounded-xl h-11" asChild>
            <Link href="/vetting">Try Premium Free</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-2">
        {[
          { label: 'About', href: '#' },
          { label: 'Accessibility', href: '#' },
          { label: 'Help Center', href: '#' },
          { label: 'Privacy & Terms', href: '#' },
        ].map(link => (
          <span
            key={link.label}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer uppercase tracking-widest"
            onClick={() => toast({ title: link.label, description: "This section is under construction." })}
          >
            {link.label}
          </span>
        ))}
        <p className="text-[11px] text-gray-300 w-full mt-2 font-medium">VerifiedBizLink © 2025</p>
      </div>
    </div>
  );
}
