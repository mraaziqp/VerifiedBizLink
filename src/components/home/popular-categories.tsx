"use client";

import React, { useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  Wrench, Zap, Brush, Hammer, Cpu, Scale, Truck, Heart,
  ShoppingBag, Landmark, Leaf, Building2, GraduationCap,
  BarChart2, HardHat, Package, Megaphone, Plane, ChevronLeft, ChevronRight, LayoutGrid, ArrowRight, Layers
} from "lucide-react";
import { HomeCategory } from "@/components/home/types";

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  technology: Cpu,
  tech: Cpu,
  construction: HardHat,
  healthcare: Heart,
  health: Heart,
  legal: Scale,
  finance: Landmark,
  financial: Landmark,
  logistics: Truck,
  transport: Truck,
  retail: ShoppingBag,
  education: GraduationCap,
  agriculture: Leaf,
  "real estate": Building2,
  marketing: Megaphone,
  advertising: Megaphone,
  consulting: BarChart2,
  manufacturing: Package,
  tourism: Plane,
  travel: Plane,
  plumbing: Wrench,
  electrical: Zap,
  cleaning: Brush,
  renovations: Hammer,
};

const DEFAULT_CATEGORIES = [
  { icon: Cpu, label: "Technology" },
  { icon: HardHat, label: "Construction" },
  { icon: Heart, label: "Healthcare" },
  { icon: Scale, label: "Legal" },
  { icon: Landmark, label: "Finance" },
  { icon: Truck, label: "Logistics" },
  { icon: ShoppingBag, label: "Retail" },
  { icon: GraduationCap, label: "Education" },
  { icon: Leaf, label: "Agriculture" },
  { icon: Building2, label: "Real Estate" },
  { icon: Megaphone, label: "Marketing" },
  { icon: BarChart2, label: "Consulting" },
  { icon: Package, label: "Manufacturing" },
  { icon: Plane, label: "Tourism" },
  { icon: Wrench, label: "Plumbing" },
  { icon: Zap, label: "Electrical" },
  { icon: Brush, label: "Cleaning" },
  { icon: Hammer, label: "Renovations" },
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

  // Combine categories from DB props + defaults so every single category is populated
  const { categoryTiles, totalCount } = useMemo(() => {
    const map = new Map<string, number>();
    
    // Add DB category counts
    categoriesData.forEach((c) => {
      if (c.name) {
        map.set(c.name.trim(), (map.get(c.name.trim()) ?? 0) + c.count);
      }
    });

    let sum = 0;
    map.forEach((cnt) => { sum += cnt; });

    // Build unique category list
    const categoryList: { icon: React.ElementType; label: string; count: number }[] = [];
    const seen = new Set<string>();

    // First add live DB categories with counts > 0
    map.forEach((count, name) => {
      const lower = name.toLowerCase();
      seen.add(lower);
      const icon = CATEGORY_ICON_MAP[lower] || Layers;
      categoryList.push({ icon, label: name, count });
    });

    // Next append remaining default categories
    DEFAULT_CATEGORIES.forEach((cat) => {
      const lower = cat.label.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        categoryList.push({ icon: cat.icon, label: cat.label, count: 0 });
      }
    });

    return {
      categoryTiles: [
        { icon: Building2, label: "All", count: sum },
        ...categoryList,
      ],
      totalCount: sum,
    };
  }, [categoriesData]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm relative space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Categories</h3>
          {selectedCategory !== "All" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
              {selectedCategory}
              <button
                onClick={() => onSelectCategory("All")}
                className="ml-1 text-amber-900 hover:text-black font-extrabold"
                title="Clear category filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all active:scale-95"
          >
            {expanded ? "Collapse" : "Show All"}
          </button>

          <Link
            href={selectedCategory !== "All" ? `/explore?industry=${encodeURIComponent(selectedCategory)}` : "/explore"}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95"
          >
            <span>Explore</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Category Chips Container */}
      {expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 max-h-[320px] overflow-y-auto pr-1">
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
            className="hidden sm:flex absolute left-0 z-10 p-1.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-700 hover:bg-amber-400 hover:text-gray-950 transition-all opacity-0 group-hover/carousel:opacity-100 -ml-3"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 scroll-smooth w-full touch-pan-x"
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
            className="hidden sm:flex absolute right-0 z-10 p-1.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-700 hover:bg-amber-400 hover:text-gray-950 transition-all opacity-0 group-hover/carousel:opacity-100 -mr-3"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
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
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all duration-200 border cursor-pointer select-none ${
        isActive
          ? "bg-amber-400 border-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-400/20 scale-[1.02] active:scale-95"
          : "bg-gray-50/80 hover:bg-amber-50 border-gray-200/80 text-gray-700 hover:border-amber-300 hover:text-gray-900 active:scale-95 shadow-xs"
      }`}
    >
      <Icon className={`h-4 w-4 ${isActive ? "text-zinc-950" : "text-amber-600"}`} />
      <span className="whitespace-nowrap">{category.label}</span>
      {category.count > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            isActive ? "bg-zinc-950/15 text-zinc-950" : "bg-gray-200/80 text-gray-700"
          }`}
        >
          {category.count}
        </span>
      )}
    </button>
  );
}
