"use client";

import { useEffect, useState } from "react";
import { Sparkles, Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ApprovalCelebrationModalProps {
  isOpen: boolean;
  businessName: string;
  onClose: () => void;
}

export function ApprovalCelebrationModal({
  isOpen,
  businessName,
  onClose,
}: ApprovalCelebrationModalProps) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      setParticles(
        Array.from({ length: 20 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.5,
        }))
      );
    }
  }, [isOpen]);

  const handleDownloadCertificate = () => {
    window.location.href = `/api/certificates/download?business=${encodeURIComponent(businessName)}`;
    setTimeout(onClose, 500);
  };

  const handleShare = () => {
    const text = `🎉 ${businessName} is now verified on VerifiedBizLink! Check out our profile: `;
    if (navigator.share) {
      navigator.share({
        title: "VerifiedBizLink",
        text: text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-0 bg-gradient-to-b from-amber-50 to-white sm:max-w-md overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-bounce"
              style={{
                left: `${particle.left}%`,
                top: "-20px",
                animation: `fall 3s ease-in forwards`,
                animationDelay: `${particle.delay}s`,
              }}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center py-8 px-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full blur-lg opacity-50 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-amber-400 rounded-full flex items-center justify-center text-4xl">
                ✓
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Verified! 🎉</h2>
            <p className="text-base font-bold text-amber-600">{businessName}</p>
          </div>

          {/* Message */}
          <div className="space-y-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
            <p className="text-sm font-semibold text-gray-800">
              Your business has been verified!
            </p>
            <p className="text-xs text-gray-600">
              You now have the official VerifiedBizLink Gold Checkmark. Your certificate is ready to download.
            </p>
          </div>

          {/* Features */}
          <ul className="text-left space-y-2 text-xs text-gray-700">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Display your verification badge publicly</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Build trust with your connections</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Verified CIPC & SARS compliant</span>
            </li>
          </ul>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleDownloadCertificate}
              className="bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 hover:from-amber-500 hover:to-amber-600 font-bold rounded-xl h-11 gap-2 w-full"
            >
              <Download className="h-4 w-4" />
              Download Certificate
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="rounded-xl h-11 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 font-bold"
            >
              <Share2 className="h-4 w-4" />
              Share Victory
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="rounded-xl h-11 font-bold"
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* CSS for falling animation */}
        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
