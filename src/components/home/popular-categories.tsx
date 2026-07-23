"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  Wrench, Zap, Brush, Hammer, Cpu, Scale, Truck, Heart,
  ShoppingBag, Landmark, Leaf, Building2, GraduationCap,
  BarChart2, HardHat, Package, Megaphone, Plane, ChevronLeft, ChevronRight, LayoutGrid, ArrowRight
} from "lucide-react";
import { HomeCategory } from "@/components/home/types";

const ALL_CATEGORIES = [
  { icon: Cpu,          label: "Technology" },
  { icon: HardHat,      label: "Construction" },
  { icon: Heart,        label: "Healthcare" },
  { icon: Scale,        label: "Legal" },
  { icon: Landmark,     label: "Finance" },
  { icon: Truck,        label: "Logistics" },
  { icon: ShoppingBag,  label: "Retail" },
  { icon: GraduationCap,label: "Education" },
  { icon: Leaf,         label: "Agriculture" },
  { icon: Building2,    label: "Real Estate" },
  { icon: Megaphone,    label: "Marketing" },
  { icon: BarChart2,    label: "Consulting" },
  { icon: Package,      label: "Manufacturing" },
  { icon: Plane,        label: "Tourism" },
  { icon: Wrench,       label: "Plumbing" },
  { icon: Zap,          label: "Electrical" },
  { icon: Brush,        label: "Cleaning" },
  { icon: Hammer,       label: "Renovations" },
];

interface PopularCategoriesProps {
  categoriesData?: HomeCategory[];
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
}

export function PopularCategories({
  categoriesData = [],
  selectedCategory = "All",
  onSelectCategory,
}: PopularCategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Merge live DB counts into the full category list
  const countMap = new Map(categoriesData.map((c) => [c.name.toLowerCase(), c.count]));
  const totalCount = categoriesData.reduce((sum, item) => sum + item.count, 0);

  const allTile = { icon: Building2, label: "All", count: totalCount };

  const categoryTiles = [
    allTile,
    ...ALL_CATEGORIES.map((cat) => ({
      ...cat,
      count: countMap.get(cat.label.toLowerCase()) ?? 0,
    })),
  ];

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="px-1 py-3 space-y-2.5 animate-fade-in bg-white/60 backdrop-blur-sm border border-amber-100/80 rounded-2xl p-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-700">
            <LayoutGrid size={16} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">Categories</h3>
          {selectedCategory !== "All" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              {selectedCategory}
              <button
                onClick={() => onSelectCategory("All")}
                className="ml-0.5 text-amber-900 hover:text-black font-bold"
                title="Clear filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors"
          >
            {expanded ? "Collapse" : "Show All"}
          </button>
          
          <Link
            href={selectedCategory !== "All" ? `/explore?industry=${encodeURIComponent(selectedCategory)}` : "/explore"}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-colors border border-amber-300/60"
          >
            <span>Explore</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Categories View */}
      {expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
          {categoryTiles.map((cat) => (
            <CategoryChip
              key={cat.label}
              category={cat}
              isActive={selectedCategory.toLowerCase() === cat.label.toLowerCase()}
              onSelect={() => onSelectCategory(cat.label)}
            />
          ))}
        </div>
      ) : (
        <div className="relative group/carousel flex items-center">
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 z-10 p-1.5 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 hover:bg-amber-400 hover:text-slate-950 transition-all opacity-0 group-hover/carousel:opacity-100 -ml-2"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth w-full"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categoryTiles.map((cat) => (
              <CategoryChip
                key={cat.label}
                category={cat}
                isActive={selectedCategory.toLowerCase() === cat.label.toLowerCase()}
                onSelect={() => onSelectCategory(cat.label)}
              />
            ))}
          </div>

          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 z-10 p-1.5 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 hover:bg-amber-400 hover:text-slate-950 transition-all opacity-0 group-hover/carousel:opacity-100 -mr-2"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  category,
  isActive,
  onSelect,
}: {
  category: { icon: React.ElementType; label: string; count: number };
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = category.icon;
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all duration-200 border cursor-pointer select-none ${
        isActive
          ? "bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-md shadow-amber-400/20 scale-[1.03] active:scale-95"
          : "bg-white/90 hover:bg-amber-50/80 border-slate-200 text-slate-700 hover:border-amber-300 hover:text-slate-900 active:scale-95 shadow-sm"
      }`}
    >
      <Icon size={15} className={isActive ? "text-slate-950" : "text-amber-600"} />
      <span className="whitespace-nowrap">{category.label}</span>
      {category.count > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            isActive ? "bg-slate-950/15 text-slate-950" : "bg-slate-100 text-slate-600"
          }`}
        >
          {category.count}
        </span>
      )}
    </button>
  );
}

