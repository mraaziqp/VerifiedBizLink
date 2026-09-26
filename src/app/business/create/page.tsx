import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { CreateBusinessForm } from './create-business-form';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/feature-flags';

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
  const needsEmail = REQUIRE_EMAIL_VERIFICATION && !session.emailVerified && !['admin', 'banker', 'lawyer'].includes(session.role);

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Create business profile" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Set up your business</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tell us the basics. Next you&apos;ll choose a plan, then submit your documents for verification.
        </p>
        {needsEmail && (
          <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">First, confirm your email address</p>
            <p className="mt-1">A business profile is a public trust claim, so we need to know the email is yours. Open the link we sent you (or resend it from the banner at the top of the page), then come back here — your account stays the same, it just gains a business.</p>
          </div>
        )}
        <CreateBusinessForm />
      </main>
    </div>
  );
}
