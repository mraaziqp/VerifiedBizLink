'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Download, ExternalLink, Eye, EyeOff, FileText, GraduationCap, Link2, Loader2, Lock, Mail,
  MapPin, MessageSquare, Save,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApplicationStatusPill, MatchBadge } from '@/components/jobs/job-badges';
import { PersonAvatar } from '@/components/talent/person-avatar';
import type { Applicant, ApplicantProfile, ApplicationEvent } from '@/components/jobs/applicant-types';
import {
  APPLICATION_STATUS_LABELS, PIPELINE_STATUSES, formatDay, normaliseSkill, type ApplicationStatus,
} from '@/lib/talent';

interface CandidateDrawerProps {
  applicant: Applicant | null;
  requiredSkills: string[];
  onClose: () => void;
  onMove: (applicant: Applicant, to: ApplicationStatus) => void;
  onNotesSaved: (applicationId: string, notes: string) => void;
}

interface Detail { events: ApplicationEvent[]; profile: ApplicantProfile | null }

function eventText(e: ApplicationEvent): string {
  if (e.kind === 'applied') return 'Applied';
  if (e.kind === 'withdrawn') return 'Candidate withdrew';
  const to = e.toStatus ? APPLICATION_STATUS_LABELS[e.toStatus] ?? e.toStatus : '';
  return `Moved to ${to}`;
}

const heading = 'text-xs font-bold uppercase tracking-wide text-slate-500';

/**
 * Everything about one candidate, without leaving the applicant list: what
 * they sent, their CV, how to reach them, the employer's own notes, and what
 * has happened so far.
 */
