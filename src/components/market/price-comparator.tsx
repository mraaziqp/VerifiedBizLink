'use client';

import { useState } from 'react';

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

// Simple decimals-only comparison — no charts. Non-traders find candlestick
// charts meaningless; a plain number table is easier to scan at a glance.
export function PriceComparator({ prices }: PriceComparatorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol].slice(0, 6)
    );
  };

  const selectedPrices = prices.filter((p) => selected.includes(p.symbol));

  return (
    <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Compare Commodities</h3>
        <div className="flex flex-wrap gap-2">
          {prices.slice(0, 10).map((price) => (
            <button
              key={price.symbol}
              onClick={() => toggleSelection(price.symbol)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                selected.includes(price.symbol)
                  ? 'bg-primary text-gray-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {price.symbol}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="mt-3 text-xs text-zinc-400">Comparing {selected.length}/6</p>
        )}
      </div>

      {selectedPrices.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Instrument</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {selectedPrices.map((p) => (
                <tr key={p.symbol}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.symbol}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {p.price.toLocaleString('en-ZA', { maximumFractionDigits: 4 })}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      p.change > 0 ? 'text-green-400' : p.change < 0 ? 'text-red-400' : 'text-zinc-400'
                    }`}
                  >
                    {p.change === 0 ? '—' : `${p.change > 0 ? '+' : ''}${p.changePercent.toFixed(2)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
