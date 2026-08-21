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
    <div className="space-y-3">
      <div className="space-y-0.5 px-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-amber-500" />
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Trending This Week</h3>
        </div>
        <p className="text-xs text-slate-500">Most active verified businesses</p>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 text-center shadow-xs">
            Loading trending businesses...
          </div>
        )}

        {!loading && businesses.length === 0 && (
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white p-5 text-center space-y-2 shadow-xs">
            <p className="text-sm font-bold text-slate-900">Be the first verified business here</p>
            <p className="text-xs text-slate-500">
              Complete your business profile and get vetted to appear in Trending This Week.
            </p>
            <a
              href="/onboarding"
              className="inline-block mt-1 text-xs font-bold text-amber-700 underline underline-offset-4 hover:text-amber-900 transition-colors"
            >
              Start your profile →
            </a>
          </div>
        )}

        {!loading && businesses.map((business, idx) => (
          <div
            key={business.userId}
            onClick={() => business.businessId && router.push(`/business/${business.businessId}`)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 hover:border-amber-300 hover:shadow-md transition-all duration-200 cursor-pointer shadow-xs p-4 space-y-3"
            style={{
              animation: `slide-up 0.4s ease-out ${idx * 0.1}s both`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-11 w-11 border-2 border-amber-300 shadow-xs shrink-0">
                  <AvatarImage src={business.avatarUrl || undefined} alt={business.displayName} />
                  <AvatarFallback className="bg-amber-100 text-amber-900 font-bold">
                    {(business.displayName || "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate flex items-center gap-1 text-sm">
                    <span className="truncate">{business.displayName}</span>
                    {business.isVerified && <GoldCheckmark />}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">{business.industry || "General Services"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                <TrendingUp size={12} className="text-amber-700" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Top</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 line-clamp-1 italic">
              &quot;{business.headline || business.companyName || "Trusted verified business"}&quot;
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <Shield size={13} className="text-amber-500" />
                <span>{business.trustScore}% Trust</span>
              </div>
              <div className="flex items-center gap-1 pl-3 border-l border-slate-200 text-slate-500">
                <Users size={13} className="text-slate-400" />
                <span>{business.connectionCount} connections</span>
              </div>
            </div>

            {business.reviewCount > 0 && (
              <RatingSummary average={business.avgRating} count={business.reviewCount} size="sm" />
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConnect(business.userId, business.displayName);
              }}
              disabled={connectingId === business.userId}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-xl text-amber-900 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {connectingId === business.userId ? "Connecting..." : "View & Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
