"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, ArrowLeft } from "lucide-react";
import SmartMatchFeed from "@/components/discover/smart-match-feed";
import { GlassBackground } from "@/components/shared/glass-ui";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <GlassBackground>
      {/* Header */}
      <div className="border-b border-gray-200 sticky top-0 z-40 backdrop-blur-xl bg-white/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Discover & Connect</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name, industry, or keyword"
                className="pl-10 bg-white border-gray-300 text-gray-900"
              />
            </div>
            <Link href="/explore">
              <Button variant="outline" className="border-gray-200 text-gray-600 gap-2">
                <MapPin className="h-4 w-4" />
                Search Near Me
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SmartMatchFeed searchQuery={searchQuery} />
      </div>
    </GlassBackground>
  );
}
