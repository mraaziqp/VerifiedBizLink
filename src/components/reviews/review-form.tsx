"use client";

import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import { ReviewData } from "./review-card";

interface ReviewFormProps {
  businessId: string;
  businessName: string;
  onReviewSubmitted?: (review: ReviewData) => void;
  /** If provided, renders as a trigger button */
  triggerLabel?: string;
}

export function ReviewForm({
  businessId,
  businessName,
  onReviewSubmitted,
  triggerLabel = "Write a Review",
}: ReviewFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setTitle("");
    setBody("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Please add a review title", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to submit review", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      onReviewSubmitted?.(data.review);
      reset();
      setOpen(false);
    } catch {
      toast({ title: "Network error", description: "Could not submit review.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
        >
          <PenLine className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate &amp; Review</DialogTitle>
          <DialogDescription>
            Share your experience with <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Star rating picker */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">Your Rating *</Label>
            <div className="flex flex-col gap-1">
              <StarRating
                value={rating}
                interactive
                onChange={setRating}
                size="lg"
                showLabel
              />
              {rating === 0 && (
                <p className="text-xs text-foreground/50">Tap a star to rate</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="review-title" className="text-sm font-bold">
              Review Title *
            </Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarise your experience"
              maxLength={120}
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="review-body" className="text-sm font-bold">
              Detailed Review
              <span className="text-foreground/40 font-normal ml-1">(optional)</span>
            </Label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell others what made this business stand out — or fall short."
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="text-[11px] text-foreground/40 text-right">{body.length}/1000</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setOpen(false); reset(); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
