"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Megaphone, ChevronRight, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

interface Ad {
  id: string;
  title: string;
  description: string;
  business_name: string;
  cta_text: string;
  cta_url: string;
  badge?: string;
  is_boosted?: boolean;
}

const DISMISS_KEY = "vbl_ad_dismissed_at";
const AD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Fallback sample ad when no ads are loaded from server
const SAMPLE_ADS: Ad[] = [
  {
    id: "sample-1",
    title: "Expand Your Business Network",
    description: "Connect with 500+ verified South African businesses. Get your Gold Verification badge and unlock premium trade opportunities.",
    business_name: "VerifiedBizLink",
    cta_text: "Get Verified",
    cta_url: "/vetting",
    badge: "Trusted Partner",
    is_boosted: true,
  },
  {
    id: "sample-2",
    title: "Is Your Business POPIA Compliant?",
    description: "Ensure your business meets all POPIA Act requirements. Our legal team is ready to guide you through the compliance process.",
    business_name: "VBL Legal",
    cta_text: "Learn More",
    cta_url: "/contact",
    badge: "Compliance",
    is_boosted: false,
  },
  {
    id: "sample-3",
    title: "Grow Your Business with Verified Ads",
    description: "Advertise your verified business to thousands of professionals. Boost your visibility and drive more leads.",
    business_name: "VBL Ads",
    cta_text: "Advertise Now",
    cta_url: "/settings",
    badge: "Featured",
    is_boosted: true,
  },
];

export function AdBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [ads, setAds] = useState<Ad[]>(SAMPLE_ADS);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adsEnabled, setAdsEnabled] = useState(true);

  const checkShouldShow = useCallback(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return true;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed >= AD_COOLDOWN_MS;
  }, []);

  useEffect(() => {
    // Only show to free/customer accounts
    if (!user || user.role !== "user") return;

    const fetchAdSettings = async () => {
      try {
        const res = await fetch("/api/ads/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.enabled === false) {
            setAdsEnabled(false);
            return;
          }
        }
      } catch {
        // If API fails, default to showing ads
      }

      // Check cooldown
      if (checkShouldShow()) {
        // Small delay so page renders first
        setTimeout(() => setVisible(true), 1500);
      }

      // Try to load live ads
      try {
        const res = await fetch("/api/ads");
        if (res.ok) {
          const data = await res.json();
          if (data.ads && data.ads.length > 0) {
            setAds(data.ads);
          }
        }
      } catch {
        // Use sample ads as fallback
      }
    };

    fetchAdSettings();
  }, [user, checkShouldShow]);

  // Poll to re-show after cooldown
  useEffect(() => {
    if (!user || user.role !== "user" || !adsEnabled) return;
    const interval = setInterval(() => {
      if (!visible && checkShouldShow()) {
        setCurrentAdIndex((i) => (i + 1) % ads.length);
        setVisible(true);
      }
    }, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [user, visible, adsEnabled, ads.length, checkShouldShow]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!user || user.role !== "user" || !visible || !adsEnabled) return null;

  const ad = ads[currentAdIndex] || ads[0];

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-md
                 bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-black/10 overflow-hidden
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="banner"
      aria-label="Advertisement"
    >
      {/* Sponsored label */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Megaphone className="h-3 w-3" />
          Sponsored · {ad.business_name}
          {ad.is_boosted && (
            <Badge className="ml-1 text-xs py-0 px-1.5 bg-yellow-100 text-yellow-700 border-yellow-200 font-bold gap-1">
              <Zap className="h-2.5 w-2.5" /> Boosted
            </Badge>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Dismiss ad"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Ad content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{ad.title}</h3>
              {ad.badge && (
                <Badge className="text-xs py-0 px-1.5 bg-green-100 text-green-700 border-green-200 font-bold flex-shrink-0">
                  {ad.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{ad.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl text-xs h-8 gap-1 flex-1"
            onClick={() => {
              window.location.href = ad.cta_url;
              handleDismiss();
            }}
          >
            {ad.cta_text} <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 text-gray-400 hover:text-gray-600 rounded-xl"
            asChild
          >
            <a href={ad.cta_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Progress dots if multiple ads */}
      {ads.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {ads.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${i === currentAdIndex ? "w-4 bg-primary" : "w-1 bg-gray-200"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
