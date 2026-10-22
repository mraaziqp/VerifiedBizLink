'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, EyeOff, FileText, GraduationCap, Loader2, MessageSquare, Pencil,
  UserRound, MapPin, ShieldCheck, CheckCircle2, Sparkles, Share2, Calendar, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { PersonAvatar } from '@/components/talent/person-avatar';
import { useToast } from '@/hooks/use-toast';

interface FullProfile {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  yearsExperience: number | null;
  skills: string[];
  openToWork: boolean;
  hasCv: boolean;
  summary: string;
  isPublished: boolean;
  cvUrl: string | null;
  workHistory: { title?: string; company?: string; period?: string; description?: string }[];
  education: { qualification?: string; institution?: string; year?: string }[];
}

export default function TalentProfileViewPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;
    fetch(`/api/talent/profiles/${id}`, { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.profile) {
          setProfile(data.profile);
          setIsOwner(data.isOwner === true);
          setState('ready');
        } else {
          setState('missing');
        }
      })
      .catch(() => { if (active) setState('missing'); });
    return () => { active = false; };
  }, [id]);

  const copyProfileLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Profile share link copied to clipboard.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      <SubpageNav title="Professional profile" />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {state === 'loading' && (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-slate-500 shadow-xs">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-500" /> Loading candidate profile…
          </div>
        )}

        {state === 'missing' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-xs">
            <UserRound className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">This profile is not available</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              It may be private, or only visible to verified businesses.
            </p>
            <Button variant="outline" className="mt-5 rounded-xl border-slate-300 font-bold" asChild>
              <Link href="/talent">Back to talent directory</Link>
            </Button>
          </div>
        )}

        {state === 'ready' && profile && (
          <>
            {isOwner && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 p-4 shadow-xs">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-950 sm:text-sm">
                  {!profile.isPublished ? (
                    <EyeOff className="h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  {profile.isPublished
                    ? 'Your profile is live in the VerifiedBizLink Talent Directory. Employers can discover and message you directly.'
                    : 'Your profile is private. Only employers you apply to can view this page.'}
                </p>
                <Button asChild size="sm" className="rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 shadow-xs">
                  <Link href="/talent/profile"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile</Link>
                </Button>
              </div>
            )}

            {/* Main Executive Candidate Header Card */}
            <header className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <PersonAvatar
                      name={profile.fullName}
                      src={profile.avatarUrl}
                      size={80}
                      className="border-2 border-white ring-2 ring-amber-400 shadow-md"
                    />
                    {profile.openToWork && (
                      <span
                        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white"
                        title="Open to work"
                      >
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                        {profile.fullName}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900 border border-amber-300/60">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Verified Member
                      </span>
                    </div>

                    <p className="mt-1.5 text-base font-semibold text-slate-700">
                      {profile.headline || 'Professional on VerifiedBizLink'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
                      {profile.location && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {profile.location}
                        </span>
                      )}
                      {profile.yearsExperience !== null && profile.yearsExperience !== undefined && profile.yearsExperience > 0 && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {profile.yearsExperience}+ years experience
                        </span>
                      )}
                      {profile.openToWork && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Available for Hire
                        </span>
                      )}
                      {profile.hasCv && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700 border border-slate-200">
                          <FileText className="h-3 w-3 text-slate-500" /> CV on file
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
                  {!isOwner && (
                    <Button asChild className="h-11 rounded-xl bg-amber-400 px-5 font-extrabold text-slate-950 shadow-sm shadow-amber-400/20 hover:bg-amber-300 w-full sm:w-auto">
                      <Link href={`/dashboard/messages?with=${profile.userId}`}>
                        <MessageSquare className="h-4 w-4 mr-2" /> Message Candidate
                      </Link>
                    </Button>
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {profile.cvUrl && (
                      <Button asChild variant="outline" className="flex-1 rounded-xl border-slate-300 font-bold text-slate-800 hover:bg-slate-100 sm:flex-none">
                        <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1.5" /> {isOwner ? 'Download My CV' : 'View Full CV'}
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyProfileLink}
                      className="rounded-xl border-slate-300 p-2.5 text-slate-700 hover:bg-slate-100"
                      title="Share Profile"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            {/* 2-Column Professional Layout */}
            <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              {/* Left Column: Summary & Work Experience */}
              <div className="space-y-6">
                {/* About & Bio */}
                {profile.summary && (
                  <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <Sparkles className="h-4 w-4 text-amber-500" /> Professional Summary
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                      {profile.summary}
                    </p>
                  </section>
                )}

                {/* Work Experience Timeline */}
                {profile.workHistory.length > 0 ? (
                  <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <Briefcase className="h-4 w-4 text-amber-500" /> Career Experience
                    </h2>

                    <div className="mt-5 space-y-6">
                      {profile.workHistory.map((w, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-amber-300/70 last:border-transparent">
                          <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <h3 className="text-base font-bold text-slate-900">
                              {w.title || 'Role Title'}
                            </h3>
                            {w.period && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                <Calendar className="h-3 w-3 text-slate-400" /> {w.period}
                              </span>
                            )}
                          </div>
                          {w.company && (
                            <p className="text-xs font-extrabold text-amber-800 uppercase tracking-wide mt-0.5">
                              {w.company}
                            </p>
                          )}
                          {w.description && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                              {w.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs text-center py-10">
                    <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="mt-2 text-sm font-bold text-slate-700">Looking for new opportunities</p>
                    <p className="text-xs text-slate-500 mt-1">Eager to contribute and build career experience.</p>
                  </section>
                )}
              </div>

              {/* Right Column: Skills & Education */}
              <div className="space-y-6">
                {/* Skills Showcase */}
                {profile.skills.length > 0 && (
                  <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <Award className="h-4 w-4 text-amber-500" /> Core Skills &amp; Proficiencies
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
                        >
                          <CheckCircle2 className="h-3 w-3 text-amber-600" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education */}
                {profile.education.length > 0 && (
                  <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <GraduationCap className="h-4 w-4 text-amber-500" /> Education &amp; Training
                    </h2>
                    <div className="mt-4 space-y-3">
                      {profile.education.map((ed, i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <p className="text-sm font-extrabold text-slate-900">
                            {ed.qualification || 'Qualification'}
                          </p>
                          {(ed.institution || ed.year) && (
                            <p className="mt-0.5 text-xs font-medium text-slate-600">
                              {[ed.institution, ed.year].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Trust & Verification Pillar */}
                <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> VerifiedBizLink Talent Network
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    This candidate is part of South Africa&apos;s verified business network. Employers can contact candidates securely with direct B2B messaging.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
