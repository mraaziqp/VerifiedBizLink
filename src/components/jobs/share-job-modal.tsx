'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Facebook, Linkedin, Mail, MessageCircle, Share2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { jobPath, jobSummaryLine } from '@/lib/talent';
import { canonicalOrigin } from '@/lib/site-url';
import type { JobJson } from '@/lib/jobs-server';

type ShareableJob = Pick<JobJson,
  'id' | 'slug' | 'title' | 'status' | 'companyName' | 'businessVerified' | 'locationType' | 'location'
  | 'employmentType' | 'salaryMinCents' | 'salaryMaxCents' | 'salaryPeriod'
>;

interface ShareJobModalProps {
  job: ShareableJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Clipboard API where it exists; the old selection trick where it does not (http, older WebViews). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share & distribute: the link, the apps people actually pass jobs around in,
 * and a QR code for a shop window or a printed notice.
 *
 * Every link is built on the www address. The bare domain only forwards its
 * home page, so a job link without "www" would land on an error — which is
 * exactly the kind of link a share sheet must never hand out.
 */
export function ShareJobModal({ job, open, onOpenChange }: ShareJobModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const url = useMemo(() => {
    if (!job || typeof window === 'undefined') return '';
    return `${canonicalOrigin(window.location.origin)}${jobPath(job)}`;
  }, [job]);

  const headline = job ? `${job.title} at ${job.companyName}` : '';
  const summary = job ? jobSummaryLine({ ...job, companyName: null }) : '';
  const message = [
    job ? `${job.title} — ${job.companyName}${job.businessVerified ? ' (verified employer)' : ''}` : '',
    summary,
    url ? `Apply on VerifiedBizLink: ${url}` : '',
  ].filter(Boolean).join('\n');

  useEffect(() => {
    if (!open || !url) return;
    let active = true;
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    // Generous size and error correction: this gets printed and photographed.
    // The generator is fetched here, on open, rather than with the page.
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, {
        width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' },
      }))
      .then((data) => { if (active) setQr(data); })
      .catch(() => { if (active) setQr(null); });
    return () => { active = false; };
  }, [open, url]);

  // The "Copied" tick clears itself — and is cancelled if the modal closes or
  // unmounts first, so no timer outlives the thing it was going to update.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!job) return null;

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      toast({ title: 'Link copied', description: 'Paste it anywhere — it opens without an account.' });
    } else {
      toast({ title: 'Could not copy', description: 'Select the link and copy it by hand.', variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: headline, text: message.split('\n').slice(0, 2).join('\n'), url });
    } catch {
      // Dismissing the share sheet is not an error.
    }
  };

  const e = encodeURIComponent;
  const channels = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${e(message)}`,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    },
    {
      label: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
      tone: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    },
    {
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      tone: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    },
    {
      label: 'Email',
      icon: Mail,
      href: `mailto:?subject=${e(headline)}&body=${e(message)}`,
      tone: 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
    },
  ];

  const live = job.status === 'open';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-slate-900">Share &amp; distribute</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            {job.title} · {job.companyName}
          </DialogDescription>
        </DialogHeader>

        {!live && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This role is not live, so the link only opens for you right now. Publish it and the
            same link works for everyone.
          </p>
        )}

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Public link</p>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={url}
              onFocus={(ev) => ev.currentTarget.select()}
              aria-label="Public link to this job"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-slate-900"
            />
            <Button
              type="button"
              onClick={copy}
              className="h-10 shrink-0 gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Send it to</p>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${c.tone}`}
              >
                <c.icon className="h-4 w-4" /> {c.label}
              </a>
            ))}
          </div>
          {canNativeShare && (
            <Button
              type="button"
              variant="outline"
              onClick={nativeShare}
              className="mt-2 w-full gap-2 border-slate-300 font-bold text-slate-800"
            >
              <Share2 className="h-4 w-4" /> More apps…
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {qr ? (
            // A plain <img>: the source is a data URL generated right here.
            <img src={qr} alt={`QR code linking to ${headline}`} className="h-28 w-28 shrink-0 rounded-lg border border-slate-200 bg-white" />
          ) : (
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-lg bg-slate-200" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">QR code</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              For a shop window, a flyer or a slide. Scanning it opens this job.
            </p>
            {qr && (
              <a
                href={qr}
                download={`${job.slug || 'job'}-qr.png`}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 underline underline-offset-2"
              >
                <Download className="h-3.5 w-3.5" /> Download PNG
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
