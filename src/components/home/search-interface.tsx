"use client";

import { KeyboardEvent } from "react";
import { Loader2, Search, MapPin, Settings2 } from "lucide-react";
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
    <div className="px-4 pt-8 pb-6 space-y-5 animate-fade-in bg-gradient-to-b from-slate-950/5 to-transparent">
      {/* Main Heading */}
      <div className="text-center mb-6 space-y-1.5">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
          Find{" "}
          <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Trusted
          </span>{" "}
          Businesses
        </h2>
        <p className="text-sm md:text-base text-slate-500 font-medium">Verified, reliable &amp; near you</p>
      </div>

      {/* Search Box */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-gold-dark rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70 group-focus-within:text-primary transition-colors" size={20} />
          <Input
            type="text"
            placeholder="What service are you looking for?"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 pr-4 bg-card/80 border-primary/30 text-foreground placeholder:text-foreground/50 h-12 rounded-lg focus:bg-card/100 focus:border-primary/60 font-medium"
          />
        </div>
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
        className="flex items-center gap-3 bg-card/60 border border-primary/30 rounded-lg px-4 py-3.5 hover:bg-card/80 hover:border-primary/50 transition-all cursor-pointer group shadow-card-dark"
      >
        <MapPin size={22} className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {locationLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRefreshLocation();
          }}
          className="p-2 hover:bg-primary/20 rounded-lg transition-colors flex-shrink-0 active:scale-95"
          aria-label="Refresh location"
        >
          {refreshingLocation ? (
            <Loader2 size={18} className="text-primary animate-spin" />
          ) : (
            <Settings2 size={18} className="text-primary/70 hover:text-primary transition-colors" />
          )}
        </button>
      </div>
    </div>
  );
}
