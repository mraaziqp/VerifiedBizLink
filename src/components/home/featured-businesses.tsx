"use client";

import { Shield, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingSummary } from "@/components/ui/star-rating";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { HomeBusiness } from "@/components/home/types";

interface FeaturedBusinessesProps {
  businesses: HomeBusiness[];
  loading: boolean;
  connectingId: string | null;
  onConnect: (userId: string, displayName: string) => void;
}

export function FeaturedBusinesses({
  businesses,
  loading,
  connectingId,
  onConnect,
}: FeaturedBusinessesProps) {
  const router = useRouter();
  return (
    <div className="px-4 py-5 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="text-lg font-black tracking-tight text-slate-900">Trending This Week</h3>
        </div>
        <p className="text-xs text-slate-500">Most active verified businesses right now</p>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl border border-primary/20 bg-card p-4 text-sm text-foreground/70">
            Loading featured businesses...
          </div>
        )}

        {!loading && businesses.length === 0 && (
          <div className="rounded-xl border border-primary/20 bg-gradient-gold-dark p-5 text-center space-y-2">
            <p className="text-sm font-bold text-foreground">Be the first verified business here</p>
            <p className="text-xs text-foreground/70">
              Complete your business profile and get vetted to appear in Trending This Week.
            </p>
            <a
              href="/onboarding"
              className="inline-block mt-1 text-xs font-bold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              Start your profile →
            </a>
          </div>
        )}

        {!loading && businesses.map((business, idx) => (
          <div
            key={business.userId}
            onClick={() => business.businessId && router.push(`/business/${business.businessId}`)}
            className="group relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-gold-dark hover:border-primary/60 transition-all duration-300 cursor-pointer active:scale-95 shadow-gold"
            style={{
              animation: `slide-up 0.5s ease-out ${idx * 0.15}s both`,
            }}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 border border-primary/30">
                    <AvatarImage src={business.avatarUrl || undefined} alt={business.displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(business.displayName || "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
                      <span className="truncate">{business.displayName}</span>
                      <GoldCheckmark />
                    </h4>
                    <p className="text-xs text-foreground/60 mt-0.5 truncate">{business.industry || "General Services"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-primary px-2.5 py-1 rounded-full">
                  <TrendingUp size={14} className="text-primary-foreground" />
                  <span className="text-xs font-bold text-primary-foreground">Trending</span>
                </div>
              </div>

              <div className="text-xs text-foreground/70 rounded-lg border border-primary/20 bg-white/70 px-2.5 py-2">
                {business.headline || business.companyName || "Trusted verified business"}
              </div>

              <div className="flex items-center gap-4 text-xs text-foreground/70">
                <div className="flex items-center gap-1">
                  <Shield size={14} className="text-primary" />
                  <span className="font-semibold text-foreground">Trust {business.trustScore}%</span>
                </div>
                <div className="flex items-center gap-1 pl-3 border-l border-primary/30">
                  <Users size={14} className="text-primary" />
                  <span className="font-semibold text-foreground">{business.connectionCount} connections</span>
                </div>
              </div>

              {business.reviewCount > 0 && (
                <RatingSummary average={business.avgRating} count={business.reviewCount} size="sm" />
              )}

              <button
                type="button"
                onClick={() => onConnect(business.userId, business.displayName)}
                disabled={connectingId === business.userId}
                className="w-full py-2 mt-2 px-3 bg-primary/10 border border-primary/30 rounded-lg text-primary font-semibold text-sm hover:bg-primary/15 hover:border-primary/50 transition-all duration-300 active:scale-95 disabled:opacity-50"
              >
                {connectingId === business.userId ? "Connecting..." : "View & Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
