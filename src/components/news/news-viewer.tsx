'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Loader2,
  Calendar,
  Building2,
  Badge,
} from 'lucide-react';

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

interface NewsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  newsItem?: NewsItem;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  PRIVACY: { bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'bg-blue-500/20' },
  REGULATORY: { bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20' },
  TAX: { bg: 'bg-green-500/10', text: 'text-green-400', badge: 'bg-green-500/20' },
  'B-BBEE': { bg: 'bg-orange-500/10', text: 'text-orange-400', badge: 'bg-orange-500/20' },
  CONSUMER: { bg: 'bg-pink-500/10', text: 'text-pink-400', badge: 'bg-pink-500/20' },
  CORPORATE: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', badge: 'bg-indigo-500/20' },
  BUSINESS: { bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20' },
  MARKETS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20' },
  POLITICS: { bg: 'bg-rose-500/10', text: 'text-rose-400', badge: 'bg-rose-500/20' },
  TECH: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20' },
};

const WHY_IT_MATTERS: Record<string, string> = {
  PRIVACY: 'Staying updated on data protection rules helps keep your business compliant with POPIA and related regulations.',
  REGULATORY: 'Regulatory changes can directly affect how your business registers, reports, and operates in South Africa.',
  TAX: 'Tax and VAT updates affect pricing, invoicing, and your compliance obligations to SARS.',
  'B-BBEE': 'B-BBEE scorecard changes can affect your procurement eligibility and partnership opportunities.',
  CONSUMER: 'Consumer protection updates shape what disclosures and guarantees your business must provide.',
  CORPORATE: 'Corporate law changes affect governance, disclosure, and reporting requirements for your business.',
  BUSINESS: 'Broader business trends help you benchmark and spot opportunities in the South African market.',
  MARKETS: 'Market movements affect costs, currency exposure, and investment decisions for your business.',
  POLITICS: 'Policy and political developments can shift regulation, trade conditions, and business confidence.',
  TECH: 'Technology trends affect tooling, competition, and digital strategy for your business.',
};

export function NewsViewer({ isOpen, onClose, newsItem }: NewsViewerProps) {
  const [loading, setLoading] = useState(false);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(newsItem || null);
  const [live, setLive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllNews();
    }
  }, [isOpen]);

  useEffect(() => {
    if (newsItem) {
      setSelectedNews(newsItem);
    }
  }, [newsItem]);

  const fetchAllNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news?limit=24');
      if (response.ok) {
        const data = await response.json();
        setAllNews(data.news || []);
        setLive(!!data.live);
        if (!selectedNews && data.news.length > 0) {
          setSelectedNews(data.news[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const categories = Array.from(new Set(allNews.map((n) => n.category)));
  const visibleNews = categoryFilter ? allNews.filter((n) => n.category === categoryFilter) : allNews;

  const colors = selectedNews
    ? CATEGORY_COLORS[selectedNews.category] || CATEGORY_COLORS.REGULATORY
    : CATEGORY_COLORS.REGULATORY;

  // Portal straight to document.body: the page wrapper (src/app/page.tsx)
  // uses Tailwind's `isolate`, which creates a CSS stacking context. Any
  // z-index inside that boundary — no matter how high — can never out-rank
  // position:fixed elements declared OUTSIDE it (the floating chat button,
  // the "Get Verified" nudge, the mobile bottom nav all live in the root
  // layout, outside this page's isolate wrapper). Without the portal those
  // floating buttons rendered on top of this modal.
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              BizLink News
              {live && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          {categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${!categoryFilter ? 'bg-amber-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${categoryFilter === cat ? 'bg-amber-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
              {/* News List */}
              <div className="lg:col-span-1 border-r border-gray-700 overflow-y-auto max-h-[80vh] min-h-96">
                <div className="divide-y divide-gray-700">
                  {visibleNews.length === 0 && (
                    <p className="p-6 text-center text-sm text-gray-500">No stories in this category right now.</p>
                  )}
                  {visibleNews.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedNews(item)}
                      className={`w-full p-4 text-left transition-colors ${
                        selectedNews?.id === item.id
                          ? 'bg-gray-800 border-l-4 border-amber-400'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge className={`${colors.badge} ${colors.text} text-xs px-2 py-1 flex-shrink-0 mt-1`}>
                          {item.category}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* News Details */}
              {selectedNews && (
                <div className="lg:col-span-2 p-8 overflow-y-auto max-h-[80vh] min-h-96">
                  {/* Category Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <Badge className={`${colors.badge} ${colors.text}`}>
                      {selectedNews.category}
                    </Badge>
                    {selectedNews.priority === 'high' && (
                      <Badge className="bg-red-500/20 text-red-400">High Priority</Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                    {selectedNews.title}
                  </h3>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-700">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Published</p>
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-4 h-4 text-amber-400" />
                    {/* spinner */}
                        <span>{new Date(selectedNews.date).toLocaleDateString('en-ZA')}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Source</p>
                      <div className="flex items-center gap-2 text-white">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span>{selectedNews.source}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    {selectedNews.description}
                  </p>

                  {/* Action Button */}
                  <a
                    href={selectedNews.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-amber-300"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Info Box */}
                  <div className={`mt-8 p-4 rounded-lg ${colors.bg} border border-gray-700`}>
                    <p className={`text-sm ${colors.text}`}>
                      💡 <strong>Why this matters:</strong> {WHY_IT_MATTERS[selectedNews.category] || WHY_IT_MATTERS.REGULATORY}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
