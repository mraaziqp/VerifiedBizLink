"use client";

import { BusinessCard } from "./business-card";
import { HomeBusiness } from "@/components/home/types";

interface TopRatedBusinessesProps {
  businesses: HomeBusiness[];
  loading: boolean;
  connectingId: string | null;
  onConnect: (userId: string, displayName: string) => void;
}

export function TopRatedBusinesses({
  businesses,
  loading,
  connectingId,
  onConnect,
}: TopRatedBusinessesProps) {
  return (
    <div className="px-4 py-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900">Top Rated Businesses</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Trusted by thousands</p>
        </div>
        <button className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors active:scale-95">
          View all →
        </button>
      </div>

      {/* Business Cards Grid */}
      <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
        {loading && (
          <div className="rounded-xl border border-primary/20 bg-card p-4 text-sm text-foreground/70 md:col-span-2 lg:col-span-3">
            Loading top rated businesses...
          </div>
        )}

        {!loading && businesses.length === 0 && (
          <div className="rounded-xl border border-primary/20 bg-card p-4 text-sm text-foreground/70 md:col-span-2 lg:col-span-3">
            No verified businesses match your filter yet.
          </div>
        )}

        {!loading && businesses.map((business, idx) => (
          <div 
            key={business.userId} 
            className="md:block"
            style={{
              animation: `slide-up 0.5s ease-out ${idx * 0.1}s both`,
            }}
          >
            <BusinessCard
              business={business}
              featured={idx === 0}
              onConnect={onConnect}
              connectingId={connectingId}
            />
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="pt-4">
        <button className="w-full py-3 px-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg hover:from-primary/15 hover:to-primary/10 hover:border-primary/50 transition-all duration-300 text-foreground font-semibold text-sm hover:text-primary">
          Explore More Premium Businesses →
        </button>
      </div>
    </div>
  );
}
