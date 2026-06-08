"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Filter, Map } from "lucide-react";
import FlashSpecialsCarousel from "@/components/discover/flash-specials-carousel";
import SmartMatchFeed from "@/components/discover/smart-match-feed";

export default function DiscoverPage() {
  const [location, setLocation] = useState("Cape Town, South Africa");

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log("User location:", position.coords);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-40 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-4">Discover & Connect</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input placeholder="What service are you looking for?" className="pl-10 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="flex-1 min-w-[250px] flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" />
              </div>
              <Button onClick={handleGetLocation} className="bg-cyan-500 text-gray-900 hover:bg-cyan-600 font-semibold gap-2">
                <MapPin className="h-4 w-4" />
                My Location
              </Button>
            </div>
            <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <FlashSpecialsCarousel />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SmartMatchFeed />
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
