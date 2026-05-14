"use client";

import { 
  Wrench, 
  Zap, 
  Brush, 
  Hammer, 
  MoreHorizontal 
} from "lucide-react";
import { HomeCategory } from "@/components/home/types";

const categories = [
  { icon: Wrench, label: "Plumbing" },
  { icon: Zap, label: "Electrical" },
  { icon: Brush, label: "Cleaning" },
  { icon: Hammer, label: "Renovations" },
  { icon: MoreHorizontal, label: "More" },
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
  const normalized = categoriesData.slice(0, 4).map((category, index) => ({
    ...categories[index],
    label: category.name,
    count: category.count,
  }));

  const categoryTiles = [
    { ...categories[0], label: "All", count: categoriesData.reduce((sum, item) => sum + item.count, 0) },
    ...normalized,
  ].slice(0, 5);

  return (
    <div className="px-4 py-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">Popular Categories</h3>
        <button className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors active:scale-95">
          View all
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {categoryTiles.map((category, idx) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.label;

          return (
            <button
              key={idx}
              onClick={() => onSelectCategory(category.label)}
              className={`group relative h-28 flex flex-col items-center justify-center p-2.5 border rounded-xl transition-all duration-300 active:scale-95 overflow-hidden shadow-sm ${
                isActive
                  ? "bg-amber-100/60 border-primary/60"
                  : "bg-white border-amber-100 hover:border-primary/50 hover:bg-amber-50/40"
              }`}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-gold-dark opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Icon Container */}
              <div className="relative z-10 flex items-center justify-center mb-1.5 p-2 rounded-lg bg-primary/5 group-hover:bg-primary/15 transition-all duration-300">
                <Icon size={32} className="text-primary group-hover:scale-125 transition-transform duration-300" />
              </div>
              
              {/* Label */}
              <span className="text-xs text-center font-semibold text-foreground/85 group-hover:text-foreground transition-colors line-clamp-2 relative z-10">
                {category.label}
              </span>
              <span className="text-[10px] text-foreground/60 relative z-10 mt-0.5">{category.count || 0}</span>
              
              {/* Border Glow on Hover */}
              <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/40 transition-all duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

