'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ShieldCheck, MapPin, Briefcase, Send, CheckCircle2,
  Sparkles, ArrowLeft, Calendar, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, formatSalaryRange,
} from '@/lib/talent';

interface JobDetail {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  employmentType: string;
  locationType: string;
  location: string | null;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryPeriod: string | null;
  applicationDeadline: string | null;
  status: string;
  createdAt: string;
  viewsCount: number;
  businessId: string;
  companyName: string;
  businessVerified: boolean;
  trustScore: number | null;
  industry: string | null;
  companyDescription: string | null;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [accepting, setAccepting] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [match, setMatch] = useState<{ score: number | null; matched: string[]; missing: string[] }>({
    score: null, matched: [], missing: [],
  });
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
      if (!res.ok) return { notFound: true };
      return await res.json();
    } catch {
      return { notFound: true };
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load();
      if (!active) return;
      if (data?.notFound || !data?.job) setNotFound(true);
      else {
        setJob(data.job);
        setHasApplied(data.hasApplied === true);
        setAccepting(data.acceptingApplications !== false);
        setIsOwner(data.isOwner === true);
        setMatch({
          score: data.matchScore ?? null,
          matched: data.matchedSkills ?? [],
          missing: data.missingSkills ?? [],
        });
      }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [load]);

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverNote }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasApplied(true);
        toast({ title: 'Application sent', description: data.message });
      } else if (data.needsProfile) {
        // Applying sends the profile, so there is nothing to send without one.
        toast({ title: 'Profile needed first', description: data.error, variant: 'destructive' });
        router.push('/talent/profile');
      } else {
        toast({ title: 'Could not apply', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not send your application', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <Briefcase className="h-10 w-10 text-gray-300" />
        <p className="text-lg font-bold text-gray-900">That role is no longer listed</p>
        <Button variant="outline" className="gap-2 border-gray-300" asChild><Link href="/jobs">
            <ArrowLeft className="h-4 w-4" /> Back to jobs
          </Link></Button>
      </div>
    );
  }

  const salary = formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/jobs" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> All jobs
        </Link>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{job.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-gray-600">
                <Link href={`/business/${job.businessId}`} className="font-semibold hover:underline">
                  {job.companyName}
                </Link>
                {job.businessVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Verified employer
                  </span>
                )}
              </p>
            </div>
            {match.score !== null && (
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
                match.score >= 75
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : match.score >= 40
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}>
                <Sparkles className="h-4 w-4" /> {match.score}% match
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {LOCATION_TYPE_LABELS[job.locationType as keyof typeof LOCATION_TYPE_LABELS] ?? job.locationType}
              {job.location ? ` · ${job.location}` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-gray-400" />
              {EMPLOYMENT_TYPE_LABELS[job.employmentType as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? job.employmentType}
            </span>
            {salary && <span className="font-bold text-gray-900">{salary}</span>}
            {job.applicationDeadline && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                Closes {new Date(job.applicationDeadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
              </span>
            )}
            {isOwner && (
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <Eye className="h-4 w-4" /> {job.viewsCount} views
              </span>
            )}
          </div>

          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
            {job.description}
          </div>

          {job.requiredSkills.length > 0 && (
            <div className="mt-7">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">What they are looking for</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => {
                  const have = match.matched.includes(s);
                  return (
                    <span
                      key={s}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${
                        have
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {have && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {s}
                    </span>
                  );
                })}
              </div>
              {match.score !== null && match.missing.length > 0 && (
                <p className="mt-2.5 text-xs text-gray-500">
                  Green are skills already on your profile. You can still apply without the rest.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Apply */}
        {isOwner ? (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm text-gray-600">This is your listing.</p>
            <Button className="mt-3 gap-2 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300" asChild><Link href={`/business/jobs/${job.id}`}>
                View applicants
              </Link></Button>
          </div>
        ) : hasApplied ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-900">You have applied to this role</p>
              <Link href="/jobs/applications" className="text-sm text-emerald-800 underline">
                Track your applications
              </Link>
            </div>
          </div>
        ) : !accepting ? (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-600">
            This role has closed for applications.
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="font-bold text-gray-900">Apply</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your professional profile is sent as it is right now. Add a note if you
              want to say something specific to this employer.
            </p>
            <Textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Optional — why you are a good fit for this role."
              className="mt-3 border-gray-200 bg-white"
            />
            <Button
              onClick={apply}
              disabled={applying}
              className="mt-3 h-12 w-full gap-2 bg-yellow-400 text-base font-bold text-gray-900 hover:bg-yellow-300"
            >
              {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Apply with my profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
