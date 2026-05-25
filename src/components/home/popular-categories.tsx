"use client";

import React from "react";
import {
  Wrench, Zap, Brush, Hammer, Cpu, Scale, Truck, Heart,
  ShoppingBag, Landmark, Leaf, Building2, GraduationCap,
  BarChart2, HardHat, Package, Megaphone, Plane,
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

  return (
    <div className="px-4 py-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tight text-slate-900">Browse by Category</h3>
        <button
          onClick={() => onSelectCategory("All")}
          className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors active:scale-95"
        >
          View all
        </button>
      </div>

      {/* Scrollable row — first 6 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {categoryTiles.slice(0, 6).map((category, idx) => (
          <CategoryTile
            key={idx}
            category={category}
            isActive={selectedCategory === category.label}
            onSelect={() => onSelectCategory(category.label)}
          />
        ))}
      </div>

      {/* Second row — next 7, collapsed on mobile */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {categoryTiles.slice(6, 13).map((category, idx) => (
          <CategoryTile
            key={idx + 6}
            category={category}
            isActive={selectedCategory === category.label}
            onSelect={() => onSelectCategory(category.label)}
          />
        ))}
      </div>

      {/* Third row — last 6, hidden on mobile */}
      <div className="hidden md:grid grid-cols-6 gap-2.5">
        {categoryTiles.slice(13, 19).map((category, idx) => (
          <CategoryTile
            key={idx + 13}
            category={category}
            isActive={selectedCategory === category.label}
            onSelect={() => onSelectCategory(category.label)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({
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
      className={`group relative h-24 flex flex-col items-center justify-center p-2 border rounded-xl transition-all duration-300 active:scale-95 overflow-hidden shadow-sm ${
        isActive
          ? "bg-amber-100/60 border-primary/60"
          : "bg-white border-amber-100 hover:border-primary/50 hover:bg-amber-50/40"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-gold-dark opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex items-center justify-center mb-1.5 p-1.5 rounded-lg bg-primary/5 group-hover:bg-primary/15 transition-all duration-300">
        <Icon size={22} className="text-primary group-hover:scale-125 transition-transform duration-300" />
      </div>
      <span className="text-[11px] text-center font-semibold text-foreground/85 group-hover:text-foreground transition-colors line-clamp-2 relative z-10 leading-tight">
        {category.label}
      </span>
      {category.count > 0 && (
        <span className="text-[9px] text-primary/70 font-bold relative z-10 mt-0.5">{category.count}</span>
      )}
      <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/40 transition-all duration-300" />
    </button>
  );
}

