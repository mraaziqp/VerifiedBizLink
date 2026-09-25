'use client';

import { useRef, useState } from 'react';
import {
  FileText, Upload, Camera, Loader2, ScanLine, Sparkles, Check, X, ExternalLink, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface CvSuggestions {
  headline: string;
  location: string;
  summary: string;
  skills: string[];
  workHistory: { title: string; company: string; period: string; description: string }[];
  education: { qualification: string; institution: string; year: string }[];
}

export type ApplyMode = 'fill' | 'replace';

interface CvScannerProps {
  cvUrl: string | null;
  cvFileName: string | null;
  onUploaded: (cvUrl: string, fileName: string) => void;
  onRemoved: () => void;
  onApply: (suggestions: CvSuggestions, mode: ApplyMode) => void;
}

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT_FILE = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';

/**
 * Phone photos are routinely 4-10MB — over the upload limit, and far more
 * detail than reading text needs. Re-encode to a ~2200px JPEG in the browser
 * first. Falls back to the original file if the browser cannot decode it.
 */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_BYTES && file.type === 'image/jpeg') return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function CvScanner({ cvUrl, cvFileName, onUploaded, onRemoved, onApply }: CvScannerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [suggestions, setSuggestions] = useState<CvSuggestions | null>(null);

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    const file = await shrinkImage(picked);
    if (file.size > MAX_BYTES) {
      toast({
        title: 'File too large',
        description: `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. The limit is 4MB — try exporting a smaller PDF.`,
        variant: 'destructive',
      });
      return;
    }

    setBusy('upload');
    setSuggestions(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/talent/cv', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Upload failed', description: data.error || 'Please try again.', variant: 'destructive' });
        return;
      }
      onUploaded(data.cvUrl, data.cvFileName);
      if (data.scanned && data.suggestions) {
        setSuggestions(data.suggestions);
        toast({ title: 'CV scanned', description: 'Review what we found, then add it to your profile.' });
      } else {
        toast({ title: 'CV uploaded', description: data.message });
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      const res = await fetch('/api/talent/cv', { method: 'DELETE' });
      if (res.ok) {
        onRemoved();
        setSuggestions(null);
        toast({ title: 'CV removed from your profile' });
      } else {
        toast({ title: 'Could not remove your CV', variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  const apply = (mode: ApplyMode) => {
    if (!suggestions) return;
    onApply(suggestions, mode);
    setSuggestions(null);
  };

  const found = suggestions && {
    fields: [suggestions.headline && 'headline', suggestions.location && 'location', suggestions.summary && 'summary'].filter(Boolean).length,
    skills: suggestions.skills.length,
    roles: suggestions.workHistory.length,
    education: suggestions.education.length,
  };
  const nothingFound = found && !found.fields && !found.skills && !found.roles && !found.education;

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-slate-900 p-2.5">
          <ScanLine className="h-5 w-5 text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">Your CV</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Upload your CV or scan a printed copy with your camera. We&apos;ll read it and fill in your profile for you to check.
          </p>
        </div>
      </div>

      {cvUrl && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <FileText className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{cvFileName || 'Your CV'}</p>
            <p className="text-xs text-gray-500">Sent with every job application</p>
          </div>
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            View <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            aria-label="Remove CV"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="h-11 gap-2 bg-slate-900 font-bold text-white hover:bg-slate-800"
        >
          {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-amber-400" />}
          {busy === 'upload' ? 'Scanning your CV…' : cvUrl ? 'Upload a new CV' : 'Upload CV'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraRef.current?.click()}
          disabled={busy !== null}
          className="h-11 gap-2 border-amber-300 bg-white font-bold text-amber-900 hover:bg-amber-50"
        >
          <Camera className="h-4 w-4 text-amber-600" />
          Scan paper CV
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        PDF, Word (.docx) or a photo · up to 4MB. For a multi-page paper CV, scan the first page or upload a PDF.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_FILE}
        className="hidden"
        onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }}
      />
      {/* capture opens the rear camera directly on phones; desktops get a file picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }}
      />

      {busy === 'upload' && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Reading your CV — this usually takes 10–20 seconds.
        </div>
      )}

      {suggestions && found && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-900">
              <Sparkles className="h-4 w-4" aria-hidden />
              {nothingFound ? 'We couldn’t find profile details in that file' : 'Here’s what we found'}
            </p>
            <button type="button" onClick={() => setSuggestions(null)} aria-label="Dismiss" className="text-emerald-800/60 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!nothingFound && (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                {suggestions.headline && (
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">Headline</dt><dd className="text-gray-900">{suggestions.headline}</dd></div>
                )}
                {suggestions.location && (
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">Location</dt><dd className="text-gray-900">{suggestions.location}</dd></div>
                )}
                {suggestions.skills.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">{suggestions.skills.length} skills</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {suggestions.skills.map((s) => (
                        <span key={s} className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-emerald-900">{s}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {suggestions.workHistory.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">{suggestions.workHistory.length} roles</dt>
                    <dd className="text-gray-900">
                      <ul className="mt-1 space-y-0.5">
                        {suggestions.workHistory.map((w, i) => (
                          <li key={i} className="truncate">{[w.title, w.company].filter(Boolean).join(' · ')}{w.period ? <span className="text-gray-500"> ({w.period})</span> : null}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {suggestions.education.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">Education</dt>
                    <dd className="text-gray-900">
                      <ul className="mt-1 space-y-0.5">
                        {suggestions.education.map((e, i) => (
                          <li key={i} className="truncate">{[e.qualification, e.institution].filter(Boolean).join(' · ')}{e.year ? <span className="text-gray-500"> ({e.year})</span> : null}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <Button type="button" onClick={() => apply('fill')} className="h-10 gap-1.5 bg-amber-400 font-bold text-slate-900 hover:bg-amber-300">
                  <Check className="h-4 w-4" /> Add to my profile
                </Button>
                <Button type="button" variant="outline" onClick={() => apply('replace')} className="h-10 border-gray-300 bg-white font-semibold">
                  Replace with CV details
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                &ldquo;Add&rdquo; only fills empty fields and adds new skills and roles. Nothing is saved until you press <strong>Save profile</strong>.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
