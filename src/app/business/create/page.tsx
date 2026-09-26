import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { CreateBusinessForm } from './create-business-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create your business profile — VerifiedBizLink' };

/**
 * Where a signed-in member turns into a business. The form posts to the
 * createBusinessProfile server action, which saves the profile and sends
 * them on to /pricing.
 */
export default async function CreateBusinessPage() {
  const session = await getSession();
  if (!session) redirect('/login?from=/business/create');

  const [existing] = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`.catch(() => []);
  if (existing) redirect('/business/dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Create business profile" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Set up your business</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tell us the basics. Next you&apos;ll choose a plan, then submit your documents for verification.
        </p>
        <CreateBusinessForm />
      </main>
    </div>
  );
}
