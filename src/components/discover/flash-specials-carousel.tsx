"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

const MOCK_SPECIALS = [
  { id: "1", business_name: "Cape Coffee Co", title: "50% Off Espresso", discount_percent: 50, expires_at: new Date(Date.now() + 4 * 3600000).toISOString(), tier: "Premium" },
  { id: "2", business_name: "Tech Solutions", title: "Free Consultation", discount_percent: 100, expires_at: new Date(Date.now() + 8 * 3600000).toISOString(), tier: "Enterprise" },
  { id: "3", business_name: "Meals Express", title: "30% Lunch Specials", discount_percent: 30, expires_at: new Date(Date.now() + 6 * 3600000).toISOString(), tier: "Verified" },
];

export default function FlashSpecialsCarousel() {
  const [specials, setSpecials] = useState(MOCK_SPECIALS);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getTierColor = (tier: string) => {
    if (tier === "Enterprise") return "border-purple-500 shadow-lg shadow-purple-500/50";
    if (tier === "Premium") return "border-cyan-500 shadow-lg shadow-cyan-500/50";
    return "border-yellow-500 shadow-lg shadow-yellow-500/50";
  };

  return (
    <div className="relative mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-400 animate-pulse" />
        <h3 className="text-lg font-bold text-white">Flash Specials</h3>
        <span className="text-xs text-orange-400 ml-auto font-semibold">HOT DEALS 🔥</span>
      </div>
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-4">
          {specials.map((special) => (
            <Card key={special.id} className={`min-w-[280px] bg-gradient-to-br from-gray-800/60 to-gray-900/60 border-2 backdrop-blur-xl p-4 ${getTierColor(special.tier)}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div><p className="text-xs text-gray-400">{special.business_name}</p><h4 className="text-lg font-bold text-white mt-1">{special.title}</h4></div>
                  <p className="text-3xl font-bold text-cyan-400">{special.discount_percent}%</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                  <span className="text-xs text-gray-400">Expires in:</span>
                  <span className="text-sm font-bold text-orange-400">{getTimeRemaining(special.expires_at)}</span>
                </div>
                <button className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-gray-900 font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all">Claim Deal</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
