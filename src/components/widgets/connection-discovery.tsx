
"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface Suggestion {
  id: string;
  full_name: string;
  headline: string;
  avatar_url: string;
  company_name: string;
  industry: string;
  business_status: string;
  trust_score: number;
}

// Fallback for when no verified connections exist in DB yet
const FALLBACK_SUGGESTIONS = [
  { id: '1', full_name: 'Apex Dynamics', headline: 'AI Automation', avatar_url: 'https://picsum.photos/seed/sug1/100/100', company_name: 'Apex Dynamics', industry: 'AI Automation', business_status: 'verified', trust_score: 95 },
  { id: '2', full_name: 'BioGen Lab', headline: 'Pharmaceuticals', avatar_url: 'https://picsum.photos/seed/sug2/100/100', company_name: 'BioGen Lab', industry: 'Pharmaceuticals', business_status: 'verified', trust_score: 90 },
  { id: '3', full_name: 'Skyline Realty', headline: 'Commercial Real Estate', avatar_url: 'https://picsum.photos/seed/sug3/100/100', company_name: 'Skyline Realty', industry: 'Commercial Real Estate', business_status: 'verified', trust_score: 85 },
];

export function ConnectionDiscovery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setSuggestions(FALLBACK_SUGGESTIONS as any);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/connections/suggestions');
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions?.length > 0 ? data.suggestions : FALLBACK_SUGGESTIONS as any);
        }
      } catch {
        setSuggestions(FALLBACK_SUGGESTIONS as any);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user]);

  const handleConnect = async (id: string, name: string) => {
    if (!user) {
      toast({ title: "Sign in to connect", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: id }),
      });
      if (res.ok) {
        setSentRequests(prev => new Set([...prev, id]));
        toast({ title: "Connection request sent!", description: `Your request to ${name} is pending.` });
      }
    } catch {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-sm border-none overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900">Recommended for You</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        ) : (
          suggestions.slice(0, 4).map((sug) => {
            const isSent = sentRequests.has(sug.id);
            const displayName = sug.company_name || sug.full_name;
            const initials = displayName[0]?.toUpperCase();
            return (
              <div key={sug.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-gray-100">
                    <AvatarImage src={sug.avatar_url || `https://picsum.photos/seed/${sug.id}/100/100`} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{displayName}</span>
                      {sug.business_status === 'verified' && <GoldCheckmark className="scale-75" />}
                    </div>
                    <span className="text-xs text-gray-500">{sug.industry || sug.headline}</span>
                  </div>
                </div>
                <Button
                  variant={isSent ? "secondary" : "outline"}
                  size="sm"
                  className={`rounded-full transition-all ${isSent ? 'bg-green-50 text-green-600 border-green-200' : 'border-primary/20 hover:border-primary hover:bg-primary hover:text-white'}`}
                  onClick={() => handleConnect(sug.id, displayName)}
                  disabled={isSent}
                >
                  {isSent ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1.5" />Sent</>
                  ) : (
                    <><UserPlus className="h-3 w-3 mr-1.5" />Connect</>
                  )}
                </Button>
              </div>
            );
          })
        )}
        <Button variant="ghost" className="w-full text-xs text-primary font-bold hover:bg-primary/10 py-6 mt-2" asChild>
          <Link href="/network">View all recommendations</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
