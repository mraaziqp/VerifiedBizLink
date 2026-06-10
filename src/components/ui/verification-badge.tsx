'use client';

import { CheckCircle2 } from 'lucide-react';

interface VerificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  verified?: boolean;
}

export function VerificationBadge({
  size = 'md',
  showText = true,
  verified = true
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (!verified) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full blur-md opacity-50" />
        <div className="relative bg-gradient-to-br from-green-400 to-emerald-600 rounded-full p-0.5">
          <CheckCircle2 className={`${sizeClasses[size]} text-white`} fill="currentColor" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-green-600 dark:text-green-400`}>
          Verified
        </span>
      )}
    </div>
  );
}

export function VerificationBadgeInline() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" />
      <span className="text-xs font-semibold text-green-700 dark:text-green-400">Verified</span>
    </div>
  );
}

export function VerificationBadgeHeader() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full blur-lg opacity-40" />
        <div className="relative bg-gradient-to-br from-green-400 to-emerald-600 rounded-full p-1">
          <CheckCircle2 className="h-8 w-8 text-white" fill="currentColor" />
        </div>
      </div>
      <div>
        <h3 className="font-bold text-green-900 dark:text-green-100">Verified Business</h3>
        <p className="text-sm text-green-700 dark:text-green-300">CIPC & SARS Verified</p>
      </div>
    </div>
  );
}
