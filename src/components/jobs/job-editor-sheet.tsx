'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Send, ShieldAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TagInput } from '@/components/ui/tag-input';
import { useToast } from '@/hooks/use-toast';
import { MarkdownEditor } from '@/components/jobs/markdown';
import { JobFactChips } from '@/components/jobs/job-badges';
import { EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, SKILL_SUGGESTIONS } from '@/lib/talent';
import type { JobJson } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

interface JobEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role being edited, or null to write a new one. */
  job: JobJson | null;
  businessVerified: boolean;
  onSaved: (message: string) => void;
}

interface FormState {
  title: string;
  employmentType: string;
  locationType: string;
  location: string;
  requiredSkills: string[];
  description: string;
  requirements: string;
  benefits: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: string;
  salaryVisible: boolean;
  applicationDeadline: string;
}

const EMPTY: FormState = {
  title: '', employmentType: 'full_time', locationType: 'on_site', location: '', requiredSkills: [],
  description: '', requirements: '', benefits: '',
  salaryMin: '', salaryMax: '', salaryPeriod: 'month', salaryVisible: true, applicationDeadline: '',
};

const rand = (cents: number | null) => (cents ? String(Math.round(cents) / 100) : '');

const fromJob = (job: JobJson): FormState => ({
  title: job.title,
  employmentType: job.employmentType,
  locationType: job.locationType,
  location: job.location ?? '',
  requiredSkills: job.requiredSkills,
  description: job.description,
  requirements: job.requirements ?? '',
  benefits: job.benefits ?? '',
  salaryMin: rand(job.salaryMinCents),
  salaryMax: rand(job.salaryMaxCents),
  salaryPeriod: job.salaryPeriod ?? 'month',
  salaryVisible: job.salaryVisible,
  applicationDeadline: job.applicationDeadline ?? '',
});

const STEPS = ['The role', 'The details', 'Pay & publish'] as const;
const selectClass = 'mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900';

/**
 * Write, edit and publish a role in three short steps.
 *
 * A side sheet rather than a page of its own, so the list of roles stays put
 * behind it — closing it returns the employer to exactly where they were.
 * Anything half-written can be saved as a draft at any step.
 */
