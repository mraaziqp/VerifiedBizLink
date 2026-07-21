"use client";

import { useState } from "react";
import { Info, FileCheck2, ShieldCheck, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrustScoreInfoProps {
  /** Current score, shown at the top of the explainer if provided. */
  score?: number;
  className?: string;
}

const SCORE_RANGES = [
  { range: "80–100%", label: "Excellent", desc: "Fully verified — documents graded consistently high" },
  { range: "60–79%", label: "Good", desc: "Verified — some documents could grade higher" },
  { range: "30–59%", label: "Building", desc: "In progress — documents submitted, review ongoing" },
  { range: "Below 30%", label: "Get Verified", desc: "Not yet verified — submit documents to start" },
];

/** Info trigger + explainer for what a business's Trust Score means and why
 * it matters — shown next to every Trust Score display across the app so
 * visitors and business owners both understand the number, not just see it. */
export function TrustScoreInfo({ score, className = "" }: TrustScoreInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="What is Trust Score?"
        title="What is Trust Score?"
        className={`inline-flex items-center justify-center rounded-full text-current/60 hover:text-current transition-colors ${className}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>What is a Trust Score?</DialogTitle>
            <DialogDescription>
              How VerifiedBizLink measures a business&apos;s verification strength
              {score !== undefined ? ` — this business is currently at ${score}%.` : "."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <FileCheck2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Built from real document review</p>
                <p className="text-muted-foreground">
                  Our compliance team individually reviews and grades every submitted
                  document — CIPC registration, director ID, proof of bank account,
                  business address, and tax/VAT compliance. The score is the average
                  of those grades, so it reflects actual verification work, not a
                  signup checkbox.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Why it matters</p>
                <p className="text-muted-foreground">
                  A higher score tells customers and partners this business has been
                  through real compliance checks before connecting — reducing fraud
                  risk and giving them confidence before they trade, share documents,
                  or make a payment.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-2">Score ranges</p>
                <ul className="space-y-1.5">
                  {SCORE_RANGES.map((r) => (
                    <li key={r.label} className="flex items-baseline gap-2 text-muted-foreground">
                      <span className="font-semibold text-foreground shrink-0 w-16">{r.range}</span>
                      <span>
                        <span className="font-medium text-foreground">{r.label}</span> — {r.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Want to raise your score? Upload complete, clear documents in Vetting
              Hub — our team reviews and grades each one as part of verification.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
