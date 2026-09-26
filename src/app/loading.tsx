import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shown instantly on navigation while the server renders the next page —
 * on a serverless cold start that can take a second or two, and without
 * this the old page just sits there looking unresponsive.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true" aria-label="Loading">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
