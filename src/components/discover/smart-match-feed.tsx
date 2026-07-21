"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Zap, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  address: string;
  trust_score: number;
  verified: boolean;
  description: string;
}

export default function SmartMatchFeed({ searchQuery = "" }: { searchQuery?: string }) {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const handleConnect = async (rec: Recommendation) => {
    setConnectingId(rec.id);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: rec.user_id }),
      });
      if (res.ok) {
        setConnectedIds((prev) => new Set(prev).add(rec.id));
        toast({ title: 'Connection request sent', description: `Sent to ${rec.company_name}.` });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not send request', description: data.error || data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not send request', variant: 'destructive' });
    } finally {
      setConnectingId(null);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recommendations?limit=12');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? recommendations.filter((rec) =>
        [rec.company_name, rec.industry, rec.description].some((field) =>
          field?.toLowerCase().includes(query)
        )
      )
    : recommendations;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Zap className="h-5 w-5 text-purple-400" />
        Recommended For You
      </h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No matches for &quot;{searchQuery}&quot;.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((rec) => (
          <Card key={rec.id} className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-purple-500/20 hover:border-purple-500/50 transition-all p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold">{rec.company_name}</h4>
                    {rec.verified && <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">✓ Verified</span>}
                  </div>
                  <p className="text-sm text-gray-400">{rec.industry}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-bold">{(rec.trust_score / 20).toFixed(1)}</span>
                </div>
              </div>
              {rec.address && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4" />
                  {rec.address}
                </div>
              )}
              {rec.description && (
                <p className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded line-clamp-2">
                  💡 {rec.description}
                </p>
              )}
              <Button
                onClick={() => handleConnect(rec)}
                disabled={connectingId === rec.id || connectedIds.has(rec.id)}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 font-semibold disabled:opacity-60"
              >
                {connectingId === rec.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                ) : connectedIds.has(rec.id) ? (
                  <><Check className="h-4 w-4 mr-2" />Request Sent</>
                ) : (
                  "Connect & Grow"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
