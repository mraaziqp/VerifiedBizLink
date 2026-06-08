"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Zap } from "lucide-react";

const MOCK_RECOMMENDATIONS = [
  { id: "1", name: "Trusted Accountants", category: "Finance", reason: "For startups", rating: 4.8, location: "Cape Town CBD", verified: true, tier: "Premium" },
  { id: "2", name: "Legal Services Pro", category: "Legal", reason: "Complements your business", rating: 4.9, location: "Maitland", verified: true, tier: "Enterprise" },
  { id: "3", name: "Marketing Experts", category: "Marketing", reason: "Trending in your area", rating: 4.6, location: "Plattekloof", verified: true, tier: "Premium" },
  { id: "4", name: "IT Solutions", category: "Technology", reason: "Many use this", rating: 4.7, location: "Sandton", verified: true, tier: "Verified" },
];

export default function SmartMatchFeed() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Zap className="h-5 w-5 text-purple-400" />
        Recommended For You
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_RECOMMENDATIONS.map((rec) => (
          <Card key={rec.id} className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-purple-500/20 hover:border-purple-500/50 transition-all p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div><div className="flex items-center gap-2"><h4 className="text-white font-bold">{rec.name}</h4>{rec.verified && <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">✓ Verified</span>}</div><p className="text-sm text-gray-400">{rec.category}</p></div>
                <div className="flex items-center gap-1 text-yellow-400"><Star className="h-4 w-4 fill-current" /><span className="text-sm font-bold">{rec.rating}</span></div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400"><MapPin className="h-4 w-4" />{rec.location}</div>
              <p className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">💡 {rec.reason}</p>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 font-semibold">Connect & Grow</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
