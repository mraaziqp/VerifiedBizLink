'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Price {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

interface PriceComparatorProps {
  prices: Price[];
}

export function PriceComparator({ prices }: PriceComparatorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  // Generate comparison data
  const generateComparisonData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const dataPoint: any = { time: `${i}h` };
      selected.forEach(symbol => {
        const price = prices.find(p => p.symbol === symbol);
        if (price) {
          const variance = (Math.random() - 0.5) * 2 * price.price * 0.05;
          dataPoint[symbol] = parseFloat((price.price + variance).toFixed(2));
        }
      });
      data.push(dataPoint);
    }
    return data;
  };

  const colors = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  const comparisonData = selected.length > 0 ? generateComparisonData() : [];

  const toggleSelection = (symbol: string) => {
    setSelected(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol].slice(0, 5) // Max 5 commodities to compare
    );
  };

  return (
    <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50 mb-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compare Commodities</h3>
        <div className="flex flex-wrap gap-2">
          {prices.slice(0, 10).map((price, idx) => (
            <button
              key={price.symbol}
              onClick={() => toggleSelection(price.symbol)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selected.includes(price.symbol)
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              style={selected.includes(price.symbol) ? { backgroundColor: colors[idx % colors.length], color: 'white' } : {}}
            >
              {price.symbol}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-zinc-400 mt-3">Selected: {selected.length}/5</p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" stroke="#71717a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              {selected.map((symbol, idx) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
