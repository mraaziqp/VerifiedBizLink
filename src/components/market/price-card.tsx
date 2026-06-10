'use client';

import { Heart, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PriceCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  high24h: number;
  low24h: number;
  trend: 'up' | 'down' | 'neutral';
  category: string;
  onWatchlistToggle?: (symbol: string, isWatched: boolean) => void;
}

export function PriceCard({
  symbol,
  name,
  price,
  change,
  changePercent,
  unit,
  high24h,
  low24h,
  trend,
  category,
  onWatchlistToggle
}: PriceCardProps) {
  const [isWatched, setIsWatched] = useState(false);

  const handleToggle = () => {
    setIsWatched(!isWatched);
    onWatchlistToggle?.(symbol, !isWatched);
  };

  const isPositive = change >= 0;
  const trendIcon = trend === 'up' ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />;

  return (
    <div className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors bg-zinc-900/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-zinc-400 mb-1">{category}</p>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="text-xs text-zinc-500">{symbol}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className={isWatched ? 'text-red-500 hover:text-red-400' : 'text-zinc-500 hover:text-zinc-400'}
        >
          <Heart className="h-5 w-5" fill={isWatched ? 'currentColor' : 'none'} />
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-white mb-1">${price.toFixed(2)}</p>
        <p className="text-xs text-zinc-400">{unit}</p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {trendIcon}
        <span className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-zinc-500 mb-1">24h High</p>
          <p className="text-white font-semibold">${high24h.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-1">24h Low</p>
          <p className="text-white font-semibold">${low24h.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
