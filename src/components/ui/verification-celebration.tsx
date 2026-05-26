"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { X, Star, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface VerificationCelebrationProps {
  companyName: string;
  trustScore?: number;
  onClose: () => void;
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-1 rounded-full bg-green-500 shrink-0", className)}>
      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export function VerificationCelebration({
  companyName,
  trustScore = 95,
  onClose,
}: VerificationCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const displayRating = Math.min(5, parseFloat((trustScore / 20).toFixed(1)));
  const fullStars = Math.floor(displayRating);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm opacity-0"
            style={{
              left: `${5 + i * 5.2}%`,
              top: "-8px",
              backgroundColor: i % 3 === 0 ? "#FCC200" : i % 3 === 1 ? "#ffffff" : "#22c55e",
              animation: visible
                ? `confettiFall ${1.2 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.1}s forwards`
                : "none",
              transform: `rotate(${i * 37}deg)`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-[360px] bg-gray-950 rounded-3xl overflow-hidden shadow-2xl shadow-black/60 transition-all duration-500",
          visible ? "scale-100 translate-y-0" : "scale-90 translate-y-6"
        )}
        style={{ border: "1px solid rgba(252,194,0,0.25)" }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo header */}
        <div className="relative flex flex-col items-center pt-7 pb-3 px-6">
          <VBLLogo variant="full" size="sm" theme="light" />
          <p className="mt-1.5 text-[10px] text-gray-500 font-medium tracking-wider">
            — Connecting you to Trusted Businesses —
          </p>
        </div>

        {/* Verified Hero Badge */}
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-3 bg-gray-900 rounded-2xl p-4"
            style={{ border: "1px solid rgba(252,194,0,0.2)" }}
          >
            <div className="p-2.5 rounded-xl bg-yellow-400/10 shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Business Verified</p>
              <p className="text-gray-400 text-xs mt-0.5">This business is verified and trusted.</p>
            </div>
          </div>
        </div>

        {/* CIPC & SARS verified rows */}
        <div className="px-4 space-y-2.5 pb-3">
          {/* CIPC */}
          <div
            className="flex items-center gap-3 bg-gray-900 rounded-2xl p-3.5"
            style={{ border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <div className="bg-white rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
              <span className="text-[11px] font-black text-gray-900 tracking-tight">CIPC</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold leading-tight">
                CIPC <span className="text-green-400">VERIFIED</span>
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5 leading-tight truncate">
                Registered with the Companies and Intellectual Property Commission
              </p>
            </div>
            <CheckBadge />
          </div>

          {/* SARS */}
          <div
            className="flex items-center gap-3 bg-gray-900 rounded-2xl p-3.5"
            style={{ border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <div className="bg-blue-900 rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
              <span className="text-[11px] font-black text-blue-200 tracking-tight">SARS</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold leading-tight">
                SARS <span className="text-green-400">VERIFIED</span>
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5 leading-tight">
                Tax compliant and verified with SARS
              </p>
            </div>
            <CheckBadge />
          </div>
        </div>

        {/* Rating card */}
        <div className="px-4 pb-3">
          <div
            className="bg-gray-900 rounded-2xl p-4"
            style={{ border: "1px solid rgba(252,194,0,0.15)" }}
          >
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Rating &amp; Reviews
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-yellow-400 text-3xl font-black leading-none">{displayRating}</span>
              <div className="flex flex-col gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i <= fullStars
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-700 text-gray-700"
                      )}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-[10px]">
                  Trust score {trustScore}/100
                </p>
              </div>
            </div>

            {/* Mini testimonial */}
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-[11px] font-medium leading-snug">
                Excellent service and very professional. Highly recommend!
              </p>
              <p className="text-gray-500 text-[10px] mt-1">— Verified VerifiedBizLink member</p>
            </div>
          </div>
        </div>

        {/* Congratulations section */}
        <div className="px-6 py-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
              Congratulations!
            </span>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>
          <h2 className="text-white text-lg font-black leading-tight">{companyName}</h2>
          <p className="text-gray-400 text-xs mt-1">
            is now an officially verified VerifiedBizLink business.
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 pt-1 pb-5 space-y-2">
          <Link href="/" onClick={handleClose} className="block">
            <Button className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black rounded-2xl h-12 text-base shadow-lg shadow-yellow-400/25 transition-all duration-200 hover:scale-[1.02]">
              Connect &amp; Grow
            </Button>
          </Link>
          <button
            onClick={handleClose}
            className="w-full text-center text-gray-600 hover:text-gray-400 text-xs font-medium py-1 transition-colors"
          >
            View Vetting Hub
          </button>
        </div>

        {/* Footer stripe */}
        <div className="bg-yellow-400 py-2.5 text-center">
          <p className="text-gray-900 font-black text-xs tracking-[0.15em] uppercase">
            Network. Collaborate. Succeed.
          </p>
        </div>
      </div>

    </div>
  );
}
