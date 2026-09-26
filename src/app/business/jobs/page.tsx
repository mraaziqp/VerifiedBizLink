'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, Plus, Users, Briefcase, ShieldAlert, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import {
  EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, formatSalaryRange,
} from '@/lib/talent';

interface Job {
  id: string;
  title: string;
  status: string;
  locationType: string;
  location: string | null;
  employmentType: string;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryPeriod: string | null;
  applicationCount: number;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function EmployerJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notVerified, setNotVerified] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', requiredSkills: '',
    employmentType: 'full_time', locationType: 'on_site', location: '',
    salaryMin: '', salaryMax: '', salaryPeriod: 'month', salaryVisible: true,
    applicationDeadline: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?mine=true', { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const data = await load();
    if (data?.jobs) setJobs(data.jobs);
    setLoaded(true);
  }, [load]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const publish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Job published', description: `"${data.job.title}" is now live.` });
        setShowForm(false);
        setForm({
          title: '', description: '', requiredSkills: '',
          employmentType: 'full_time', locationType: 'on_site', location: '',
          salaryMin: '', salaryMax: '', salaryPeriod: 'month', salaryVisible: true,
          applicationDeadline: '',
        });
        await refresh();
      } else {
        // Verification is the gate on posting, so say so plainly rather than
        // leaving a business guessing why the button did nothing.
        if (res.status === 403) setNotVerified(true);
        toast({ title: 'Could not publish', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not publish the job', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SubpageNav title="Jobs & hiring" />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Your roles</h1>
            <p className="text-sm text-gray-600">
              Candidates see that your business is verified before they apply.
            </p>
          </div>
          <Button
            onClick={() => setShowForm((s) => !s)}
            className="gap-2 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Post a role'}
          </Button>
        </div>

        {notVerified && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-900">Only verified businesses can post jobs</p>
              <p className="text-sm text-amber-800">
                That is what makes a listing here worth applying to. Get verified and
                your roles go live straight away.
              </p>
              <Button className="mt-3 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300" asChild><Link href="/business/verify">
                  Get verified
                </Link></Button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">New role</h2>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Job title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Qualified Electrician"
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={7}
                  placeholder="What the role involves, who you are looking for, and what it is like to work there."
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Required skills</Label>
                <Input
                  value={form.requiredSkills}
                  onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))}
                  placeholder="Wiring, fault finding, SANS 10142 — separated by commas"
                  className="mt-1 border-gray-200 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  These decide who is matched to this role, so list what actually matters.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Employment type</Label>
                  <select
                    value={form.employmentType}
                    onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  >
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Where</Label>
                  <select
                    value={form.locationType}
                    onChange={(e) => setForm((f) => ({ ...f, locationType: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  >
                    {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Town or city</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Cape Town"
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Salary from (R)</Label>
                  <Input
                    type="number" min="0"
                    value={form.salaryMin}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                    className="mt-1 border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Salary to (R)</Label>
                  <Input
                    type="number" min="0"
                    value={form.salaryMax}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                    className="mt-1 border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Per</Label>
                  <select
                    value={form.salaryPeriod}
                    onChange={(e) => setForm((f) => ({ ...f, salaryPeriod: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  >
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.salaryVisible}
                  onChange={(e) => setForm((f) => ({ ...f, salaryVisible: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Show the salary on the listing
              </label>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Closing date (optional)</Label>
                <Input
                  type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, applicationDeadline: e.target.value }))}
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>

              <Button
                onClick={publish}
                disabled={saving}
                className="h-12 w-full gap-2 bg-yellow-400 text-base font-bold text-gray-900 hover:bg-yellow-300"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Publish role
              </Button>
            </div>
          </div>
        )}

        {!loaded ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-900">No roles posted yet</p>
            <p className="mt-1 text-sm text-gray-500">Post one and it appears on the jobs board.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const salary = formatSalaryRange(j.salaryMinCents, j.salaryMaxCents, j.salaryPeriod);
              return (
                <li key={j.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/business/jobs/${j.id}`} className="text-lg font-bold text-gray-900 hover:underline">
                        {j.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>
                          {LOCATION_TYPE_LABELS[j.locationType as keyof typeof LOCATION_TYPE_LABELS] ?? j.locationType}
                          {j.location ? ` · ${j.location}` : ''}
                        </span>
                        <span>{EMPLOYMENT_TYPE_LABELS[j.employmentType as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? j.employmentType}</span>
                        {salary && <span className="font-semibold text-gray-900">{salary}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[j.status] ?? STATUS_STYLE.closed}`}>
                      {j.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      {j.applicationCount} applicant{j.applicationCount === 1 ? '' : 's'}
                    </span>
                    <Button variant="outline" size="sm" className="border-gray-300" asChild><Link href={`/business/jobs/${j.id}`}>
                        Review applicants
                      </Link></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
