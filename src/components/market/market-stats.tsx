'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface Price {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

interface MarketStatsProps {
  prices: Price[];
}

export function MarketStats({ prices }: MarketStatsProps) {
  if (prices.length === 0) {
    return null;
  }

  // Calculate top gainers and losers
  const sorted = [...prices].sort((a, b) => b.changePercent - a.changePercent);
  const topGainers = sorted.slice(0, 3);
  const topLosers = sorted.slice(-3).reverse();

  // Calculate market stats
  const gainers = prices.filter(p => p.change > 0).length;
  const losers = prices.filter(p => p.change < 0).length;
  const avgChange = (prices.reduce((sum, p) => sum + p.changePercent, 0) / prices.length).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      {/* Market Overview */}
      <div className="border border-zinc-800 rounded-lg p-5 bg-gradient-to-br from-zinc-900 to-black">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4">Market Overview</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gainers</span>
            <span className="text-lg font-bold text-green-500">{gainers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Losers</span>
            <span className="text-lg font-bold text-red-500">{losers}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
            <span className="text-sm text-zinc-400">Avg Change</span>
            <span className={`text-lg font-bold ${parseFloat(avgChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {parseFloat(avgChange) >= 0 ? '+' : ''}{avgChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Top Gainers */}
      <div className="border border-zinc-800 rounded-lg p-5 bg-gradient-to-br from-green-950/20 to-black">
        <h3 className="text-sm font-semibold text-green-400 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Top Gainers
        </h3>
        <div className="space-y-2">
          {topGainers.map(price => (
            <div key={price.symbol} className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">{price.symbol}</span>
              <span className="font-semibold text-green-500">+{price.changePercent.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="border border-zinc-800 rounded-lg p-5 bg-gradient-to-br from-red-950/20 to-black">
        <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Top Losers
        </h3>
        <div className="space-y-2">
          {topLosers.map(price => (
            <div key={price.symbol} className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">{price.symbol}</span>
              <span className="font-semibold text-red-500">{price.changePercent.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
