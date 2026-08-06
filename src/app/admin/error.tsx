'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold">Admin Error</h1>
        <p className="text-gray-600">Failed to load admin panel. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-yellow-400 text-gray-900">
            Retry
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
