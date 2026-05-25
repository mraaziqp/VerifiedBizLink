"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current value (1–5). Pass 0 for unrated. */
  value: number;
  /** Whether the user can interact with the stars */
  interactive?: boolean;
  /** Called when user selects a rating */
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export function StarRating({
  value,
  interactive = false,
  onChange,
  size = "md",
  showLabel = false,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          aria-label={`Rate ${star} out of 5`}
          className={cn(
            "transition-transform",
            interactive && "hover:scale-110 cursor-pointer",
            !interactive && "cursor-default"
          )}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
        >
          <Star
            className={cn(
              sizeMap[size],
              "transition-colors duration-100",
              star <= display
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300"
            )}
          />
        </button>
      ))}
      {showLabel && display > 0 && (
        <span className="ml-1 text-xs font-semibold text-foreground/70">
          {LABELS[Math.round(display)]}
        </span>
      )}
    </div>
  );
}

/** Read-only display with numeric average and review count */
export function RatingSummary({
  average,
  count,
  size = "sm",
  className,
}: {
  average: number;
  count: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <StarRating value={Math.round(average)} size={size} />
      <span className="text-xs font-bold text-foreground/80">
        {average.toFixed(1)}
      </span>
      <span className="text-xs text-foreground/50">({count})</span>
    </div>
  );
}
