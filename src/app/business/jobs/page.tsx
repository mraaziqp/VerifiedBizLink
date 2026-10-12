import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ManageJobsDashboard } from '@/components/jobs/manage-jobs-dashboard';

export const metadata = { title: 'Jobs & hiring — VerifiedBizLink' };

export default function EmployerJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
        </div>
      }
    >
      <ManageJobsDashboard />
    </Suspense>
  );
}
