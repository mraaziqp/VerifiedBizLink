import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ApplicantManager } from '@/components/jobs/applicant-manager';

export const metadata = { title: 'Applicants — VerifiedBizLink' };

export default async function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
        </div>
      }
    >
      <ApplicantManager jobId={id} />
    </Suspense>
  );
}
