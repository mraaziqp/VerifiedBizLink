'use client';

import { useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VettingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Vetting queue error:', error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 space-y-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
          <AlertCircle className="h-10 w-10 text-yellow-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Failed to load vetting data</h2>
          <p className="text-sm text-slate-400">
            The vetting service is temporarily unavailable or timed out. Please try again.
          </p>
        </div>
        <Button
          onClick={handleRetry}
          className="w-full bg-[#EAB308] hover:bg-[#EAB308]/90 text-slate-950 font-bold gap-2 py-6 rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-yellow-500/20"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
