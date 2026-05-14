"use client";

import { Shield, Check } from "lucide-react";

export function VerifiedBanner() {
  return (
    <div className="px-4 py-4 animate-fade-in">
      <div className="bg-gradient-gold-hover border border-primary/50 rounded-xl px-4 py-4 flex gap-3.5 shadow-gold group hover:shadow-gold-lg transition-all duration-300 cursor-pointer">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-all">
          <Shield size={24} className="text-primary group-hover:scale-110 transition-transform" />
        </div>
        
        {/* Content */}
        <div>
          <h3 className="font-bold text-foreground mb-1 tracking-tight">Only Verified Businesses</h3>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Every business on VerifiedBizLink is verified for your safety and peace of mind.
          </p>
          <div className="flex items-center gap-2 mt-2.5 text-xs text-foreground/70">
            <Check size={14} className="text-primary" />
            <span className="font-medium">100% Safety Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
