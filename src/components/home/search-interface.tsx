"use client";

import { KeyboardEvent } from "react";
import { Loader2, Search, MapPin, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInterfaceProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  locationLabel: string;
  refreshingLocation: boolean;
  onRefreshLocation: () => void;
}

export function SearchInterface({
  query,
  onQueryChange,
  onSearchSubmit,
  locationLabel,
  refreshingLocation,
  onRefreshLocation,
}: SearchInterfaceProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onSearchSubmit();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Main Heading */}
      <div className="text-center py-2 space-y-1">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Find{" "}
          <span className="text-amber-500 font-black">
            Trusted
          </span>{" "}
          Businesses
        </h2>
        <p className="text-sm md:text-base text-slate-500 font-medium">Verified, reliable &amp; near you</p>
      </div>

      {/* Search Input Box */}
      <div className="relative rounded-2xl shadow-xs">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
        <Input
          type="text"
          placeholder="What service are you looking for?"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-4 bg-white/95 border-slate-200/90 text-slate-900 placeholder:text-slate-400 h-13 rounded-2xl focus:bg-white focus:border-amber-400 font-medium shadow-xs text-sm md:text-base"
        />
      </div>

      {/* Location Selector */}
      <div
        role="button"
        tabIndex={0}
        onClick={onRefreshLocation}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRefreshLocation();
          }
        }}
        className="flex items-center gap-3 bg-white/95 border border-slate-200/90 rounded-2xl px-4 py-3 hover:border-amber-300 transition-all cursor-pointer group shadow-xs"
      >
        <MapPin size={20} className="text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-semibold text-slate-800 truncate group-hover:text-amber-900 transition-colors">
            {locationLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRefreshLocation();
          }}
          className="p-1.5 hover:bg-amber-50 rounded-xl transition-colors flex-shrink-0 active:scale-95 text-slate-400 hover:text-amber-600"
          aria-label="Refresh location"
          title="Refresh location"
        >
          {refreshingLocation ? (
            <Loader2 size={16} className="text-amber-500 animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
