'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceCard } from '@/components/market/price-card';
import { MarketNewsCard } from '@/components/market/market-news-card';
import { MarketStats } from '@/components/market/market-stats';
import { PriceComparator } from '@/components/market/price-comparator';
import { Loader2, Search, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { GlassBackground } from '@/components/shared/glass-ui';

interface Price {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  category: string;
  high24h: number;
  low24h: number;
  trend: 'up' | 'down' | 'neutral';
  lastUpdated: string;
}

interface MarketNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  link: string;
}

// Matches only the categories /api/market/prices actually returns (Forex + Precious Metals) —
// Industrial Metals/Energy/Agriculture were listed here with no backing data source.
const CATEGORIES = ['Forex', 'Precious Metals'];
type SortOption = 'name' | 'price' | 'change' | 'changePercent';

export default function MarketplacePage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<Price | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('marketplace-watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading watchlist:', e);
      }
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('marketplace-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch commodity prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoadingPrices(true);
        const response = await fetch('/api/market/prices');
        const data = await response.json();
        setPrices(data.data || []);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch market news
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoadingNews(true);
        const response = await fetch('/api/market/news?limit=10');
        const data = await response.json();
        setNews(data.data || []);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort prices
  const filteredPrices = prices
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'price':
          compareValue = a.price - b.price;
          break;
        case 'change':
          compareValue = a.change - b.change;
          break;
        case 'changePercent':
          compareValue = a.changePercent - b.changePercent;
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  const handleWatchlistToggle = (symbol: string, isWatched: boolean) => {
    setWatchlist(prev =>
      isWatched
        ? [...prev, symbol]
        : prev.filter(s => s !== symbol)
    );
  };

  const watchedPrices = prices.filter(p => watchlist.includes(p.symbol));

  return (
    <GlassBackground>
      <div className="pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4 gap-2 border-gray-200 hover:border-gray-300">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Marketplace</h1>
              <p className="text-gray-600">Real-time commodity prices, market news, and analysis</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Updated {lastUpdated.toLocaleTimeString()}</p>
              <p className="text-gray-500">Auto-refresh every 30s</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="prices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100 border border-gray-200">
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="news">Market News</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist ({watchlist.length})</TabsTrigger>
          </TabsList>

          {/* Prices Tab */}
          <TabsContent value="prices" className="space-y-6">
            {/* Market Stats */}
            {!loadingPrices && <MarketStats prices={prices} />}

            {/* Price Comparator */}
            {!loadingPrices && <PriceComparator prices={prices} />}

            {/* Search, Filter, and Sort */}
            <div className="space-y-4">
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search commodities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 hover:border-gray-400 transition-colors"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-gray-500">Sort:</span>
                {(['name', 'price', 'change', 'changePercent'] as SortOption[]).map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      if (sortBy === option) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(option);
                        setSortOrder('asc');
                      }
                    }}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      sortBy === option
                        ? 'bg-blue-500/20 text-blue-700 border border-blue-500/30'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {option === 'name' ? 'Name' : option === 'price' ? 'Price' : option === 'change' ? 'Change $' : 'Change %'}
                    {sortBy === option && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Commodity Chart */}
            {selectedCommodity && (
              <div className="border border-gray-200 rounded-lg p-6 bg-white/80">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedCommodity.name}</h3>
                    <p className="text-gray-600">${selectedCommodity.price.toFixed(2)} {selectedCommodity.unit}</p>
                  </div>
                  <Button
                    onClick={() => setSelectedCommodity(null)}
                    variant="outline"
                    className="border-gray-200 hover:border-gray-300"
                  >
                    Close
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">24h Change</p>
                    <p className={`text-lg font-bold mt-1 ${selectedCommodity.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedCommodity.change >= 0 ? '+' : ''}{selectedCommodity.change.toFixed(2)} ({selectedCommodity.changePercent.toFixed(2)}%)
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">24h High</p>
                    <p className="text-lg font-bold mt-1 text-gray-900">{selectedCommodity.high24h.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">24h Low</p>
                    <p className="text-lg font-bold mt-1 text-gray-900">{selectedCommodity.low24h.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</p>
                    <p className="text-lg font-bold mt-1 text-gray-900">{new Date(selectedCommodity.lastUpdated).toLocaleTimeString()}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">Intraday history charting isn&apos;t available yet — showing the latest real snapshot from the data provider.</p>
              </div>
            )}

            {/* Price Cards Grid */}
            {loadingPrices ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrices.map(price => (
                  <div
                    key={price.symbol}
                    onClick={() => setSelectedCommodity(price)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <PriceCard
                      symbol={price.symbol}
                      name={price.name}
                      price={price.price}
                      change={price.change}
                      changePercent={price.changePercent}
                      unit={price.unit}
                      high24h={price.high24h}
                      low24h={price.low24h}
                      trend={price.trend}
                      category={price.category}
                      onWatchlistToggle={handleWatchlistToggle}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Market News Tab */}
          <TabsContent value="news" className="space-y-4">
            {loadingNews ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {news.map(item => (
                  <MarketNewsCard key={item.id} {...item} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="space-y-4">
            {watchlist.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-12 text-center bg-white/80">
                <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600">No items in watchlist yet</p>
                <p className="text-sm text-gray-500">Click the heart icon on commodity cards to add to your watchlist</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-white/80 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Your Watchlist:</strong> {watchedPrices.length} commodities tracked
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {watchedPrices.map(price => (
                    <div
                      key={price.symbol}
                      onClick={() => setSelectedCommodity(price)}
                      className="cursor-pointer hover:scale-105 transition-transform"
                    >
                      <PriceCard
                        symbol={price.symbol}
                        name={price.name}
                        price={price.price}
                        change={price.change}
                        changePercent={price.changePercent}
                        unit={price.unit}
                        high24h={price.high24h}
                        low24h={price.low24h}
                        trend={price.trend}
                        category={price.category}
                        onWatchlistToggle={handleWatchlistToggle}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </GlassBackground>
  );
}
