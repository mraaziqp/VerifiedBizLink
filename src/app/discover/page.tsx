"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Map } from "lucide-react";
import SmartMatchFeed from "@/components/discover/smart-match-feed";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-40 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-4">Discover & Connect</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name, industry, or keyword"
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Link href="/explore">
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
                <MapPin className="h-4 w-4" />
                Search Near Me
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SmartMatchFeed searchQuery={searchQuery} />
          </div>
          <div className="h-[500px] rounded-lg border border-cyan-500/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl p-4 flex items-center justify-center">
            <div className="text-center">
              <Map className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
              <p className="text-gray-400">Interactive Map Coming Soon</p>
              <p className="text-xs text-gray-500 mt-2">Verified businesses will appear as glowing pins</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