export function JobEditorSheet({ open, onOpenChange, job, businessVerified, onSaved }: JobEditorSheetProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(job ? fromJob(job) : EMPTY);
    setStep(0);
    setSaving(null);
  }, [open, job]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isDraft = !job || job.status === 'draft';
  const titleOk = form.title.trim().length >= 3;
  const descriptionOk = form.description.trim().length >= 30;

  /** Why this step cannot be left yet, or null. */
  const stepProblem = (index: number): string | null => {
    if (index === 0 && !titleOk) return 'Give the role a title first.';
    if (index === 1 && !descriptionOk) return 'Describe the role in at least a couple of sentences.';
    return null;
  };

  const next = () => {
    const problem = stepProblem(step);
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async (intent: 'draft' | 'publish' | 'save') => {
    if (!titleOk) {
      setStep(0);
      toast({ title: 'Give the role a title first.', variant: 'destructive' });
      return;
    }
    if (intent !== 'draft' && !descriptionOk) {
      setStep(1);
      toast({ title: 'Describe the role in at least a couple of sentences.', variant: 'destructive' });
      return;
    }

    setSaving(intent);
    try {
      const payload: Record<string, unknown> = { ...form };
      // "save" keeps whatever status the role already has.
      if (intent === 'draft') payload.status = 'draft';
      if (intent === 'publish') payload.status = 'open';

      const res = await fetch(job ? `/api/jobs/${job.id}` : '/api/jobs', {
        method: job ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSaved(data.message ?? 'Saved.');
        onOpenChange(false);
      } else {
        toast({ title: 'Could not save', description: data.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not reach the server', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const busy = saving !== null;
  const previewCents = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-slate-100 px-5 py-4 text-left sm:px-6">
          <SheetTitle className="text-lg font-extrabold text-slate-900">
            {job ? (isDraft ? 'Finish your draft' : 'Edit role') : 'Post a role'}
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-600">
            {isDraft
              ? 'Nothing is public until you publish. Save a draft whenever you like.'
              : 'Changes show on the live listing as soon as you save.'}
          </SheetDescription>

          <ol className="mt-3 flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { if (i < step || !stepProblem(step)) setStep(i); }}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold transition-colors',
                    i === step ? 'border-slate-900 bg-slate-900 text-white'
                      : i < step ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-500',
                  )}
                >
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                    i === step ? 'bg-amber-400 text-slate-900' : i < step ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500',
                  )}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {step === 0 && (
            <>
              <div>
                <Label htmlFor="job-title" className="text-sm font-semibold text-slate-700">Job title</Label>
                <Input
                  id="job-title"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={160}
                  placeholder="e.g. Qualified Electrician"
                  className="mt-1 border-slate-200 bg-white text-slate-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="job-type" className="text-sm font-semibold text-slate-700">Employment type</Label>
                  <select id="job-type" value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)} className={selectClass}>
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="job-where" className="text-sm font-semibold text-slate-700">Where the work happens</Label>
                  <select id="job-where" value={form.locationType} onChange={(e) => set('locationType', e.target.value)} className={selectClass}>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="job-location" className="text-sm font-semibold text-slate-700">
                  Town or city {form.locationType === 'remote' && <span className="font-normal text-slate-400">(optional for remote)</span>}
                </Label>
                <Input
                  id="job-location"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  maxLength={120}
                  placeholder="Cape Town"
                  className="mt-1 border-slate-200 bg-white text-slate-900"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700">Skills you are looking for</Label>
                <p className="mb-1.5 mt-0.5 text-xs text-slate-500">
                  These decide who is matched to this role, so list what actually matters.
                </p>
                <TagInput
                  tags={form.requiredSkills}
                  onChange={(tags) => set('requiredSkills', tags)}
                  suggestions={SKILL_SUGGESTIONS}
                  placeholder="Type a skill and press Enter…"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label htmlFor="job-description" className="text-sm font-semibold text-slate-700">About the role</Label>
                <p className="mt-0.5 text-xs text-slate-500">What the job involves day to day, and what it is like to work with you.</p>
                <MarkdownEditor
                  id="job-description"
                  value={form.description}
                  onChange={(v) => set('description', v)}
                  rows={8}
                  maxLength={20000}
                  placeholder="We are a family-run electrical contractor looking for…"
                />
              </div>
              <div>
                <Label htmlFor="job-requirements" className="text-sm font-semibold text-slate-700">
                  Requirements <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <p className="mt-0.5 text-xs text-slate-500">Qualifications, experience, licences — a bullet list reads best.</p>
                <MarkdownEditor
                  id="job-requirements"
                  value={form.requirements}
                  onChange={(v) => set('requirements', v)}
                  rows={5}
                  maxLength={10000}
                  placeholder={'- Wireman’s licence\n- 3+ years on commercial sites\n- Own transport'}
                />
              </div>
              <div>
                <Label htmlFor="job-benefits" className="text-sm font-semibold text-slate-700">
                  Benefits <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <MarkdownEditor
                  id="job-benefits"
                  value={form.benefits}
                  onChange={(v) => set('benefits', v)}
                  rows={4}
                  maxLength={6000}
                  placeholder={'- Medical aid contribution\n- Company vehicle\n- Paid training'}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="job-salary-min" className="text-sm font-semibold text-slate-700">Pay from (R)</Label>
                  <Input
                    id="job-salary-min" type="number" min="0" inputMode="decimal"
                    value={form.salaryMin}
                    onChange={(e) => set('salaryMin', e.target.value)}
                    placeholder="25000"
                    className="mt-1 border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="job-salary-max" className="text-sm font-semibold text-slate-700">Pay to (R)</Label>
                  <Input
                    id="job-salary-max" type="number" min="0" inputMode="decimal"
                    value={form.salaryMax}
                    onChange={(e) => set('salaryMax', e.target.value)}
                    placeholder="35000"
                    className="mt-1 border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="job-salary-period" className="text-sm font-semibold text-slate-700">Per</Label>
                  <select id="job-salary-period" value={form.salaryPeriod} onChange={(e) => set('salaryPeriod', e.target.value)} className={selectClass}>
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Switch
                  checked={form.salaryVisible}
                  onCheckedChange={(v) => set('salaryVisible', v)}
                  className="mt-0.5 data-[state=checked]:bg-slate-900"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Show the pay on the listing</span>
                  <span className="block text-xs text-slate-600">
                    Pay is the first thing most candidates look for. If you hide it, the figures are not shown or searchable anywhere.
                  </span>
                </span>
              </label>

              <div>
                <Label htmlFor="job-deadline" className="text-sm font-semibold text-slate-700">
                  Closing date <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="job-deadline" type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => set('applicationDeadline', e.target.value)}
                  className="mt-1 max-w-[220px] border-slate-200 bg-white text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-500">Applications stop at the end of this day. Leave empty to keep it open.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">How it will appear</p>
                <p className="mt-2 text-base font-bold text-slate-900">{form.title.trim() || 'Untitled role'}</p>
                <JobFactChips
                  className="mt-2"
                  showPosted={false}
                  job={{
                    locationType: form.locationType,
                    location: form.location.trim() || null,
                    employmentType: form.employmentType,
                    salaryMinCents: form.salaryVisible ? previewCents(form.salaryMin) : null,
                    salaryMaxCents: form.salaryVisible ? previewCents(form.salaryMax) : null,
                    salaryPeriod: form.salaryPeriod,
                  }}
                />
              </div>

              {isDraft && !businessVerified && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="text-sm text-amber-900">
                    <p className="font-bold">Publishing needs a verified business</p>
                    <p className="mt-0.5">
                      Save this as a draft now. Once you are verified it goes live with one click.{' '}
                      <Link href="/business/verify" className="font-bold underline">Get verified</Link>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
          {step > 0 && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setStep((s) => s - 1)} className="gap-1.5 border-slate-300 text-slate-800">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {isDraft && (
              <Button type="button" variant="outline" disabled={busy} onClick={() => submit('draft')} className="gap-1.5 border-slate-300 font-bold text-slate-800">
                {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={busy} onClick={next} className="gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : isDraft ? (
              <Button
                type="button"
                disabled={busy || !businessVerified}
                onClick={() => submit('publish')}
                className="gap-1.5 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300"
              >
                {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish role
              </Button>
            ) : null}

            {!isDraft && (
              <Button type="button" disabled={busy} onClick={() => submit('save')} className="gap-1.5 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                {saving === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
