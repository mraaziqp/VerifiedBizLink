
"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeHeader } from "@/components/layout/home-header";
import { SearchInterface } from "@/components/home/search-interface";
import { PopularCategories } from "@/components/home/popular-categories";
import { QuickStats } from "@/components/home/quick-stats";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { VerifiedBanner } from "@/components/home/verified-banner";
import { TopRatedBusinesses } from "@/components/home/top-rated-businesses";
import { HomeOverviewResponse } from "@/components/home/types";
import { useToast } from "@/hooks/use-toast";
import { PostCreator } from "@/components/feed/post-creator";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { ConnectionDiscovery } from "@/components/widgets/connection-discovery";
import { ComplianceNews } from "@/components/widgets/compliance-news";

const EMPTY_OVERVIEW: HomeOverviewResponse = {
  stats: {
    verifiedBusinesses: 0,
    avgTrustScore: 0,
    activeConnections: 0,
    openSupportTickets: 0,
  },
  categories: [],
  businesses: [],
};

export default function Home() {
  const { toast } = useToast();
  const [homeData, setHomeData] = useState<HomeOverviewResponse>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [locationLabel, setLocationLabel] = useState("Detecting location...");
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [feedRefresh, setFeedRefresh] = useState(0);

  const refreshLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationLabel("Cape Town, South Africa");
      toast({ title: "Location unavailable", description: "Using Cape Town as default." });
      return;
    }

    setRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: { Accept: "application/json" },
            }
          ).catch(() => null);

          if (!response?.ok) {
            setLocationLabel("Cape Town, South Africa");
            toast({ title: "Live location fallback", description: "Could not reverse geocode, using Cape Town." });
            setRefreshingLocation(false);
            return;
          }

          const data = await response.json().catch(() => null);
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.suburb ||
            "Cape Town";
          const state = data?.address?.state || "Western Cape";
          const country = data?.address?.country || "South Africa";
          const label = `${city}, ${country}`;

          setLocationLabel(label);

          await fetch("/api/users/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: label,
              province: state,
            }),
          }).catch(() => null);
        } finally {
          setRefreshingLocation(false);
        }
      },
      () => {
        setLocationLabel("Cape Town, South Africa");
        setRefreshingLocation(false);
        toast({ title: "Location permission needed", description: "Enable location to get real-time local filtering." });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      }
    );
  };

  useEffect(() => {
    let active = true;

    const fetchOverview = async () => {
      setLoading(true);
      const response = await fetch("/api/home/overview").catch(() => null);
      if (!response?.ok) {
        if (active) setLoading(false);
        return;
      }

      const data = await response.json().catch(() => EMPTY_OVERVIEW);
      if (!active) return;

      setHomeData({
        stats: data.stats || EMPTY_OVERVIEW.stats,
        categories: data.categories || [],
        businesses: data.businesses || [],
      });
      setLoading(false);
    };

    fetchOverview();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refreshLocation();
    const interval = setInterval(() => {
      refreshLocation();
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return homeData.businesses.filter((business) => {
      const matchesCategory =
        selectedCategory === "All" ||
        business.industry.toLowerCase() === selectedCategory.toLowerCase();

      if (!normalizedQuery) return matchesCategory;

      const combined = `${business.displayName} ${business.companyName} ${business.headline} ${business.industry}`.toLowerCase();
      return matchesCategory && combined.includes(normalizedQuery);
    });
  }, [homeData.businesses, query, selectedCategory]);

  const featuredBusinesses = filteredBusinesses.slice(0, 2);
  const topBusinesses = filteredBusinesses.slice(0, 6);

  const handleConnect = async (userId: string, displayName: string) => {
    setConnectingId(userId);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Failed to connect" }));
        toast({ title: "Unable to connect", description: payload.error, variant: "destructive" });
        return;
      }

      toast({ title: "Connection request sent", description: `Your request to ${displayName} is pending.` });
    } catch {
      toast({ title: "Unable to connect", description: "Please try again.", variant: "destructive" });
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#06060a" }}>
      {/* Header */}
      <HomeHeader />

      {/* Main Content - white card panel that blends from black */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(to bottom, #06060a 0%, #0d0d14 4%, #fff 10%)",
          minHeight: "calc(100vh - 74px)",
        }}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden border border-black/[0.06]" style={{ marginTop: "28px" }}>
        {/* Hero Search Section */}
        <SearchInterface
          query={query}
          onQueryChange={setQuery}
          locationLabel={locationLabel}
          refreshingLocation={refreshingLocation}
          onRefreshLocation={refreshLocation}
          onSearchSubmit={() => {
            if (selectedCategory !== "All") {
              toast({ title: `Filtering by ${selectedCategory}`, description: "Search applied to selected category." });
            }
          }}
        />

        {/* Categories */}
        <PopularCategories
          categoriesData={homeData.categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Quick Stats */}
        <QuickStats stats={homeData.stats} loading={loading} />

        {/* Featured/Trending Businesses */}
        <FeaturedBusinesses
          businesses={featuredBusinesses}
          loading={loading}
          connectingId={connectingId}
          onConnect={handleConnect}
        />

        {/* Verified Banner */}
        <VerifiedBanner />

        {/* Top Rated Businesses */}
        <TopRatedBusinesses
          businesses={topBusinesses}
          loading={loading}
          connectingId={connectingId}
          onConnect={handleConnect}
        />

        {/* Live product features restored */}
        <section className="px-4 pb-8 pt-2">
          <div className="rounded-2xl border border-amber-200/60 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
              <h3 className="text-base font-bold text-slate-900">Community Pulse</h3>
              <p className="text-xs text-slate-500">Create posts, discover businesses, and follow compliance updates in real time.</p>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <PostCreator onPostCreated={() => setFeedRefresh((value) => value + 1)} />
              <ActivityFeed refreshTrigger={feedRefresh} />
              <ConnectionDiscovery />
              <ComplianceNews />
            </div>
          </div>
        </section>

        {/* Bottom Spacing */}
        <div className="h-16" />
        </div>
      </div>
    </div>
  );
}
