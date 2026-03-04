
"use client";

import { UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";

const SUGGESTIONS = [
  { id: 1, name: "Apex Dynamics", industry: "AI Automation", avatar: "https://picsum.photos/seed/sug1/100/100" },
  { id: 2, name: "BioGen Lab", industry: "Pharmaceuticals", avatar: "https://picsum.photos/seed/sug2/100/100" },
  { id: 3, name: "Skyline Realty", industry: "Commercial Real Estate", avatar: "https://picsum.photos/seed/sug3/100/100" },
];

export function ConnectionDiscovery() {
  return (
    <Card className="shadow-sm border-none overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900">Recommended for You</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SUGGESTIONS.map((sug) => (
          <div key={sug.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gray-100">
                <AvatarImage src={sug.avatar} />
                <AvatarFallback>{sug.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{sug.name}</span>
                  <GoldCheckmark className="scale-75" />
                </div>
                <span className="text-xs text-gray-500">{sug.industry}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full border-primary/20 hover:border-primary hover:bg-primary hover:text-white transition-all">
              <UserPlus className="h-3 w-3 mr-1.5" />
              Connect
            </Button>
          </div>
        ))}
        <Button variant="ghost" className="w-full text-xs text-primary font-bold hover:bg-primary/10 py-6 mt-2">
          View all recommendations
        </Button>
      </CardContent>
    </Card>
  );
}
