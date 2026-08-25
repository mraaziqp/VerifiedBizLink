"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LOGO_BASE64 = "data:image/png;base64,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";

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

        <!-- Centered VerifiedBizLink Watermark Logo -->
        <image href="${LOGO_BASE64}" x="350" y="150" width="500" height="500" opacity="0.14" />

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

      <Card className="overflow-hidden border-amber-200/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl relative">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 border border-amber-500/20 rounded-xl overflow-hidden">
          {/* Centered VerifiedBizLink Watermark Logo Background */}
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <img
              src="/vbl-logo-cert.png"
              alt="VerifiedBizLink Watermark"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain opacity-20 select-none pointer-events-none"
            />
          </div>

          {/* Gold seal circle with green checkmark */}
          <div className="relative z-10 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center bg-slate-800/80 shadow-lg shadow-amber-500/10 ring-4 ring-amber-400/10">
            <span className="text-3xl sm:text-4xl text-emerald-400 font-extrabold select-none">✓</span>
          </div>

          <div className="relative z-10 text-center space-y-2.5 max-w-sm">
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

          <div className="relative z-10 w-full flex items-center justify-center pt-2">
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
