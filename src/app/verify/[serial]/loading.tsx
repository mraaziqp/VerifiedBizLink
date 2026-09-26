import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-10" aria-busy="true" aria-label="Checking certificate">
      <div className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <p className="text-center text-sm text-slate-600">Checking the certificate registry…</p>
      </div>
    </div>
  );
}
