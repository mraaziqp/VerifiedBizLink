"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Megaphone, ChevronRight, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";


/**
 * Only http(s) links and our own paths. Ads saved before server-side link
 * validation existed could hold anything, and assigning a javascript: URL to
 * window.location runs it — React's own URL guard does not cover that path.
 */
function safeAdHref(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

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

/**
 * This slot shows real, paid placements only.
 *
 * It used to fall back to three invented ads — "VBL Legal", "VBL Ads",
 * a "Trusted Partner" badge and a "Boosted" flag — shown under a Sponsored
 * label although nobody had bought them, from businesses that do not exist,
 * claiming "500+ verified South African businesses" when there are four.
 *
 * On a platform whose product is verification, that is the one thing the slot
 * must never do. It also hid whether advertising worked at all: a fabricated
 * ad looks exactly like a working one, so nobody could tell the system had
 * never served a real placement.
 *
 * With no ads to show, the slot shows nothing.
 */
const AD_PLACEMENT = "top_banner";

export function AdBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adsEnabled, setAdsEnabled] = useState(true);

  const checkShouldShow = useCallback(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return true;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed >= AD_COOLDOWN_MS;
  }, []);

  useEffect(() => {
    // Show to customers and businesses browsing the platform — not staff,
    // who are doing internal admin/vetting work, not shopping around.
    if (!user || !["user", "business", "customer"].includes(user.role)) return;

    const fetchAdSettings = async () => {
      // Both requests at once: the ad list doesn't depend on the settings.
      const [settings, targeted] = await Promise.all([
        fetch("/api/ads/settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        // Only ads bought for THIS placement — an ad paid for as a feed or
        // spotlight slot must not surface here.
        fetch(`/api/ads/targeted?placement=${AD_PLACEMENT}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null), // an advertising failure must never break the page
      ]);
      if (settings?.enabled === false) {
        setAdsEnabled(false);
        return;
      }
      const loaded: Ad[] = Array.isArray(targeted?.ads) ? targeted.ads : [];
      setAds(loaded);

      // Nothing paid for this slot, so nothing appears in it.
      if (loaded.length > 0 && checkShouldShow()) {
        setTimeout(() => setVisible(true), 1500); // let the page render first
      }
    };

    fetchAdSettings();
  }, [user, checkShouldShow]);

  // Poll to re-show after cooldown
  useEffect(() => {
    if (!user || !["user", "business", "customer"].includes(user.role) || !adsEnabled) return;
    if (ads.length === 0) return; // nothing to rotate through
    const interval = setInterval(() => {
      if (!visible && checkShouldShow()) {
        setCurrentAdIndex((i) => (i + 1) % ads.length);
        setVisible(true);
      }
    }, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [user, visible, adsEnabled, ads.length, checkShouldShow]);

  // Log one impression each time a (real) ad is actually shown to a viewer.
  useEffect(() => {
    if (!visible) return;
    const ad = ads[currentAdIndex] || ads[0];
    if (ad) {
      fetch(`/api/ads/${ad.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "impression" }),
        keepalive: true,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentAdIndex]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const trackAd = (adId: string, type: "impression" | "click") => {
    fetch(`/api/ads/${adId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  };

  // ads.length is the guard that matters: with nothing sold for this slot,
  // the component renders nothing at all rather than inventing filler.
  if (!user || !["user", "business"].includes(user.role) || !visible || !adsEnabled) return null;
  if (ads.length === 0) return null;

  const ad = ads[currentAdIndex] || ads[0];

  return (
    <div
      className="fixed bottom-20 md:bottom-6 inset-x-0 mx-auto z-40 w-[calc(100vw-2rem)] max-w-md
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
            className="bg-amber-400 text-slate-900 hover:bg-yellow-400 font-bold rounded-xl text-xs h-8 gap-1 flex-1"
            onClick={() => {
              trackAd(ad.id, "click");
              const href = safeAdHref(ad.cta_url);
              if (href) window.location.href = href;
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
            <a href={safeAdHref(ad.cta_url) ?? '#'} target="_blank" rel="noopener noreferrer" onClick={() => trackAd(ad.id, "click")}>
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
