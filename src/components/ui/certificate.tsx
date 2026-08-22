"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CertificateProps {
  businessName: string;
  verifiedDate: string;
  certificateNumber: string;
}

export function Certificate({ businessName, verifiedDate, certificateNumber }: CertificateProps) {
  const handleDownload = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#1a2340;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
          </linearGradient>
          <pattern id="dots" patternUnits="userSpaceOnUse" width="50" height="50">
            <circle cx="25" cy="25" r="1" fill="#F5A800" opacity="0.1"/>
          </pattern>
        </defs>

        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bgGradient)"/>
        <rect width="1200" height="800" fill="url(#dots)"/>

        <!-- Border decorations -->
        <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.5"/>
        <rect x="60" y="60" width="1080" height="680" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.3"/>

        <!-- Corner ornaments -->
        <g fill="#F5A800" opacity="0.7">
          <circle cx="80" cy="80" r="8"/>
          <circle cx="1120" cy="80" r="8"/>
          <circle cx="80" cy="720" r="8"/>
          <circle cx="1120" cy="720" r="8"/>
        </g>

        <!-- Gold seal with green checkmark -->
        <circle cx="600" cy="130" r="60" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.8"/>
        <circle cx="600" cy="130" r="55" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.5"/>
        <text x="600" y="150" font-size="70" font-weight="bold" text-anchor="middle" fill="#10B981">✓</text>

        <!-- Title -->
        <text x="600" y="250" font-size="48" font-weight="bold" text-anchor="middle" fill="#F5A800">
          BUSINESS VERIFIED
        </text>

        <!-- Subtitle -->
        <text x="600" y="310" font-size="20" text-anchor="middle" fill="#FFFFFF" opacity="0.8">
          Certificate of Verification
        </text>

        <!-- Divider -->
        <line x1="200" y1="350" x2="1000" y2="350" stroke="#F5A800" stroke-width="2" opacity="0.6"/>

        <!-- Business name -->
        <text x="600" y="430" font-size="36" font-weight="bold" text-anchor="middle" fill="#FFFFFF">
          ${businessName}
        </text>

        <!-- Certificate text -->
        <text x="600" y="510" font-size="18" text-anchor="middle" fill="#FFFFFF" opacity="0.95">
          This business is verified and trusted.
        </text>

        <!-- CIPC and SARS verification -->
        <text x="600" y="560" font-size="16" text-anchor="middle" fill="#10B981" font-weight="bold">
          ✓ CIPC Verified  •  ✓ SARS Verified
        </text>

        <!-- Verified date -->
        <text x="300" y="675" font-size="14" text-anchor="middle" fill="#FFFFFF" opacity="0.7">
          Verified: ${verifiedDate}
        </text>

        <!-- Certificate number -->
        <text x="900" y="675" font-size="14" text-anchor="middle" fill="#FFFFFF" opacity="0.7">
          Certificate #${certificateNumber}
        </text>

        <!-- Footer -->
        <text x="600" y="750" font-size="12" text-anchor="middle" fill="#F5A800" opacity="0.8">
          VerifiedBizLink — Connecting You to Trusted Businesses
        </text>
      </svg>
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    element.setAttribute('download', `${businessName.replace(/\s+/g, '-')}-certificate.svg`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <h3 className="font-black text-foreground text-sm uppercase tracking-widest">
            Verification Certificate
          </h3>
        </div>
      </div>

      <Card className="overflow-hidden border-amber-200/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 border border-amber-500/20 rounded-xl">
          {/* Gold seal circle with green checkmark (natural flow, no overlapping) */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center bg-slate-800/80 shadow-lg shadow-amber-500/10 ring-4 ring-amber-400/10">
            <span className="text-3xl sm:text-4xl text-emerald-400 font-extrabold select-none">✓</span>
          </div>

          <div className="text-center space-y-2.5 max-w-sm">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber-400 font-extrabold">
              Certificate of Verification
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">
              {businessName}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-400 font-semibold">
              This business is verified and trusted.
            </p>
            <div className="flex items-center justify-center gap-3 text-xs font-bold text-emerald-400 pt-1">
              <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                ✓ CIPC
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                ✓ SARS
              </span>
            </div>
            <div className="pt-2 space-y-0.5 text-[11px] text-slate-400 font-mono">
              <p>Verified {verifiedDate}</p>
              <p className="text-slate-400">Cert #{certificateNumber}</p>
            </div>
          </div>

          <div className="w-full flex items-center justify-center pt-2">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          variant="outline"
          size="sm"
          className="gap-2 rounded-lg border-emerald-200/50 text-emerald-600 hover:bg-emerald-50 font-bold w-full"
        >
          <Download className="h-4 w-4" />
          Download Certificate
        </Button>
      </div>
    </div>
  );
}
