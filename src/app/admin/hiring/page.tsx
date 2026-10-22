'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, CheckCircle2, Clock, ExternalLink,
  FileText, Loader2, Mail, MapPin, MessageSquare, Search,
  ShieldCheck, Sparkles, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, GlassPageHeader, StatCard } from '@/components/shared/glass-ui';
import { PersonAvatar } from '@/components/talent/person-avatar';
import { cn } from '@/lib/utils';

interface CompanyJob {
  id: string;
  title: string;
  companyName: string;
  businessId: string;
  location: string | null;
  status: string;
  applicantCount: number;
  createdAt: string;
}

interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  status: 'new' | 'reviewed' | 'shortlisted' | 'interviewing' | 'hired' | 'rejected';
  coverNote: string | null;
  matchScore: number | null;
  createdAt: string;
  headline: string | null;
  skills: string[];
  cvUrl: string | null;
  cvFileName: string | null;
  cvMimeType: string | null;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    location: string | null;
    phone: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New Application', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  reviewed: { label: 'Under Review', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  shortlisted: { label: 'Shortlisted', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  interviewing: { label: 'Interviewing', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  hired: { label: 'Hired 🎉', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export default function AdminHiringPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async (jobId?: string) => {
    setLoading(true);
    try {
      const url = `/api/admin/hiring${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setJobs(data.jobs || []);
        setSelectedJobId(data.selectedJobId || (data.jobs?.[0]?.id ?? null));
        setApplications(data.applications || []);
      } else {
        toast({ title: 'Could not load applicants', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Connection error', description: 'Failed to reach admin hiring API', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    loadData(id);
  };

  const handleUpdateStatus = async (applicationId: string, nextStatus: string) => {
    setUpdatingId(applicationId);
    try {
      const res = await fetch('/api/admin/hiring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status: nextStatus as Applicant['status'] } : a))
        );
        toast({ title: 'Status updated', description: `Candidate marked as ${nextStatus}.` });
      } else {
        toast({ title: 'Failed to update', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const currentJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const filteredApplicants = applications.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = a.applicant.fullName.toLowerCase();
      const email = a.applicant.email.toLowerCase();
      const headline = (a.headline || '').toLowerCase();
      const skills = a.skills.join(' ').toLowerCase();
      return name.includes(q) || email.includes(q) || headline.includes(q) || skills.includes(q);
    }
    return true;
  });

  const countByStatus = (status: string) => applications.filter((a) => a.status === status).length;

  return (
    <GlassBackground>
      <GlassPageHeader
        title="VerifiedBizLink Hiring Desk"
        subtitle="Direct access to all candidates who applied for VerifiedBizLink company roles (e.g. Independent Marketers)"
      >
        <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10" asChild>
          <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Admin</Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-800" asChild>
          <Link href="/business/jobs"><Briefcase className="h-4 w-4 text-amber-500" /> Manage in Business Portal</Link>
        </Button>
      </GlassPageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Company Jobs Selector Tabs */}
        {jobs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => handleSelectJob(job.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all',
                  job.id === selectedJobId
                    ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                )}
              >
                <Briefcase className="h-4 w-4" />
                <span className="truncate max-w-[220px]">{job.title}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                    job.id === selectedJobId ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {job.applicantCount} applicants
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {/* Selected Job Overview & Quick Links */}
        {currentJob && (
          <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <ShieldCheck className="h-3 w-3" /> Official VerifiedBizLink Vacancy
              </span>
              <h2 className="text-xl font-black text-white sm:text-2xl">{currentJob.title}</h2>
              <p className="text-xs text-slate-300">
                {currentJob.companyName} · {currentJob.location || 'South Africa'} · Total Candidates: {currentJob.applicantCount}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl border-white/20 bg-white/10 font-bold text-white hover:bg-white/20">
                <Link href={`/jobs/${currentJob.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Live Advert
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Applicants"
            value={applications.length}
            icon={Users}
            gradient="from-amber-500 to-yellow-400"
          />
          <StatCard
            label="Shortlisted"
            value={countByStatus('shortlisted')}
            icon={Sparkles}
            gradient="from-cyan-500 to-blue-500"
          />
          <StatCard
            label="Hired"
            value={countByStatus('hired')}
            icon={CheckCircle2}
            gradient="from-emerald-500 to-green-500"
          />
          <StatCard
            label="Under Review"
            value={countByStatus('reviewed') + countByStatus('new')}
            icon={Clock}
            gradient="from-violet-500 to-indigo-500"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicants by name, email, headline, or skills…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {['all', 'new', 'shortlisted', 'interviewing', 'hired', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all',
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {st} {st !== 'all' && `(${countByStatus(st)})`}
              </button>
            ))}
          </div>
        </div>

        {/* Applicants List */}
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-slate-500 shadow-xs">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-500" /> Loading applicants…
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-xs">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">No applicants found</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || filterStatus !== 'all'
                ? 'No applicants match the current search or status filter.'
                : 'No candidates have applied for this vacancy yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplicants.map((app) => {
              const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;

              return (
                <div
                  key={app.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-amber-300/80 hover:shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Candidate Info */}
                    <div className="flex items-start gap-4">
                      <PersonAvatar
                        name={app.applicant.fullName}
                        src={app.applicant.avatarUrl}
                        size={56}
                        className="border-2 border-white shadow-sm ring-1 ring-amber-300"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {app.applicant.fullName}
                          </h3>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border',
                              statusCfg.color
                            )}
                          >
                            {statusCfg.label}
                          </span>
                          {app.matchScore !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                              <Sparkles className="h-3 w-3 text-emerald-600" /> {app.matchScore}% Match
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {app.headline || 'Verified Candidate'}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" /> {app.applicant.email}
                          </span>
                          {app.applicant.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" /> {app.applicant.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" /> Applied{' '}
                            {new Date(app.createdAt).toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          className="h-9 rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-slate-950 hover:bg-amber-300 shadow-xs"
                        >
                          <Link href={`/dashboard/messages?with=${app.applicant.id}`}>
                            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-800"
                        >
                          <a href={`mailto:${app.applicant.email}?subject=Regarding your application for ${encodeURIComponent(app.jobTitle)}`}>
                            <Mail className="h-3.5 w-3.5 mr-1" /> Email
                          </a>
                        </Button>
                      </div>

                      {app.cvUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-amber-300/80 bg-amber-50/50 text-xs font-bold text-amber-950 hover:bg-amber-100"
                        >
                          <a href={app.cvUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5 mr-1 text-amber-700" />
                            {app.cvFileName ? `View CV (${app.cvFileName})` : 'Download Attached CV'}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Cover Note */}
                  {app.coverNote && (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Cover Note from Applicant
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {app.coverNote}
                      </p>
                    </div>
                  )}

                  {/* Skills Chips */}
                  {app.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-slate-400 mr-1">Skills:</span>
                      {app.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status Control Footer */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-500">
                      Update Candidate Status:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['shortlisted', 'interviewing', 'hired', 'rejected'] as const).map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant="outline"
                          disabled={updatingId === app.id || app.status === st}
                          onClick={() => handleUpdateStatus(app.id, st)}
                          className={cn(
                            'h-7 rounded-lg px-2.5 text-[11px] font-bold capitalize',
                            app.status === st
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {updatingId === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : st}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
