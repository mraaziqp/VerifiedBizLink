'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, Save, Plus, X, UserRound, Eye, EyeOff, Briefcase, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { TagInput } from '@/components/ui/tag-input';

interface WorkItem { title: string; company: string; period: string; description: string }
interface EducationItem { qualification: string; institution: string; year: string }

interface Profile {
  headline: string;
  summary: string;
  location: string;
  skills: string[];
  workHistory: WorkItem[];
  education: EducationItem[];
  portfolioLinks: string[];
  videoIntroUrl: string | null;
  isPublished: boolean;
  openToWork: boolean;
}

const EMPTY: Profile = {
  headline: '', summary: '', location: '', skills: [],
  workHistory: [], education: [], portfolioLinks: [],
  videoIntroUrl: null, isPublished: false, openToWork: true,
};

export default function TalentProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/profile', { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load();
      if (!active) return;
      if (data?.profile) setProfile({ ...EMPTY, ...data.profile });
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [load]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const save = async (publish?: boolean) => {
    const next = publish === undefined ? profile : { ...profile, isPublished: publish };
    setSaving(true);
    try {
      const res = await fetch('/api/talent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((p) => ({ ...p, isPublished: data.isPublished === true }));
        toast({ title: 'Saved', description: data.message });
      } else {
        toast({ title: 'Could not save', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not save your profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SubpageNav title="My professional profile" />

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {/* Visibility is the first thing on the page: people need to know who
            can see this before they type their work history into it. */}
        <div className={`flex flex-col gap-3 rounded-2xl border-2 p-5 sm:flex-row sm:items-center sm:justify-between ${
          profile.isPublished ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-start gap-3">
            {profile.isPublished
              ? <Eye className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              : <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />}
            <div>
              <p className="font-bold text-gray-900">
                {profile.isPublished ? 'Visible to verified employers' : 'Private draft'}
              </p>
              <p className="text-sm text-gray-600">
                {profile.isPublished
                  ? 'Employers you apply to can see this profile.'
                  : 'Nobody can see this yet. You can still apply — applying sends a copy.'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => save(!profile.isPublished)}
            disabled={saving}
            variant={profile.isPublished ? 'outline' : 'default'}
            className={profile.isPublished
              ? 'shrink-0 border-gray-300'
              : 'shrink-0 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300'}
          >
            {profile.isPublished ? 'Make private' : 'Publish profile'}
          </Button>
        </div>

        {/* Basics */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <UserRound className="h-5 w-5 text-yellow-600" /> About you
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Headline</Label>
              <Input
                value={profile.headline}
                onChange={(e) => set('headline', e.target.value)}
                maxLength={160}
                placeholder="e.g. Qualified electrician, 8 years on commercial sites"
                className="mt-1 border-gray-200 bg-white"
              />
              <p className="mt-1 text-xs text-gray-500">The one line an employer reads first.</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">Where you are</Label>
              <Input
                value={profile.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Cape Town"
                className="mt-1 border-gray-200 bg-white"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">About</Label>
              <Textarea
                value={profile.summary}
                onChange={(e) => set('summary', e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="What you do, what you are good at, and what you are looking for."
                className="mt-1 border-gray-200 bg-white"
              />
            </div>
          </div>
        </section>

        {/* Skills drive matching, so they get their own explanation. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Skills &amp; Specialties</h2>
            <span className="text-xs font-semibold text-slate-500">{profile.skills.length} skills added</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            These decide which roles and verified businesses are matched to you. Type a skill and press <strong>Enter</strong> to create a badge.
          </p>

          <TagInput
            tags={profile.skills}
            onChange={(nextSkills) => set('skills', nextSkills)}
            placeholder="Type a skill (e.g. Commercial Wiring, Financial Auditing, Python) and press Enter..."
          />
        </section>

        {/* Work history */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
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
              {profile.workHistory.map((w, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={w.title}
                      onChange={(e) => {
                        const next = [...profile.workHistory];
                        next[i] = { ...w, title: e.target.value };
                        set('workHistory', next);
                      }}
                      placeholder="Job title"
                      className="border-gray-200 bg-white"
                    />
                    <Input
                      value={w.company}
                      onChange={(e) => {
                        const next = [...profile.workHistory];
                        next[i] = { ...w, company: e.target.value };
                        set('workHistory', next);
                      }}
                      placeholder="Company"
                      className="border-gray-200 bg-white"
                    />
                  </div>
                  <Input
                    value={w.period}
                    onChange={(e) => {
                      const next = [...profile.workHistory];
                      next[i] = { ...w, period: e.target.value };
                      set('workHistory', next);
                    }}
                    placeholder="2021 – present"
                    className="mt-3 border-gray-200 bg-white"
                  />
                  <Textarea
                    value={w.description}
                    onChange={(e) => {
                      const next = [...profile.workHistory];
                      next[i] = { ...w, description: e.target.value };
                      set('workHistory', next);
                    }}
                    rows={2}
                    placeholder="What you did there."
                    className="mt-3 border-gray-200 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => set('workHistory', profile.workHistory.filter((_, x) => x !== i))}
                    className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Education */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <GraduationCap className="h-5 w-5 text-yellow-600" /> Education
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
              {profile.education.map((ed, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                  <Input
                    value={ed.qualification}
                    onChange={(e) => {
                      const next = [...profile.education];
                      next[i] = { ...ed, qualification: e.target.value };
                      set('education', next);
                    }}
                    placeholder="Qualification"
                    className="border-gray-200 bg-white"
                  />
                  <Input
                    value={ed.institution}
                    onChange={(e) => {
                      const next = [...profile.education];
                      next[i] = { ...ed, institution: e.target.value };
                      set('education', next);
                    }}
                    placeholder="Institution"
                    className="border-gray-200 bg-white"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={ed.year}
                      onChange={(e) => {
                        const next = [...profile.education];
                        next[i] = { ...ed, year: e.target.value };
                        set('education', next);
                      }}
                      placeholder="Year"
                      className="border-gray-200 bg-white"
                    />
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
              ))}
            </div>
          )}
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
        </div>
      </div>
    </div>
  );
}
