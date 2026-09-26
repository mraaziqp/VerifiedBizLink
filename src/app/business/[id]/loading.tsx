import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true" aria-label="Loading business profile">
      <Skeleton className="h-40 w-full rounded-none sm:h-56" />
      <div className="mx-auto -mt-12 max-w-5xl space-y-5 px-4 pb-10">
        <div className="flex items-end gap-4">
          <Skeleton className="h-24 w-24 rounded-2xl border-4 border-white" />
          <div className="space-y-2 pb-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
