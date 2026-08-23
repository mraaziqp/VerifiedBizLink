'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Save, Send, Image as ImageIcon, X, CheckCircle2,
  Clock, AlertTriangle, MessageSquare, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/image-compress';

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  bio: string;
}

interface Issue {
  id: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  screenshotUrl: string | null;
  status: string;
  adminResponse: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  app_bug: 'Something is broken',
  payment: 'Payment or commission',
  customer: 'A customer or business',
  account: 'My account',
  feature_request: 'Suggestion',
  other: 'Something else',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low — whenever',
  normal: 'Normal',
  high: 'High — slowing me down',
  blocking: 'Blocking — I cannot work',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-700',
  in_progress: 'bg-blue-500/15 text-blue-700',
  resolved: 'bg-green-500/15 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
};

/**
 * The Advisor's own admin: their contact details, and a direct line to the
 * directors.
 *
 * A field marketer standing in a shop needs to raise a problem with a
 * screenshot in under a minute, and needs to see that somebody answered.
 * Both halves live together because both are "my account", not selling.
 */
export function AgentSupportPanel() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    category: 'app_bug',
    priority: 'normal',
    subject: '',
    description: '',
  });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [p, i] = await Promise.all([
      fetch('/api/agent/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/agent/issues', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    return { p, i };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { p, i } = await load();
      if (!active) return;
      if (p?.profile) setProfile(p.profile);
      if (i?.issues) setIssues(i.issues);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [load]);

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      toast({
        title: res.ok ? 'Details saved' : 'Could not save',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
    } catch {
      toast({ title: 'Could not save your details', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Uploads through the normal media route so size limits and storage are
   * handled in one place. If that fails the compressed image is kept as a
   * data URL rather than losing the evidence — a report with a picture is
   * worth far more than a tidy URL.
   */
  const pickScreenshot = async (file: File) => {
    setUploadingShot(true);
    try {
      const prepared = await compressImage(file, { maxDim: 1600, quality: 0.8 });
      const fd = new FormData();
      fd.append('file', prepared);
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setScreenshot(data.url);
      } else {
        const reader = new FileReader();
        reader.onload = () => setScreenshot(String(reader.result));
        reader.readAsDataURL(prepared);
      }
    } catch {
      toast({ title: 'Could not attach that image', variant: 'destructive' });
    } finally {
      setUploadingShot(false);
    }
  };

  const submit = async () => {
    if (form.subject.trim().length < 4 || form.description.trim().length < 10) {
      toast({
        title: 'A little more detail please',
        description: 'Give it a short title and describe what happened.',
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/agent/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          screenshotUrl: screenshot,
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Sent to the directors', description: data.message });
        setForm({ category: 'app_bug', priority: 'normal', subject: '', description: '' });
        setScreenshot(null);
        const { i } = await load();
        if (i?.issues) setIssues(i.issues);
      } else {
        toast({ title: 'Could not send', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not send your report', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 p-10 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const field = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile((p) => (p ? { ...p, [k]: e.target.value } : p));

  return (
    <div className="space-y-6">
      {/* My details */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-md sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
          <User className="h-5 w-5 text-amber-600" /> My details
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Keep these current — your name is what a business sees when they sign up
          through your link.
        </p>

        {profile && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Full name</Label>
                <Input value={profile.fullName} onChange={field('fullName')} className="mt-1 border-gray-200 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Email</Label>
                <Input value={profile.email} readOnly className="mt-1 border-gray-200 bg-gray-50 text-gray-500" />
                <p className="mt-1 text-xs text-gray-400">Ask an admin to change this.</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Phone</Label>
                <Input value={profile.phone} onChange={field('phone')} placeholder="082 123 4567" className="mt-1 border-gray-200 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Area you cover</Label>
                <Input value={profile.location} onChange={field('location')} placeholder="Cape Town" className="mt-1 border-gray-200 bg-white" />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-sm font-semibold text-gray-700">About you</Label>
              <Textarea
                value={profile.bio}
                onChange={field('bio')}
                rows={3}
                placeholder="A short introduction businesses may see."
                className="mt-1 border-gray-200 bg-white"
              />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="mt-4 gap-2 bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save my details
            </Button>
          </>
        )}
      </div>

      {/* Contact the directors */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-md sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
          <MessageSquare className="h-5 w-5 text-amber-600" /> Contact the directors
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Anything wrong, unclear or worth suggesting — this goes straight to the
          admin team. Add a screenshot and they can see exactly what you saw.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold text-gray-700">What is this about?</Label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">How urgent?</Label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-sm font-semibold text-gray-700">Short title</Label>
          <Input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="e.g. Signup link not working on my phone"
            className="mt-1 border-gray-200 bg-white"
          />
        </div>

        <div className="mt-4">
          <Label className="text-sm font-semibold text-gray-700">What happened?</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            placeholder="Tell them what you were doing and what went wrong."
            className="mt-1 border-gray-200 bg-white"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickScreenshot(f); }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploadingShot}
            onClick={() => fileRef.current?.click()}
            className="gap-2 border-gray-300 text-gray-700"
          >
            {uploadingShot ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {screenshot ? 'Change screenshot' : 'Add a screenshot'}
          </Button>

          {screenshot && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshot} alt="Attached screenshot" className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
              <button type="button" onClick={() => setScreenshot(null)} className="text-gray-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button onClick={submit} disabled={sending} className="ml-auto gap-2 bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to directors
          </Button>
        </div>
      </div>

      {/* What I've reported */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-md sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Clock className="h-5 w-5 text-amber-600" /> My reports
        </h2>

        {issues.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing reported yet. Anything you send appears here with its status and
            any reply.
          </p>
        ) : (
          <ul className="space-y-3">
            {issues.map((i) => (
              <li key={i.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{i.subject}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[i.status] ?? STATUS_STYLES.closed}`}>
                    {String(i.status).replace('_', ' ')}
                  </span>
                  {i.priority === 'blocking' && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3" /> blocking
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(i.createdAt).toLocaleDateString('en-ZA')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{i.description}</p>

                {i.adminResponse && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {i.respondedBy ?? 'The team'} replied
                    </p>
                    <p className="mt-1 text-sm text-green-900">{i.adminResponse}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
