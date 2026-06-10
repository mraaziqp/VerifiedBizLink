'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceCard } from '@/components/market/price-card';
import { MarketNewsCard } from '@/components/market/market-news-card';
import { PriceChart } from '@/components/market/price-chart';
import { MarketStats } from '@/components/market/market-stats';
import { PriceComparator } from '@/components/market/price-comparator';
import { Loader2, Search, ArrowLeft, AlertCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

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
  category: string;
  date: string;
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
  importance: 'high' | 'medium' | 'low';
  relatedCommodities: string[];
}

const generateHistoricalData = (currentPrice: number) => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const time = `${i}h ago`;
    const variance = (Math.random() - 0.5) * 2 * currentPrice * 0.05;
    data.push({
      time,
      price: parseFloat((currentPrice + variance).toFixed(2))
    });
  }
  return data;
};

const CATEGORIES = ['Precious Metals', 'Industrial Metals', 'Energy', 'Agriculture'];
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

  const chartData = selectedCommodity ? generateHistoricalData(selectedCommodity.price) : [];
  const watchedPrices = prices.filter(p => watchlist.includes(p.symbol));

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4 gap-2 border-zinc-800 hover:border-zinc-700">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Marketplace</h1>
              <p className="text-zinc-400">Real-time commodity prices, market news, and analysis</p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p>Updated {lastUpdated.toLocaleTimeString()}</p>
              <p className="text-zinc-600">Auto-refresh every 30s</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="prices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-zinc-900 border border-zinc-800">
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Search commodities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:border-zinc-700 transition-colors"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-zinc-400">Sort:</span>
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
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700'
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
              <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedCommodity.name}</h3>
                    <p className="text-zinc-400">${selectedCommodity.price.toFixed(2)} {selectedCommodity.unit}</p>
                  </div>
                  <Button
                    onClick={() => setSelectedCommodity(null)}
                    variant="outline"
                    className="border-zinc-800 hover:border-zinc-700"
                  >
                    Close
                  </Button>
                </div>
                <PriceChart
                  data={chartData}
                  commodity={selectedCommodity.symbol}
                  color={selectedCommodity.change >= 0 ? '#22c55e' : '#ef4444'}
                  height={300}
                />
              </div>
            )}

            {/* Price Cards Grid */}
            {loadingPrices ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
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
                <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
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
              <div className="border border-zinc-800 rounded-lg p-12 text-center bg-zinc-900/50">
                <AlertCircle className="h-8 w-8 text-zinc-500 mx-auto mb-4" />
                <p className="text-zinc-400">No items in watchlist yet</p>
                <p className="text-sm text-zinc-500">Click the heart icon on commodity cards to add to your watchlist</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <p className="text-sm text-zinc-400">
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
  );
}
