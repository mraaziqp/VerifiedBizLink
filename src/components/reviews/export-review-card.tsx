'use client';

import React, { useRef, useState } from 'react';
import { Star, Download, ShieldCheck, Check, Loader2, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VBLLogo } from '@/components/ui/vbl-logo';
import { cn } from '@/lib/utils';

export interface ExportReviewCardProps {
  review: {
    id: string;
    authorName: string;
    rating: number; // 1 to 5
    reviewText: string;
    createdAt?: string;
    businessName: string;
    businessVerified?: boolean;
  };
  className?: string;
}

/**
 * ExportReviewCard Client Component
 * Allows businesses to download customer reviews as social-ready images.
 * Automatically injects the mandatory footer: "Reviewed and rated on Verified Biz Link".
 */
export function ExportReviewCard({ review, className }: ExportReviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadImage = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);

    try {
      // Loaded on click: ~45 kB the profile page doesn't need until someone shares.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5, // High resolution for crisp social exports
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const slug = review.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `verified-review-${slug}-${review.id.slice(0, 6)}.png`;
      link.click();

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to export review image:', err);
    } finally {
      setDownloading(false);
    }
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);

  return (
    <div className={cn('space-y-3 max-w-md w-full', className)}>
      {/* Exportable Review Node */}
      <div
        ref={cardRef}
        className="w-full bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-lg text-slate-900 flex flex-col justify-between relative overflow-hidden"
        style={{ minHeight: '340px' }}
      >
        {/* Subtle decorative top background gradient */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
        
        {/* Header: Business Info + Rating */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-base font-black text-slate-900 flex items-center gap-1.5">
                {review.businessName}
                {review.businessVerified !== false && (
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </p>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Official Business Review
              </span>
            </div>

            <VBLLogo variant="icon" size="sm" iconSize={32} theme="dark" />
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1 mb-4">
            {stars.map((filled, idx) => (
              <Star
                key={idx}
                className={cn(
                  'h-5 w-5',
                  filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                )}
              />
            ))}
            <span className="ml-1.5 text-sm font-extrabold text-slate-900">
              {review.rating}.0 / 5.0
            </span>
          </div>

          {/* Review Text with Quotation Accent */}
          <div className="relative pl-3 border-l-2 border-slate-200 mb-6">
            <Quote className="h-5 w-5 text-slate-300 absolute -top-2 -left-2 rotate-180 opacity-50" />
            <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
              &ldquo;{review.reviewText}&rdquo;
            </p>
            <p className="text-xs font-bold text-slate-900 mt-2 not-italic">
              — {review.authorName}
              {review.createdAt && (
                <span className="text-slate-400 font-normal ml-1">
                  · {new Date(review.createdAt).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* MANDATORY INJECTED FOOTER */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold mt-auto">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Reviewed and rated on Verified Biz Link
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            verifiedbizlink.co.za
          </span>
        </div>
      </div>

      {/* Download Action Trigger */}
      <Button
        onClick={handleDownloadImage}
        disabled={downloading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 rounded-xl h-11 shadow-sm"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating Image...
          </>
        ) : downloaded ? (
          <>
            <Check className="h-4 w-4 text-emerald-400" /> Image Downloaded!
          </>
        ) : (
          <>
            <Download className="h-4 w-4" /> Download Social Review Badge
          </>
        )}
      </Button>
    </div>
  );
}
