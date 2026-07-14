
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Zap, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewsViewer } from "@/components/news/news-viewer";

interface NewsItem {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  date: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
}

const TAG_COLORS: Record<string, string> = {
  PRIVACY: "bg-blue-100 text-blue-700",
  REGULATORY: "bg-purple-100 text-purple-700",
  TAX: "bg-green-100 text-green-700",
  "B-BBEE": "bg-orange-100 text-orange-700",
  CONSUMER: "bg-pink-100 text-pink-700",
  CORPORATE: "bg-gray-100 text-gray-600",
  BUSINESS: "bg-amber-100 text-amber-700",
  MARKETS: "bg-emerald-100 text-emerald-700",
  POLITICS: "bg-rose-100 text-rose-700",
  TECH: "bg-indigo-100 text-indigo-700",
};

const DOT_COLORS: Record<string, string> = {
  PRIVACY: "bg-blue-500", REGULATORY: "bg-purple-500", TAX: "bg-green-500",
  "B-BBEE": "bg-orange-500", CONSUMER: "bg-pink-500", CORPORATE: "bg-gray-400",
  BUSINESS: "bg-amber-500", MARKETS: "bg-emerald-500", POLITICS: "bg-rose-500", TECH: "bg-indigo-500",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function ComplianceNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newsViewerOpen, setNewsViewerOpen] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news?limit=6');
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
        setLive(!!data.live);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const [featured, ...rest] = news;

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm border border-gray-100 overflow-hidden bg-white">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider">
            BizLink News
            {live && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 normal-case tracking-normal">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            )}
          </CardTitle>
          <button
            onClick={() => setNewsViewerOpen(true)}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            View All →
          </button>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : news.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">No news available right now.</p>
          ) : (
            <>
              {/* Featured story */}
              {featured && (
                <button
                  onClick={() => setNewsViewerOpen(true)}
                  className="group mb-2 block w-full rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-3 text-left transition-all hover:border-amber-200 hover:shadow-md"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${TAG_COLORS[featured.category] ?? "bg-gray-100 text-gray-500"}`}>
                      {featured.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{timeAgo(featured.date)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                    {featured.title}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 leading-snug line-clamp-2">{featured.description}</p>
                  <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                    <ExternalLink className="h-2.5 w-2.5" /> {featured.source}
                  </span>
                </button>
              )}

              {/* Rest as a tight list */}
              {rest.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setNewsViewerOpen(true)}
                  className="group flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-gray-50"
                >
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLORS[item.category] ?? "bg-gray-300"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                      {item.title}
                    </p>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                      <span>{item.source}</span><span>·</span><span>{timeAgo(item.date)}</span>
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <CardContent className="p-5 space-y-3">
          <div className="bg-primary/20 w-fit p-2.5 rounded-xl border border-primary/30">
            <Zap className="h-5 w-5 text-primary fill-primary" />
          </div>
          <h3 className="text-sm font-bold leading-tight">Elevate Your Business Status</h3>
          <p className="text-xs text-gray-300 font-medium leading-relaxed">Get the Verified Badge and appear higher in partner search results.</p>
          <Button className="w-full bg-primary text-gray-900 hover:bg-yellow-300 font-bold rounded-xl h-10 text-sm" asChild>
            <Link href="/vetting">Start Vetting</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
        {[
          { label: "About", href: "/about" },
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
          { label: "Refunds", href: "/refund-policy" },
          { label: "Help", href: "/contact" },
        ].map((link) => (
          <Link key={link.label} href={link.href}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
            {link.label}
          </Link>
        ))}
        <p className="text-[10px] text-gray-300 w-full mt-1 font-medium">
          VerifiedBizLink © {new Date().getFullYear()}
        </p>
      </div>

      <NewsViewer isOpen={newsViewerOpen} onClose={() => setNewsViewerOpen(false)} />
    </div>
  );
}
