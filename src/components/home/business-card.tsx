"use client";

import { Shield, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingSummary } from "@/components/ui/star-rating";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { HomeBusiness } from "@/components/home/types";

interface BusinessCardProps {
  business: HomeBusiness;
  featured?: boolean;
  onConnect?: (userId: string, displayName: string) => void;
  connectingId?: string | null;
}

export function BusinessCard({
  business,
  featured = false,
  onConnect,
  connectingId,
}: BusinessCardProps) {
  const router = useRouter();
  const initials = (business.displayName || "?").slice(0, 1).toUpperCase();

  return (
    <div
      onClick={() => business.businessId && router.push(`/business/${business.businessId}`)}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer active:scale-95 ${
        featured 
          ? "border-primary/60 shadow-gold-lg bg-card hover:bg-card hover:shadow-card-hover" 
          : "border-primary/25 shadow-card-dark bg-card hover:border-primary/50 hover:bg-card/90 hover:shadow-card-hover"
      }`}
    >
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-primary/30">
            <AvatarImage src={business.avatarUrl || undefined} alt={business.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex items-center gap-1">
              <span className="line-clamp-1">{business.displayName}</span>
              {business.isVerified && <GoldCheckmark />}
            </h3>
            <p className="text-xs text-foreground/60 line-clamp-1">{business.headline || business.companyName || "Verified Business"}</p>
          </div>
        </div>

        {/* Name */}
        <p className="text-xs text-foreground/60 font-medium uppercase tracking-wide">{business.industry || "General Services"}</p>

        {/* Trust + Reach */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-foreground/80">
            <Shield size={14} className="text-primary" />
            <span className="font-semibold">Trust {business.trustScore}%</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-foreground/80">
            <Users size={14} className="text-primary" />
            <span className="font-semibold">{business.connectionCount} connections</span>
          </div>
        </div>

        {/* Star Rating */}
        {business.reviewCount > 0 && (
          <RatingSummary
            average={business.avgRating}
            count={business.reviewCount}
            size="sm"
          />
        )}

        {/* Divider */}
        <div className="h-px bg-border" />

        <div className="flex items-center justify-between gap-2">
          {business.isVerified && (
            <div className="flex items-center gap-1.5 text-primary">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20">
                <Shield size={12} className="fill-primary" />
              </div>
              <span className="text-xs font-bold tracking-wide">VERIFIED</span>
            </div>
          )}

          {onConnect && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onConnect(business.userId, business.displayName);
              }}
              disabled={connectingId === business.userId}
              className="text-xs font-semibold px-2.5 py-1 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {connectingId === business.userId ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Hover Chevron */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:translate-x-1">
        <ChevronRight size={24} className="group-hover:scale-125 transition-transform" />
      </div>

      {/* Glow Border on Hover */}
      <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/30 opacity-0 group-hover:opacity-100 transition-all duration-300" />
    </div>
  );
}
