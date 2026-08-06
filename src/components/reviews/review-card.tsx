"use client";

import { useState } from "react";
import { ThumbsUp, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface ReviewData {
  id: string;
  businessId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  title: string;
  body: string;
  helpfulCount: number;
  markedHelpful?: boolean;
  createdAt: string;
}

interface ReviewCardProps {
  review: ReviewData;
  onHelpful?: (id: string) => void;
  compact?: boolean;
}

export function ReviewCard({ review, onHelpful, compact = false }: ReviewCardProps) {
  const [helpful, setHelpful] = useState(review.markedHelpful ?? false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);

  const handleHelpful = async () => {
    if (helpful) return; // already voted
    setHelpful(true);
    setHelpfulCount((c) => c + 1);
    onHelpful?.(review.id);
    await fetch(`/api/businesses/${review.businessId}/reviews/${review.id}/helpful`, {
      method: "POST",
    }).catch(() => null);
  };

  const initials = review.reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", compact && "p-3 space-y-2")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 border border-border shrink-0">
            <AvatarImage src={review.reviewerAvatar} alt={review.reviewerName} />
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{review.reviewerName}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating value={review.rating} size="sm" />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-bold">
            {review.rating === 5 ? "Excellent" : review.rating >= 4 ? "Very Good" : review.rating >= 3 ? "Good" : review.rating >= 2 ? "Fair" : "Poor"}
          </Badge>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className={cn("font-bold text-foreground", compact ? "text-sm" : "text-base")}>
          {review.title}
        </h4>
      )}

      {/* Body */}
      {!compact && review.body && (
        <p className="text-sm text-foreground/75 leading-relaxed">{review.body}</p>
      )}
      {compact && review.body && (
        <p className="text-xs text-foreground/65 leading-relaxed line-clamp-2">{review.body}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={helpful}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors border",
            helpful
              ? "border-primary/30 bg-primary/10 text-primary cursor-default"
              : "border-border text-foreground/50 hover:border-primary/40 hover:text-primary hover:bg-primary/5"
          )}
        >
          <ThumbsUp className="h-3 w-3" />
          <span className="font-semibold">Helpful {helpfulCount > 0 && `(${helpfulCount})`}</span>
        </button>
        {helpful && (
          <span className="text-[10px] text-primary font-semibold">Thanks for your feedback!</span>
        )}
      </div>
    </div>
  );
}
