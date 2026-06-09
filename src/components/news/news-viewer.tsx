'use client';

import React, { useState, useEffect } from 'react';
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
};

export function NewsViewer({ isOpen, onClose, newsItem }: NewsViewerProps) {
  const [loading, setLoading] = useState(false);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(newsItem || null);

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
      const response = await fetch('/api/news?limit=20');
      if (response.ok) {
        const data = await response.json();
        setAllNews(data.news || []);
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

  const colors = selectedNews
    ? CATEGORY_COLORS[selectedNews.category] || CATEGORY_COLORS.REGULATORY
    : CATEGORY_COLORS.REGULATORY;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Business Compliance News</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-full">
              {/* News List */}
              <div className="md:col-span-1 border-r border-gray-700 overflow-y-auto max-h-[70vh]">
                <div className="divide-y divide-gray-700">
                  {allNews.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedNews(item)}
                      className={`w-full p-4 text-left transition-colors ${
                        selectedNews?.id === item.id
                          ? 'bg-gray-800 border-l-4 border-blue-500'
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
                <div className="md:col-span-2 p-8 overflow-y-auto max-h-[70vh]">
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
                        <Calendar className="w-4 h-4 text-blue-400" />
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Info Box */}
                  <div className={`mt-8 p-4 rounded-lg ${colors.bg} border border-gray-700`}>
                    <p className={`text-sm ${colors.text}`}>
                      💡 <strong>Why this matters:</strong> Staying updated on regulatory changes helps ensure your business remains compliant with South African legal requirements.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
