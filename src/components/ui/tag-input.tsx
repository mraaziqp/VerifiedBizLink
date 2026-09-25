'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  suggestions?: string[];
  label?: string;
}

/**
 * Dynamic React Tag Input component for resume/skills builders.
 * Pressing 'Enter' or comma generates visually distinct, deletable pills.
 * Backspace on empty input removes the previous pill.
 */
export function TagInput({
  tags,
  onChange,
  placeholder = 'Type a skill and press Enter...',
  maxTags = 30,
  className,
  suggestions = ['React', 'TypeScript', 'Project Management', 'Sales', 'Customer Service', 'Accounting', 'Graphic Design', 'Operations'],
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (tags.length >= maxTags) return;

    // Case-insensitive duplicate check
    const isDuplicate = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (!isDuplicate) {
      onChange([...tags, trimmed]);
    }
    setDraft('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
    }
  };

  const unusedSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  ).slice(0, 5);

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Interactive Tag Box */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'min-h-[52px] w-full p-2.5 rounded-2xl border transition-all duration-200 bg-white flex flex-wrap items-center gap-2 cursor-text',
          isFocused
            ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
        )}
      >
        <AnimatePresence>
          {tags.map((tag, idx) => (
            <motion.span
              key={`${tag}-${idx}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs select-none group"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(idx);
                }}
                className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-slate-800"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Inline Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (draft.trim()) {
              addTag(draft);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add another...'}
          className="flex-1 min-w-[140px] text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none border-none p-1"
        />

        {draft.trim() && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addTag(draft);
            }}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {/* Suggested Skills */}
      {unusedSuggestions.length > 0 && tags.length < maxTags && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Suggestions:
          </span>
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors hover:border-slate-300"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
