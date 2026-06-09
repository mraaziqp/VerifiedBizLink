
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
};

export function ComplianceNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
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
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-wider">BizLink News</CardTitle>
          <button
            onClick={() => setNewsViewerOpen(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            View All
          </button>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : (
            news.map((item) => (
              <button
                key={item.id}
                onClick={() => setNewsViewerOpen(true)}
                className="flex items-start gap-2 group block w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${TAG_COLORS[item.category] ?? "bg-gray-100 text-gray-500"}`}>
                  {item.category}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <span className="flex items-center gap-1 mt-0.5">
                    <ExternalLink className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-400 font-medium">{item.source}</span>
                  </span>
                </div>
              </button>
            ))
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
          { label: "About", href: "/contact" },
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
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
