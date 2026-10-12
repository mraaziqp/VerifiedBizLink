import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { getSession, isStaff } from '@/lib/auth';
import { countJobView, loadJobView, type JobView } from '@/lib/jobs-server';
import { jobPath, jobSummaryLine, markdownToPlain } from '@/lib/talent';
import { canonicalOrigin } from '@/lib/site-url';
import { JobPageClient } from './job-page-client';

export const dynamic = 'force-dynamic';

/**
 * Where a shared job link lands.
 *
 * Rendered on the server so the listing is in the HTML itself: the preview
 * robots WhatsApp, LinkedIn and Facebook send read the title and description
 * from here without running any JavaScript, and so does a search engine.
 * Nobody is asked to log in to read a role — only to apply for it.
 */

const SITE = canonicalOrigin(process.env.NEXT_PUBLIC_APP_URL);

/** One lookup per request, shared by the metadata and the page. */
const getView = cache(async (idOrSlug: string): Promise<JobView | null> => {
  try {
    const session = await getSession();
    return await loadJobView(idOrSlug, session ? { id: session.id, isStaff: isStaff(session) } : null);
  } catch (error) {
    console.error('Job page lookup failed:', error);
    return null;
  }
});

const isPublic = (view: JobView) => view.job.status === 'open' && view.job.businessVerified;

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const view = await getView(id);
  if (!view) {
    return {
      title: 'Job no longer listed — VerifiedBizLink',
      description: 'This role is no longer listed. Browse open roles at verified businesses.',
      robots: { index: false },
    };
  }

  const { job } = view;
  const title = `${job.title} at ${job.companyName}`;
  const summary = jobSummaryLine({ ...job, companyName: null });
  const excerpt = markdownToPlain(job.description).slice(0, 160);
  const description = [
    job.businessVerified ? 'Verified employer' : null,
    summary || null,
    excerpt || null,
  ].filter(Boolean).join(' · ').slice(0, 300);
  const url = `${SITE}${jobPath(job)}`;

  return {
    metadataBase: new URL(SITE),
    title: `${title} — VerifiedBizLink`,
    description,
    alternates: { canonical: url },
    // A paused, closed or draft role is still viewable by the people allowed
    // to see it, but it is not something to send search traffic to.
    robots: isPublic(view) ? { index: true, follow: true } : { index: false },
    openGraph: {
      type: 'website',
      siteName: 'VerifiedBizLink',
      title,
      description,
      url,
      locale: 'en_ZA',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const EMPLOYMENT_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  learnership: 'OTHER',
};
const PERIOD_SCHEMA: Record<string, string> = { hour: 'HOUR', day: 'DAY', month: 'MONTH', year: 'YEAR' };

/** schema.org JobPosting, which is what puts a listing into Google's job search. */
function structuredData(view: JobView): string {
  const { job } = view;
  const remote = job.locationType === 'remote';
  const min = job.salaryMinCents ? job.salaryMinCents / 100 : null;
  const max = job.salaryMaxCents ? job.salaryMaxCents / 100 : null;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.requirements, job.benefits].filter(Boolean).map((t) => markdownToPlain(t)).join('\n\n'),
    datePosted: (job.publishedAt ?? job.createdAt ?? '').slice(0, 10),
    employmentType: EMPLOYMENT_SCHEMA[job.employmentType] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      sameAs: `${SITE}/business/${job.businessId}`,
      ...(job.logoUrl && /^https?:\/\//.test(job.logoUrl) ? { logo: job.logoUrl } : {}),
    },
    directApply: true,
    url: `${SITE}${jobPath(job)}`,
  };
  if (job.applicationDeadline) data.validThrough = `${job.applicationDeadline}T23:59:59+02:00`;
  if (remote) {
    data.jobLocationType = 'TELECOMMUTE';
    data.applicantLocationRequirements = { '@type': 'Country', name: 'South Africa' };
  }
  if (job.location || !remote) {
    data.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.location ? { addressLocality: job.location } : {}),
        addressCountry: 'ZA',
      },
    };
  }
  if (min || max) {
    data.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.currency || 'ZAR',
      value: {
        '@type': 'QuantitativeValue',
        ...(min && max ? { minValue: min, maxValue: max } : { value: min ?? max }),
        unitText: PERIOD_SCHEMA[job.salaryPeriod ?? 'month'] ?? 'MONTH',
      },
    };
  }
  // "<" is escaped so text an employer typed can never close the script tag.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getView(id);

  if (!view) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <Briefcase className="h-10 w-10 text-slate-300" />
        <h1 className="text-xl font-extrabold text-slate-900">That role is no longer listed</h1>
        <p className="max-w-sm text-sm text-slate-600">
          It may have been filled or taken down. There are other open roles at verified businesses.
        </p>
        <Link
          href="/jobs"
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-yellow-400 px-5 text-sm font-bold text-slate-900 hover:bg-yellow-300"
        >
          Browse open roles
        </Link>
      </div>
    );
  }

  // One address per job. Older links and notifications carry the UUID; they
  // land on the readable address so a link copied from the address bar is
  // always the one worth sharing.
  if (id.trim().toLowerCase() !== view.job.slug) redirect(jobPath(view.job));

  if (isPublic(view) && !view.isOwner) countJobView(view.job.id);

  return (
    <>
      {isPublic(view) && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(view) }} />
      )}
      <JobPageClient view={view} />
    </>
  );
}
