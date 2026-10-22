'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, ExternalLink, Eye, EyeOff, GraduationCap, Link2, Loader2, Plus, Save, UserRound, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { TagInput } from '@/components/ui/tag-input';
import { CvScanner, type ApplyMode, type CvSuggestions } from '@/components/talent/cv-scanner';
import { TalentCard } from '@/components/talent/talent-card';
import { SKILL_SUGGESTIONS, cleanPortfolioLinks, cleanSkills, type PortfolioLink } from '@/lib/talent';

interface WorkItem { title: string; company: string; period: string; description: string }
interface EducationItem { qualification: string; institution: string; year: string }

interface Profile {
  headline: string;
  summary: string;
  location: string;
  skills: string[];
  /** Kept as typed, so an empty box stays empty rather than becoming 0. */
  yearsExperience: string;
  workHistory: WorkItem[];
  education: EducationItem[];
  portfolioLinks: PortfolioLink[];
  cvUrl: string | null;
  cvFileName: string | null;
  videoIntroUrl: string | null;
  isPublished: boolean;
  openToWork: boolean;
}

const EMPTY: Profile = {
  headline: '', summary: '', location: '', skills: [], yearsExperience: '',
  workHistory: [], education: [], portfolioLinks: [],
  cvUrl: null, cvFileName: null, videoIntroUrl: null, isPublished: false, openToWork: true,
};

