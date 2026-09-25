'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  content?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface AnimatedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab?: T;
  onChange?: (tabId: T) => void;
  defaultTab?: T;
  className?: string;
  tabsListClassName?: string;
  variant?: 'pill' | 'underline' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  layoutId?: string;
}

/**
 * Agnostic, Framer Motion-powered AnimatedTabs component.
 * Uses layoutId to slide active indicator smoothly without layout shift.
 * Reusable across Job Board, Talent profiles, Admin panels, and Analytics.
 */
export function AnimatedTabs<T extends string = string>({
  tabs,
  activeTab: controlledActiveTab,
  onChange,
  defaultTab,
  className,
  tabsListClassName,
  variant = 'pill',
  size = 'md',
  layoutId,
}: AnimatedTabsProps<T>) {
  const generatedId = React.useId();
  const activeLayoutId = layoutId || `tab-indicator-${generatedId}`;

  const [internalActiveTab, setInternalActiveTab] = useState<T>(
    defaultTab || tabs[0]?.id
  );

  const activeTabId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (id: T) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(id);
    }
    onChange?.(id);
  };

  const activeContent = tabs.find((t) => t.id === activeTabId)?.content;

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5',
  }[size];

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {/* Tabs list container */}
      <div
        role="tablist"
        className={cn(
          'flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-inner overflow-x-auto custom-scrollbar',
          tabsListClassName
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'relative flex items-center justify-center font-bold transition-colors select-none rounded-xl shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer',
                sizeClasses,
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              )}
            >
              {/* Sliding active indicator via Framer Motion */}
              {isActive && (
                <motion.div
                  layoutId={activeLayoutId}
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className={cn(
                    'absolute inset-0 rounded-xl shadow-xs z-0',
                    variant === 'pill'
                      ? 'bg-white border border-slate-200/90 shadow-sm'
                      : 'border-b-2 border-slate-900'
                  )}
                />
              )}

              {/* Tab label & icon */}
              <span className="relative z-10 flex items-center gap-1.5">
                {Icon && (
                  <Icon
                    className={cn(
                      'shrink-0',
                      size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    )}
                  />
                )}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      {activeContent && (
        <div className="mt-4 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTabId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeContent}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