export function CandidateDrawer({ applicant, requiredSkills, onClose, onMove, onNotesSaved }: CandidateDrawerProps) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showCv, setShowCv] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const id = applicant?.id ?? null;
  const status = applicant?.status ?? null;

  useEffect(() => {
    setNotes(applicant?.employerNotes ?? '');
    setShowCv(false);
    // Only when a different candidate is opened: typing must not be reset by
    // the parent re-rendering with the same person.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Their profile and history, read when the candidate changes or has just
  // been moved. Aborted if the drawer moves on before the answer arrives.
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    // Blank only for a different person. After a move the same drawer keeps
    // what it shows until the fresh history arrives, so notes being typed
    // are not pulled out from under the cursor.
    if (loadedFor.current !== id) setDetail(null);
    loadedFor.current = id;
    fetch(`/api/applications/${id}`, { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetail({
        events: Array.isArray(data?.events) ? data.events : [],
        profile: data?.profile ?? null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setDetail({ events: [], profile: null });
      });
    return () => controller.abort();
  }, [id, status]);

  const saveNotes = async () => {
    if (!applicant) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/applications/${applicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotesSaved(applicant.id, notes);
        toast({ title: 'Notes saved', description: 'Only you can see them.' });
      } else {
        toast({ title: 'Could not save notes', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not reach the server', variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  const a = applicant;
  const required = new Set(requiredSkills.map(normaliseSkill));
  const notesDirty = a ? notes !== (a.employerNotes ?? '') : false;
  const profile = detail?.profile ?? null;
  const hasProfile = Boolean(profile && (profile.summary || profile.yearsExperience !== null
    || profile.workHistory.length || profile.education.length || profile.portfolioLinks.length));

  return (
    <Sheet open={a !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-xl">
        {a && (
          <>
            <SheetHeader className="border-b border-slate-100 px-5 py-4 text-left">
              <div className="flex items-start gap-3 pr-8">
                <PersonAvatar name={a.applicant.fullName} src={a.applicant.avatarUrl} size={48} />
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg font-extrabold text-slate-900">{a.applicant.fullName}</SheetTitle>
                  <SheetDescription className="text-sm text-slate-600">{a.headline || 'No headline'}</SheetDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ApplicationStatusPill status={a.status} />
                    {a.matchScore !== null && <MatchBadge score={a.matchScore} />}
                    {a.applicant.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {a.applicant.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="gap-1.5 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                  <Link href={`/dashboard/messages?with=${a.applicant.id}`}>
                    <MessageSquare className="h-4 w-4" /> Message
                    {a.unreadMessages > 0 && (
                      <span className="rounded-full bg-slate-900 px-1.5 text-[11px] font-black text-white">{a.unreadMessages}</span>
                    )}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5 border-slate-300 font-bold text-slate-800">
                  <a href={`mailto:${a.applicant.email}`}><Mail className="h-4 w-4" /> Email</a>
                </Button>
                {a.status !== 'withdrawn' && (
                  <label className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-600">
                    Stage
                    <select
                      value={a.status}
                      onChange={(e) => onMove(a, e.target.value as ApplicationStatus)}
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900"
                    >
                      {PIPELINE_STATUSES.map((s) => (
                        <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <p className="text-xs text-slate-500">
                Applied {formatDay(a.createdAt)} · <span className="break-all">{a.applicant.email}</span>
              </p>

              {a.coverNote && (
                <section>
                  <h3 className={heading}>Their note to you</h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border-l-4 border-amber-400 bg-amber-50/60 p-3 text-sm leading-relaxed text-slate-800">
                    {a.coverNote}
                  </p>
                </section>
              )}

              <section>
                <h3 className={heading}>CV</h3>
                {a.cvUrl ? (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                        {a.cvFileName ?? 'CV as sent with this application'}
                      </span>
                      {a.cvPreview && (
                        <Button size="sm" variant="outline" onClick={() => setShowCv((s) => !s)} className="gap-1.5 border-slate-300 font-bold text-slate-800">
                          {showCv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showCv ? 'Hide' : 'Preview'}
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline" className="gap-1.5 border-slate-300 font-bold text-slate-800">
                        <a href={a.cvUrl} target="_blank" rel="noopener noreferrer">
                          {a.cvPreview ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                          {a.cvPreview ? 'Open' : 'Download'}
                        </a>
                      </Button>
                    </div>
                    {showCv && a.cvPreview === 'pdf' && (
                      <iframe
                        src={a.cvUrl}
                        title={`CV of ${a.applicant.fullName}`}
                        className="mt-3 h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
                      />
                    )}
                    {showCv && a.cvPreview === 'image' && (
                      // A plain <img>: the file is served by the permission-checked CV route.
                      <img src={a.cvUrl} alt={`CV of ${a.applicant.fullName}`} className="mt-3 w-full rounded-lg border border-slate-200 bg-white" />
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No CV was attached. Their headline and skills are what they sent.</p>
                )}
              </section>

              {a.skills.length > 0 && (
                <section>
                  <h3 className={heading}>Skills</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.skills.map((s) => {
                      const wanted = required.has(normaliseSkill(s));
                      return (
                        <span
                          key={s}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            wanted ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                  {required.size > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">Green are skills this role asks for.</p>
                  )}
                </section>
              )}

              {detail === null ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading their profile and history…
                </p>
              ) : (
                <>
                  {profile && hasProfile && (
                    <section>
                      <h3 className={heading}>Profile today</h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Their current profile. The headline, skills and CV above are as they were when they applied.
                      </p>

                      {profile.yearsExperience !== null && (
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {profile.yearsExperience} year{profile.yearsExperience === 1 ? '' : 's'} of experience
                        </p>
                      )}
                      {profile.summary && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{profile.summary}</p>
                      )}

                      {profile.portfolioLinks.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {profile.portfolioLinks.map((link) => (
                            <li key={link.url}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:border-slate-400"
                              >
                                <Link2 className="h-3 w-3" /> {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}

                      {profile.workHistory.length > 0 && (
                        <div className="mt-4">
                          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Briefcase className="h-4 w-4 text-slate-400" /> Work history</p>
                          <ul className="mt-2 space-y-3 border-l-2 border-slate-100 pl-3">
                            {profile.workHistory.map((w, i) => (
                              <li key={i}>
                                <p className="text-sm font-semibold text-slate-900">{[w.title, w.company].filter(Boolean).join(' · ') || 'Role'}</p>
                                {w.period && <p className="text-xs text-slate-500">{w.period}</p>}
                                {w.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{w.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {profile.education.length > 0 && (
                        <div className="mt-4">
                          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><GraduationCap className="h-4 w-4 text-slate-400" /> Education</p>
                          <ul className="mt-2 space-y-1.5">
                            {profile.education.map((ed, i) => (
                              <li key={i} className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">{ed.qualification || 'Qualification'}</span>
                                {[ed.institution, ed.year].filter(Boolean).length > 0 && ` — ${[ed.institution, ed.year].filter(Boolean).join(', ')}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Link
                        href={`/talent/${a.applicant.id}`}
                        target="_blank"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-700 underline underline-offset-2"
                      >
                        Open full profile <ExternalLink className="h-3 w-3" />
                      </Link>
                    </section>
                  )}

                  <section>
                    <h3 className={`flex items-center gap-1.5 ${heading}`}>
                      <Lock className="h-3 w-3" /> Your notes
                    </h3>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Interview impressions, salary expectations, who referred them…"
                      className="mt-2 border-slate-200 bg-white text-slate-900"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">Private to your business. The candidate never sees these.</p>
                      <Button size="sm" onClick={saveNotes} disabled={!notesDirty || savingNotes} className="gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800">
                        {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save notes
                      </Button>
                    </div>
                  </section>

                  <section>
                    <h3 className={heading}>Activity</h3>
                    {detail.events.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Applied {formatDay(a.createdAt)}. Stage changes will be listed here.</p>
                    ) : (
                      <ol className="mt-2 space-y-3 border-l-2 border-slate-100 pl-3">
                        {detail.events.map((e) => (
                          <li key={e.id}>
                            <p className="text-sm font-semibold text-slate-900">
                              {eventText(e)}
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                {formatDay(e.createdAt)}{e.kind === 'status' && e.actorName ? ` · ${e.byMe ? 'you' : e.actorName}` : ''}
                              </span>
                            </p>
                            {e.detail && (
                              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-600">
                                {e.hasMessage ? 'Message sent: ' : ''}{e.detail}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
