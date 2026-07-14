"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users, TrendingUp } from "lucide-react";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { HomeHeader } from "@/components/layout/home-header";
import { SearchInterface } from "@/components/home/search-interface";
import { PopularCategories } from "@/components/home/popular-categories";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { VerificationHero } from "@/components/home/verification-hero";
import { HomeOverviewResponse } from "@/components/home/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PostCreator } from "@/components/feed/post-creator";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { ConnectionDiscovery } from "@/components/widgets/connection-discovery";
import { ComplianceNews } from "@/components/widgets/compliance-news";

const EMPTY_OVERVIEW: HomeOverviewResponse = {
  stats: { verifiedBusinesses: 0, avgTrustScore: 0, activeConnections: 0, openSupportTickets: 0 },
  categories: [],
  businesses: [],
};

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
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
      return;
    }
    setRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } }
          ).catch(() => null);
          if (!response?.ok) { setLocationLabel("Cape Town, South Africa"); return; }
          const data = await response.json().catch(() => null);
          const city = data?.address?.city || data?.address?.town || data?.address?.suburb || "Cape Town";
          const country = data?.address?.country || "South Africa";
          const label = `${city}, ${country}`;
          setLocationLabel(label);
          await fetch("/api/users/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location: label, province: data?.address?.state }),
          }).catch(() => null);
        } finally { setRefreshingLocation(false); }
      },
      () => { setLocationLabel("Cape Town, South Africa"); setRefreshingLocation(false); },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  };

  useEffect(() => {
    let active = true;
    fetch("/api/home/overview").catch(() => null).then(async (r) => {
      if (!r?.ok || !active) return;
      const data = await r.json().catch(() => EMPTY_OVERVIEW);
      if (!active) return;
      setHomeData({ stats: data.stats || EMPTY_OVERVIEW.stats, categories: data.categories || [], businesses: data.businesses || [] });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    refreshLocation();
    const interval = setInterval(refreshLocation, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBusinesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return homeData.businesses.filter((b) => {
      const matchesCat = selectedCategory === "All" || b.industry.toLowerCase() === selectedCategory.toLowerCase();
      if (!q) return matchesCat;
      const text = `${b.displayName} ${b.companyName} ${b.headline} ${b.industry}`.toLowerCase();
      return matchesCat && text.includes(q);
    });
  }, [homeData.businesses, query, selectedCategory]);

  const handleConnect = async (userId: string, displayName: string) => {
    setConnectingId(userId);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({ error: "Failed to connect" }));
        toast({ title: "Unable to connect", description: p.error, variant: "destructive" });
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
    <div className="min-h-screen bg-gray-50 relative isolate">
      {/* Faded Cape Town hero background — fixed (not background-attachment:
          fixed, which is unreliable on iOS Safari) so it stays put while the
          page scrolls, with a gradient wash to keep foreground content
          fully legible against the light theme. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center opacity-[0.09]"
        style={{ backgroundImage: "url('/hero-cape-town.jpg')" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-gray-50 via-gray-50/70 to-gray-50"
      />

      {/* Mobile-only header */}
      <div className="md:hidden">
        <HomeHeader />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left sidebar — desktop only */}
          <aside className="hidden md:block md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          {/* Main feed column */}
          <main className="md:col-span-6 space-y-4">
            {/* Verification Hero */}
            <VerificationHero />

            {/* Search + location */}
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

            {/* Category chips */}
            <PopularCategories
              categoriesData={homeData.categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Feed — the compose box and activity feed assume a logged-in
                identity (whose post, whose likes, whose connections), so
                anonymous visitors get a discovery-focused sign-up prompt
                here instead of a feed they can't meaningfully use. */}
            {user ? (
              <>
                <PostCreator onPostCreated={() => setFeedRefresh((v) => v + 1)} />
                <ActivityFeed refreshTrigger={feedRefresh} />
              </>
            ) : (
              <div className="rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-50 to-white p-6 sm:p-8 text-center space-y-4 shadow-sm">
                <div className="flex justify-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-yellow-600" />
                  <Users className="h-8 w-8 text-yellow-600" />
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Join VerifiedBizLink</h2>
                  <p className="text-gray-600 mt-1 max-w-md mx-auto">
                    Create a free account to connect with verified businesses, post updates, and build your trusted network.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center pt-1">
                  <Link href="/signup" className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold transition-colors">
                    Create Free Account
                  </Link>
                  <Link href="/login" className="px-6 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold transition-colors">
                    Sign In
                  </Link>
                </div>
              </div>
            )}
          </main>

          {/* Right column — desktop only */}
          <aside className="hidden md:flex md:col-span-3 flex-col gap-4 sticky top-6">
            <FeaturedBusinesses
              businesses={filteredBusinesses.slice(0, 3)}
              loading={loading}
              connectingId={connectingId}
              onConnect={handleConnect}
            />
            {user && <ConnectionDiscovery />}
            <ComplianceNews />
          </aside>

        </div>

        {/* Mobile-only: discovery + news below feed */}
        <div className="md:hidden mt-4 space-y-4">
          <FeaturedBusinesses
            businesses={filteredBusinesses.slice(0, 3)}
            loading={loading}
            connectingId={connectingId}
            onConnect={handleConnect}
          />
          <ComplianceNews />
        </div>
      </div>
    </div>
  );
}
