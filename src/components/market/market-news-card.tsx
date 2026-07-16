'use client';

import { formatDistanceToNow } from 'date-fns';
import { ExternalLink } from 'lucide-react';

interface MarketNewsCardProps {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  link: string;
}

export function MarketNewsCard({ title, summary, source, date, link }: MarketNewsCardProps) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors bg-zinc-900/50"
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <h3 className="text-base font-semibold text-white flex-1 line-clamp-2">{title}</h3>
        <ExternalLink className="h-4 w-4 text-zinc-500 shrink-0 mt-1" />
      </div>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{summary}</p>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-zinc-500">{source}</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-500">{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>
      </div>
    </a>
  );
}
