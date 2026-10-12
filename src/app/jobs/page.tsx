import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { JobBrowseFeed } from '@/components/jobs/job-browse-feed';

export const metadata = {
  title: 'Jobs at verified businesses — VerifiedBizLink',
  description: 'Open roles from employers whose company registration has been checked.',
};

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <JobBrowseFeed />
    </Suspense>
  );
}
