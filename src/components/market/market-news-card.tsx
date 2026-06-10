'use client';

import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface MarketNewsCardProps {
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

export function MarketNewsCard({
  id,
  title,
  summary,
  source,
  category,
  date,
  impact,
  importance,
  relatedCommodities
}: MarketNewsCardProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'negative':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'neutral':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'mixed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-zinc-500/20 text-zinc-400';
      default:
        return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div className="border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors bg-zinc-900/50">
      <div className="flex justify-between items-start gap-4 mb-3">
        <h3 className="text-base font-semibold text-white flex-1 line-clamp-2">{title}</h3>
        <Badge variant="outline" className={getImpactColor(impact)}>
          {impact.charAt(0).toUpperCase() + impact.slice(1)}
        </Badge>
      </div>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{summary}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {relatedCommodities.map(commodity => (
          <Badge key={commodity} variant="secondary" className="text-xs">
            {commodity}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">{source}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getImportanceColor(importance)}`}>
          {importance.charAt(0).toUpperCase() + importance.slice(1)}
        </span>
      </div>
    </div>
  );
}
