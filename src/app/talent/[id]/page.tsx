'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, EyeOff, FileText, GraduationCap, Loader2, MessageSquare, Pencil, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { TalentCard, type TalentCardData } from '@/components/talent/talent-card';

interface FullProfile extends TalentCardData {
  userId: string;
  summary: string;
  isPublished: boolean;
  cvUrl: string | null;
  workHistory: { title?: string; company?: string; period?: string; description?: string }[];
  education: { qualification?: string; institution?: string; year?: string }[];
}

/**
 * One person's professional profile, as an employer reads it. The owner sees
 * the same page, with a note about who else can.
 */
export default function TalentProfileViewPage() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Professional profile" />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {state === 'loading' && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        )}

        {state === 'missing' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-900">This profile is not available</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              It may be private, or only visible to verified businesses.
            </p>
            <Button variant="outline" className="mt-4 border-slate-300 font-bold" asChild>
              <Link href="/talent">Back to the directory</Link>
            </Button>
          </div>
        )}

        {state === 'ready' && profile && (
          <>
            {isOwner && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-start gap-2 text-sm text-slate-700">
                  {!profile.isPublished && <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                  {profile.isPublished
                    ? 'This is what verified businesses see when they find you.'
                    : 'Your profile is private. Only employers you apply to see this page.'}
                </p>
                <Button asChild size="sm" className="gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800">
                  <Link href="/talent/profile"><Pencil className="h-3.5 w-3.5" /> Edit profile</Link>
                </Button>
              </div>
            )}

            <TalentCard
              profile={{ ...profile, summary: null }}
              maxSkills={40}
              footer={(
                <div className="flex flex-wrap gap-2">
                  {!isOwner && (
                    <Button asChild className="gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                      <Link href={`/dashboard/messages?with=${profile.userId}`}><MessageSquare className="h-4 w-4" /> Message</Link>
                    </Button>
                  )}
                  {profile.cvUrl && (
                    <Button asChild variant="outline" className="gap-2 border-slate-300 font-bold text-slate-800">
                      <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> {isOwner ? 'My CV' : 'View CV'}</a>
                    </Button>
                  )}
                </div>
              )}
            />

            {!isOwner && profile.hasCv && !profile.cvUrl && (
              <p className="px-1 text-xs text-slate-500">
                A CV is on file. It is shared when this person applies to one of your roles, or if they send it to you in a message.
              </p>
            )}

            {profile.summary && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">About</h2>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{profile.summary}</p>
              </section>
            )}

            {profile.workHistory.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Briefcase className="h-4 w-4" /> Work history
                </h2>
                <ul className="mt-3 space-y-4 border-l-2 border-slate-100 pl-4">
                  {profile.workHistory.map((w, i) => (
                    <li key={i}>
                      <p className="font-bold text-slate-900">{[w.title, w.company].filter(Boolean).join(' · ') || 'Role'}</p>
                      {w.period && <p className="text-xs text-slate-500">{w.period}</p>}
                      {w.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{w.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {profile.education.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <GraduationCap className="h-4 w-4" /> Education
                </h2>
                <ul className="mt-3 space-y-2">
                  {profile.education.map((ed, i) => (
                    <li key={i} className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">{ed.qualification || 'Qualification'}</span>
                      {[ed.institution, ed.year].filter(Boolean).length > 0 && ` — ${[ed.institution, ed.year].filter(Boolean).join(', ')}`}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
