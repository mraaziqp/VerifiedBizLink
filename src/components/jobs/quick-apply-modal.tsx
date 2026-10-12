'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Send, Upload } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import { useToast } from '@/hooks/use-toast';
import { cleanSkills } from '@/lib/talent';

interface QuickApplyModalProps {
  job: { id: string; title: string; companyName: string; requiredSkills: string[] } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 'note'  — the profile is ready; this only adds a message to the employer.
   * 'fresh' — first application: collect the two things an employer needs
   *           (a headline and skills), with a CV upload that fills them in.
   */
  mode: 'note' | 'fresh';
  onApplied: (message: string) => void;
}

const CV_MAX_BYTES = 4 * 1024 * 1024;
const CV_ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';

/**
 * Applying without leaving the listing.
 *
 * A first-time applicant is not sent away to build a profile: they upload a
 * CV here (which is read to suggest a headline and skills), check the two
 * fields, and send. Those answers become the start of their profile, so the
 * next application really is one click.
 */
export function QuickApplyModal({ job, open, onOpenChange, mode, onApplied }: QuickApplyModalProps) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [coverNote, setCoverNote] = useState('');
  const [cvName, setCvName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Start from whatever they already have, so a half-finished profile is
  // completed here rather than retyped.
  useEffect(() => {
    if (!open) return;
    setCoverNote('');
    if (mode !== 'fresh') return;
    let active = true;
    setLoadingProfile(true);
    fetch('/api/talent/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.profile) return;
        setHeadline(String(data.profile.headline ?? ''));
        setSkills(Array.isArray(data.profile.skills) ? data.profile.skills : []);
        setCvName(data.profile.cvFileName ?? (data.profile.cvUrl ? 'CV on your profile' : null));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingProfile(false); });
    return () => { active = false; };
  }, [open, mode]);

  if (!job) return null;

  const uploadCv = async (file: File) => {
    if (file.size > CV_MAX_BYTES) {
      toast({
        title: 'That file is too large',
        description: `It is ${(file.size / (1024 * 1024)).toFixed(1)}MB and the limit is 4MB. Try exporting a smaller PDF.`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/talent/cv', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Could not upload your CV', description: data.error ?? 'Please try again.', variant: 'destructive' });
        return;
      }
      setCvName(data.cvFileName ?? file.name);
      // Only fill what is empty: anything they typed is theirs.
      if (data.suggestions) {
        setHeadline((h) => h.trim() || String(data.suggestions.headline ?? ''));
        setSkills((s) => (s.length > 0 ? s : cleanSkills(data.suggestions.skills ?? [], 30)));
      }
      toast({ title: 'CV attached', description: data.message });
    } catch {
      toast({ title: 'Could not upload your CV', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const ready = mode === 'note' || (headline.trim().length > 0 && skills.length > 0);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'fresh' ? { coverNote, headline, skills } : { coverNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onApplied(data.message ?? 'Application sent.');
        onOpenChange(false);
      } else {
        toast({ title: 'Could not apply', description: data.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not send your application', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Skills this role asks for come first: one tap each for the ones they have.
  const skillIdeas = job.requiredSkills.length > 0 ? job.requiredSkills : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending && !uploading) onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-slate-900">Apply — {job.title}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            {mode === 'fresh'
              ? `${job.companyName} sees a headline, your skills and your CV. This takes a minute.`
              : `Your profile is sent to ${job.companyName} as it is right now.`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'fresh' && (
          <>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input
                ref={fileInput}
                type="file"
                accept={CV_ACCEPT}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCv(f); }}
              />
              {cvName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{cvName}</span>
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()} className="border-slate-300 font-bold text-slate-800">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Replace'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <FileText className="h-6 w-6 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">Attach your CV</p>
                    <p className="text-xs text-slate-600">PDF, Word or a photo, up to 4MB. We read it to fill in the fields below.</p>
                  </div>
                  <Button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="gap-2 bg-slate-900 font-bold text-white hover:bg-slate-800">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Reading…' : 'Choose file'}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="apply-headline" className="text-sm font-semibold text-slate-700">Headline</Label>
              <Input
                id="apply-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={160}
                disabled={loadingProfile}
                placeholder="e.g. Qualified electrician, 8 years on commercial sites"
                className="mt-1 border-slate-200 bg-white text-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">The one line an employer reads first.</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Your skills</Label>
              <TagInput
                className="mt-1"
                tags={skills}
                onChange={setSkills}
                suggestions={skillIdeas}
                placeholder="Type a skill and press Enter…"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="apply-note" className="text-sm font-semibold text-slate-700">
            Note to the employer <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Textarea
            id="apply-note"
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Why you are a good fit for this role."
            className="mt-1 border-slate-200 bg-white text-slate-900"
          />
        </div>

        <Button
          type="button"
          onClick={send}
          disabled={!ready || sending || uploading}
          className="h-12 w-full gap-2 bg-yellow-400 text-base font-bold text-slate-900 hover:bg-yellow-300"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Send application
        </Button>
        {mode === 'fresh' && (
          <p className="-mt-1 text-center text-xs text-slate-500">
            {ready
              ? 'This also starts your professional profile, kept private until you choose to list it.'
              : 'Add a headline and at least one skill to send.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
