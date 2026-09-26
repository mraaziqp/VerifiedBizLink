"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, CheckCircle2, ShieldCheck, QrCode, Copy, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { extractSerial } from "@/lib/certificate-serial";

interface CertificateProps {
  businessName: string;
  verifiedDate: string;
  certificateNumber: string;
  businessId?: string;
  serial?: string;
  checkCode?: string;
}

export function Certificate({
  businessName,
  verifiedDate,
  certificateNumber,
  businessId,
  serial,
  checkCode,
}: CertificateProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Filled in after a download: the first download is what issues a
  // certificate, so the serial on screen must switch from "not issued" to the
  // real one without a page reload — otherwise the number shown here would
  // not match the one printed on the file.
  const [issuedSerial, setIssuedSerial] = useState<string | null>(null);

  const liveSerial = issuedSerial || extractSerial(serial || certificateNumber || "");
  const isVblSerial = Boolean(liveSerial);
  // Never show a made-up number in the serial slot: someone would type it
  // into /verify and be told the certificate does not exist.
  const displaySerial = liveSerial || "Issued on first download";
  // A download can reissue; the old check code would then be wrong.
  const liveCheckCode = issuedSerial && issuedSerial !== extractSerial(serial || "") ? undefined : checkCode;

  const handleCopyCode = () => {
    if (!liveSerial) return;
    navigator.clipboard.writeText(liveCheckCode ? `${liveSerial} (Code: ${liveCheckCode})` : liveSerial).catch(() => {});
    setCopiedCode(true);
    toast({
      title: "Certificate Details Copied",
      description: "Certificate number and verification code copied to clipboard.",
    });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = businessId
        ? `/api/certificates/download?businessId=${encodeURIComponent(businessId)}`
        : "/api/certificates/download";

      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const cd = res.headers.get("content-disposition");
        const match = cd && cd.match(/filename="?([^"]+)"?/);
        a.download = match ? match[1] : `${businessName.replace(/\s+/g, "-")}-certificate.svg`;
        const downloadedSerial = match ? extractSerial(match[1]) : null;
        if (downloadedSerial) setIssuedSerial(downloadedSerial);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        toast({
          title: "Certificate Downloaded",
          description: "Official cryptographically-signed vector certificate saved.",
        });
        return;
      }
    } catch (err) {
      console.error("Certificate download error:", err);
    } finally {
      setDownloading(false);
    }

    // Fallback: If not authenticated to download official signed SVG, inform user
    toast({
      title: "Authentic Verification Record",
      description: "Viewing live certificate on record. Sign in to download the raw vector SVG.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wider flex items-center gap-1.5">
              Verification Certificate
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Sparkles className="h-2.5 w-2.5" /> Official
              </span>
            </h3>
          </div>
        </div>
        {liveCheckCode && (
          <button
            onClick={handleCopyCode}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-muted"
            title="Click to copy check code"
          >
            {copiedCode ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>Code: {liveCheckCode}</span>
          </button>
        )}
      </div>

      <Card className="overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl relative group hover:border-amber-400/50 transition-all duration-300">
        {/* Shimmer light sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        <div className="relative p-6 sm:p-8 flex flex-col items-center justify-center gap-4 rounded-xl overflow-hidden">
          {/* Centered VerifiedBizLink Watermark Logo Background with glow */}
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div className="absolute w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none animate-pulse-glow" />
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 opacity-20 select-none pointer-events-none transition-transform duration-700 group-hover:scale-105">
              <Image
                src="/vbl-logo-cert.png"
                alt="VerifiedBizLink Watermark"
                fill
                sizes="(max-width: 640px) 224px, 256px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Gold seal circle with animated checkmark and subtle floating */}
          <div className="relative z-10 animate-float">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-amber-400/90 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-xl shadow-amber-500/20 ring-4 ring-amber-400/20 group-hover:ring-amber-400/40 transition-all">
              <ShieldCheck className="h-9 w-9 sm:h-11 sm:w-11 text-amber-400" />
            </div>
          </div>

          <div className="relative z-10 text-center space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-amber-400 font-extrabold shadow-sm">
              Certificate of Verification
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words pt-1">
              {businessName}
            </h2>

            <p className="text-xs sm:text-sm text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Verified &amp; Active on VerifiedBizLink
            </p>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 pt-1 flex-wrap">
              <span className="flex items-center gap-1 bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-0.5 rounded-full shadow-inner">
                ✓ CIPC Registered
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-0.5 rounded-full shadow-inner">
                ✓ SARS Tax Verified
              </span>
            </div>

            <div className="pt-2 space-y-1 text-[11px] text-slate-400 font-mono">
              <p className="text-slate-300">Verified: {verifiedDate}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80 text-amber-300 font-bold">
                  {displaySerial}
                </span>
                {liveCheckCode && (
                  <span className="bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/80 text-slate-300">
                    {liveCheckCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full flex items-center justify-center pt-1">
            <div className="h-px w-40 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-500 font-bold flex-1 h-10 transition-all shadow-xs"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>{downloading ? "Preparing SVG..." : "Download Certificate"}</span>
        </Button>

        {isVblSerial && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 flex-1 h-10 transition-all shadow-xs"
          >
            <Link href={`/verify/${encodeURIComponent(displaySerial)}`}>
              <QrCode className="h-4 w-4 text-slate-600" />
              <span>Verify Live Record</span>
              <ExternalLink className="h-3 w-3 opacity-60 ml-auto" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
