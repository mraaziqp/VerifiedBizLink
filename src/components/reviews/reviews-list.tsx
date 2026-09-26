"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, ImageDown } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewCard, ReviewData } from "./review-card";
import { ReviewForm } from "./review-form";
import { ExportReviewCard } from "./export-review-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReviewsListProps {
  businessId: string;
  businessName: string;
  /** If false, hides the Write Review button (e.g. business owner viewing own profile) */
  canReview?: boolean;
  /** Business owner viewing their own profile: offer "share as image" per review. */
  canExport?: boolean;
  businessVerified?: boolean;
  compact?: boolean;
  className?: string;
}

interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<string, number>; // "1" → count
}

export function ReviewsList({
  businessId,
  businessName,
  canReview = true,
  canExport = false,
  businessVerified = false,
  compact = false,
  className,
}: ReviewsListProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0, distribution: {} });
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/businesses/${businessId}/reviews`).catch(() => null);
    if (!res?.ok) { setLoading(false); return; }
    const data = await res.json().catch(() => null);
    if (!data) { setLoading(false); return; }
    setReviews(data.reviews ?? []);
    setStats(data.stats ?? { average: 0, count: 0, distribution: {} });
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleNewReview = (review: ReviewData) => {
    setReviews((prev) => [review, ...prev]);
    setStats((prev) => {
      const newCount = prev.count + 1;
      const newAvg = (prev.average * prev.count + review.rating) / newCount;
      return {
        average: newAvg,
        count: newCount,
        distribution: {
          ...prev.distribution,
          [review.rating]: (prev.distribution[review.rating] ?? 0) + 1,
        },
      };
    });
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-black text-lg text-foreground">
            Customer Reviews
          </h3>
          {!loading && stats.count > 0 && (
            <span className="text-sm text-foreground/50 font-medium">
              ({stats.count})
            </span>
          )}
        </div>
        {canReview && (
          <ReviewForm
            businessId={businessId}
            businessName={businessName}
            onReviewSubmitted={handleNewReview}
          />
        )}
      </div>

      {/* Rating Summary Bar */}
      {!loading && stats.count > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-center gap-5">
          {/* Big average */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-5xl font-black text-foreground">
              {stats.average.toFixed(1)}
            </span>
            <StarRating value={Math.round(stats.average)} size="md" />
            <span className="text-xs text-foreground/50 font-medium">
              {stats.count} {stats.count === 1 ? "review" : "reviews"}
            </span>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] ?? 0;
              const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-foreground/60 w-4 shrink-0">{star}</span>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-[11px] text-foreground/50 w-7 text-right shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && reviews.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
          <MessageSquare className="h-8 w-8 text-foreground/20 mx-auto" />
          <p className="font-semibold text-foreground/50">No reviews yet</p>
          <p className="text-sm text-foreground/40">
            Be the first to share your experience with {businessName}.
          </p>
        </div>
      )}

      {/* Reviews */}
      {!loading && reviews.length > 0 && (
        <div className={cn("space-y-3", compact && "space-y-2")}>
          {reviews.map((review) => (
            <div key={review.id}>
              <ReviewCard review={review} compact={compact} />
              {canExport && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => setExportingId(exportingId === review.id ? null : review.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ImageDown className="h-3.5 w-3.5" />
                    {exportingId === review.id ? "Hide image" : "Share as image"}
                  </button>
                  {exportingId === review.id && (
                    <ExportReviewCard
                      className="mt-2"
                      review={{
                        id: review.id,
                        authorName: review.reviewerName,
                        rating: review.rating,
                        reviewText: [review.title, review.body].filter(Boolean).join(" — "),
                        createdAt: review.createdAt,
                        businessName,
                        businessVerified,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