const LINK_PRESETS: { label: string; placeholder: string }[] = [
  { label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/your-name' },
  { label: 'GitHub', placeholder: 'https://github.com/your-name' },
  { label: 'Portfolio', placeholder: 'https://your-site.co.za' },
];

/**
 * The professional profile builder: what an employer reads when someone
 * applies, and — if its owner chooses to list it — what verified businesses
 * find when they go looking for people.
 */
export function TalentProfileForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/profile', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const p = data.profile ?? {};
      setProfile({
        ...EMPTY,
        ...p,
        yearsExperience: p.yearsExperience === null || p.yearsExperience === undefined ? '' : String(p.yearsExperience),
        portfolioLinks: Array.isArray(p.portfolioLinks) ? p.portfolioLinks : [],
      });
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const key = (...parts: string[]) => parts.join('|').toLowerCase().replace(/\s+/g, ' ').trim();

  // "fill" never overwrites what the person typed; "replace" takes the CV's
  // text fields. Both only ADD skills, roles and education — nothing the
  // person entered is dropped, and duplicates are skipped.
  const applyCv = (s: CvSuggestions, mode: ApplyMode) => {
    setProfile((p) => {
      const pick = (current: string, found: string) => (mode === 'replace' ? found || current : current || found);
      const roles = new Set(p.workHistory.map((w) => key(w.title, w.company)));
      const schools = new Set(p.education.map((e) => key(e.qualification, e.institution)));
      return {
        ...p,
        headline: pick(p.headline, s.headline),
        location: pick(p.location, s.location),
        summary: pick(p.summary, s.summary),
        skills: cleanSkills([...p.skills, ...s.skills]),
        workHistory: [...p.workHistory, ...s.workHistory.filter((w) => !roles.has(key(w.title, w.company)))],
        education: [...p.education, ...s.education.filter((e) => !schools.has(key(e.qualification, e.institution)))],
      };
    });
    toast({ title: 'Added from your CV', description: 'Check the details below, then press Save profile.' });
  };

  const save = async (overrides: Partial<Pick<Profile, 'isPublished' | 'openToWork'>> = {}) => {
    const next = { ...profile, ...overrides };
    setSaving(true);
    try {
      const res = await fetch('/api/talent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          yearsExperience: next.yearsExperience.trim() === '' ? null : Number(next.yearsExperience),
          // Rows left half-filled are dropped rather than rejected.
          portfolioLinks: next.portfolioLinks.filter((l) => l.url.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfile((p) => ({
          ...p,
          ...overrides,
          isPublished: data.isPublished === true,
          // What was stored: tidied addresses, anything unusable removed.
          portfolioLinks: cleanPortfolioLinks(next.portfolioLinks),
        }));
        toast({ title: 'Saved', description: data.message });
      } else {
        toast({ title: 'Could not save', description: data.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not save your profile', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
        <p className="text-lg font-bold text-gray-900">Your profile could not be loaded</p>
        <p className="text-sm text-gray-600">Nothing has been lost. Check your connection and try again.</p>
        <Button onClick={() => { setState('loading'); void load(); }} className="bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300">Try again</Button>
      </div>
    );
  }

  const setLink = (index: number, patch: Partial<PortfolioLink>) =>
    set('portfolioLinks', profile.portfolioLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const canList = profile.headline.trim().length > 0 && profile.skills.length > 0;
  const years = profile.yearsExperience.trim() === '' ? null : Number(profile.yearsExperience);

  return (
    <div className="min-h-screen bg-gray-50">
      <SubpageNav title="My professional profile" />

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {/* Visibility is the first thing on the page: people need to know who
            can see this before they type their work history into it. */}
        <div className={`rounded-2xl border-2 p-5 ${profile.isPublished ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {profile.isPublished
                ? <Eye className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                : <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />}
              <div>
                <p className="font-bold text-gray-900">
                  {profile.isPublished ? 'Listed for verified employers' : 'Private'}
                </p>
                <p className="text-sm text-gray-600">
                  {profile.isPublished
                    ? 'Verified businesses can find you in the talent directory and message you. Your CV and email stay private until you apply or share them.'
                    : 'Only employers you apply to see this. List it and verified businesses can find you too.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => save({ isPublished: !profile.isPublished })}
              disabled={saving || (!profile.isPublished && !canList)}
              variant={profile.isPublished ? 'outline' : 'default'}
              className={profile.isPublished
                ? 'shrink-0 border-gray-300'
                : 'shrink-0 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300'}
            >
              {profile.isPublished ? 'Make private' : 'Feature my profile'}
            </Button>
          </div>
          {!profile.isPublished && !canList && (
            <p className="mt-2 text-xs text-gray-500 sm:pl-8">Add a headline and at least one skill to list your profile.</p>
          )}

          <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-black/5 pt-4">
            <Switch
              checked={profile.openToWork}
              onCheckedChange={(v) => set('openToWork', v)}
              className="mt-0.5 data-[state=checked]:bg-emerald-600"
            />
            <span>
              <span className="block text-sm font-bold text-gray-900">Open to work</span>
              <span className="block text-xs text-gray-600">
                Shows an &ldquo;Open to work&rdquo; badge on your profile and puts you first in the directory. Saved with the rest of your profile.
              </span>
            </span>
          </label>
        </div>

        <CvScanner
          cvUrl={profile.cvUrl}
          cvFileName={profile.cvFileName}
          onUploaded={(cvUrl, cvFileName) => setProfile((p) => ({ ...p, cvUrl, cvFileName }))}
          onRemoved={() => setProfile((p) => ({ ...p, cvUrl: null, cvFileName: null }))}
          onApply={applyCv}
        />

        {/* Basics */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <UserRound className="h-5 w-5 text-yellow-700" /> About you
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tp-headline" className="text-sm font-semibold text-gray-700">Headline</Label>
              <Input
                id="tp-headline"
                value={profile.headline}
                onChange={(e) => set('headline', e.target.value)}
                maxLength={160}
                placeholder="e.g. Field Marketer & Sales Representative"
                className="mt-1 border-gray-200 bg-white"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Quick ideas:</span>
                {[
                  'Field Marketer & Sales Representative',
                  'Customer Support & Member Operations',
                  'Administrative Assistant & Data Capture',
                  'Grade 12 Graduate · Eager to Learn',
                ].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => set('headline', idea)}
                    className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-200/60 hover:bg-amber-100"
                  >
                    + {idea}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">The one line an employer reads first.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <Label htmlFor="tp-location" className="text-sm font-semibold text-gray-700">Where you are</Label>
                <Input
                  id="tp-location"
                  value={profile.location}
                  onChange={(e) => set('location', e.target.value)}
                  maxLength={120}
                  placeholder="Cape Town"
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>
              <div>
                <Label htmlFor="tp-years" className="text-sm font-semibold text-gray-700">Years of experience</Label>
                <Input
                  id="tp-years"
                  type="number"
                  min="0"
                  max="60"
                  inputMode="numeric"
                  value={profile.yearsExperience}
                  onChange={(e) => set('yearsExperience', e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="8"
                  className="mt-1 border-gray-200 bg-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tp-summary" className="text-sm font-semibold text-gray-700">About</Label>
              <Textarea
                id="tp-summary"
                value={profile.summary}
                onChange={(e) => set('summary', e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="What you do, what you are good at, and what you are looking for."
                className="mt-1 border-gray-200 bg-white"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Quick bio starters:</span>
                {[
                  'Motivated individual with strong work ethic and high dedication. Quick learner looking for growth opportunities.',
                  'Customer-focused professional with experience in client relations, clear communication, and problem resolution.',
                  'Results-driven sales and marketing enthusiast who enjoys connecting with people and representing top businesses.',
                ].map((starter, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => set('summary', profile.summary ? `${profile.summary}\n\n${starter}` : starter)}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                  >
                    + Starter {sIdx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Skills drive matching, so they get their own explanation. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Skills &amp; Specialties</h2>
            <span className="text-xs font-semibold text-slate-500">{profile.skills.length} skills added</span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            These decide which roles and verified businesses are matched to you. Type a skill and press <strong>Enter</strong> to create a badge.
          </p>

          <TagInput
            tags={profile.skills}
            onChange={(nextSkills) => set('skills', nextSkills)}
            suggestions={SKILL_SUGGESTIONS}
            placeholder="Type a skill (e.g. Commercial Wiring, Financial Auditing, Python) and press Enter..."
          />
        </section>

        {/* Links */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Link2 className="h-5 w-5 text-slate-700" /> Links
          </h2>
          <p className="mt-1 text-sm text-gray-600">Your LinkedIn, GitHub, portfolio or anywhere your work can be seen.</p>

          {profile.portfolioLinks.length > 0 && (
            <div className="mt-4 space-y-2">
              {profile.portfolioLinks.map((link, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label="Link name"
                    value={link.label}
                    onChange={(e) => setLink(i, { label: e.target.value })}
                    maxLength={40}
                    placeholder="Name"
                    className="border-gray-200 bg-white sm:w-36"
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      aria-label={`${link.label || 'Link'} address`}
                      type="url"
                      inputMode="url"
                      value={link.url}
                      onChange={(e) => setLink(i, { url: e.target.value })}
                      maxLength={300}
                      placeholder={LINK_PRESETS.find((p) => p.label === link.label)?.placeholder ?? 'https://'}
                      className="border-gray-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => set('portfolioLinks', profile.portfolioLinks.filter((_, x) => x !== i))}
                      className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      aria-label={`Remove ${link.label || 'link'}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {profile.portfolioLinks.length < 8 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {LINK_PRESETS.filter((p) => !profile.portfolioLinks.some((l) => l.label === p.label)).map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-gray-300"
                  onClick={() => set('portfolioLinks', [...profile.portfolioLinks, { label: preset.label, url: '' }])}
                >
                  <Plus className="h-3.5 w-3.5" /> {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-gray-300"
                onClick={() => set('portfolioLinks', [...profile.portfolioLinks, { label: '', url: '' }])}
              >
                <Plus className="h-3.5 w-3.5" /> Other link
              </Button>
            </div>
          )}
        </section>

        {/* Work history */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Briefcase className="h-5 w-5 text-slate-700" /> Work history
            </h2>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-gray-300"
              onClick={() => set('workHistory', [...profile.workHistory, { title: '', company: '', period: '', description: '' }])}
            >
              <Plus className="h-4 w-4" /> Add role
            </Button>
          </div>

          {profile.workHistory.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Nothing added yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {profile.workHistory.map((w, i) => {
                const update = (patch: Partial<WorkItem>) =>
                  set('workHistory', profile.workHistory.map((item, x) => (x === i ? { ...item, ...patch } : item)));
                return (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input aria-label="Job title" value={w.title} onChange={(e) => update({ title: e.target.value })} placeholder="Job title" className="border-gray-200 bg-white" />
                      <Input aria-label="Company" value={w.company} onChange={(e) => update({ company: e.target.value })} placeholder="Company" className="border-gray-200 bg-white" />
                    </div>
                    <Input aria-label="Period" value={w.period} onChange={(e) => update({ period: e.target.value })} placeholder="2021 – present" className="mt-3 border-gray-200 bg-white" />
                    <Textarea aria-label="What you did there" value={w.description} onChange={(e) => update({ description: e.target.value })} rows={2} placeholder="What you did there." className="mt-3 border-gray-200 bg-white" />
                    <button
                      type="button"
                      onClick={() => set('workHistory', profile.workHistory.filter((_, x) => x !== i))}
                      className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Education */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <GraduationCap className="h-5 w-5 text-yellow-700" /> Education
            </h2>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-gray-300"
              onClick={() => set('education', [...profile.education, { qualification: '', institution: '', year: '' }])}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {profile.education.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Nothing added yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {profile.education.map((ed, i) => {
                const update = (patch: Partial<EducationItem>) =>
                  set('education', profile.education.map((item, x) => (x === i ? { ...item, ...patch } : item)));
                return (
                  <div key={i} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                    <Input aria-label="Qualification" value={ed.qualification} onChange={(e) => update({ qualification: e.target.value })} placeholder="Qualification" className="border-gray-200 bg-white" />
                    <Input aria-label="Institution" value={ed.institution} onChange={(e) => update({ institution: e.target.value })} placeholder="Institution" className="border-gray-200 bg-white" />
                    <div className="flex gap-2">
                      <Input aria-label="Year" value={ed.year} onChange={(e) => update({ year: e.target.value })} placeholder="Year" className="border-gray-200 bg-white" />
                      <button
                        type="button"
                        onClick={() => set('education', profile.education.filter((_, x) => x !== i))}
                        className="shrink-0 text-gray-400 hover:text-red-600"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* What an employer sees, kept in step with the form above. */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">How employers see you</h2>
            {user?.id && (
              <Link href={`/talent/${user.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 underline underline-offset-2">
                Open my profile page <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <TalentCard
            profile={{
              name: user?.fullName || 'Your name',
              avatarUrl: user?.avatarUrl && !user.avatarUrl.startsWith('data:') ? user.avatarUrl : null,
              headline: profile.headline,
              summary: profile.summary,
              location: profile.location || null,
              skills: profile.skills,
              yearsExperience: years !== null && Number.isFinite(years) ? years : null,
              openToWork: profile.openToWork,
              portfolioLinks: cleanPortfolioLinks(profile.portfolioLinks),
              hasCv: Boolean(profile.cvUrl),
            }}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3 pb-10">
          <Button
            onClick={() => save()}
            disabled={saving}
            className="h-12 gap-2 bg-yellow-400 px-6 font-bold text-gray-900 hover:bg-yellow-300"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save profile
          </Button>
          <Link href="/jobs" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            Browse jobs
          </Link>
          <Link href="/jobs/applications" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            My applications
          </Link>
        </div>
      </div>
    </div>
  );
}
