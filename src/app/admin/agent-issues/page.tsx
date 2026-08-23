'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertTriangle, MessageSquare, Send, Inbox,
  CircleDot, CheckCircle2, ExternalLink, Mail, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard } from '@/components/admin/ui';

interface Issue {
  id: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  referralCode: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  pageUrl: string | null;
  screenshotUrl: string | null;
  status: string;
  adminResponse: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
}

interface Summary {
  open: number;
  inProgress: number;
  blocking: number;
  total: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  app_bug: 'App problem',
  payment: 'Payment / commission',
  customer: 'Customer or business',
  account: 'Their account',
  feature_request: 'Suggestion',
  other: 'Other',
};

const PRIORITY_STYLES: Record<string, string> = {
  blocking: 'bg-red-500/15 text-red-700',
  high: 'bg-orange-500/15 text-orange-700',
  normal: 'bg-blue-500/15 text-blue-700',
  low: 'bg-gray-200 text-gray-600',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-700',
  in_progress: 'bg-blue-500/15 text-blue-700',
  resolved: 'bg-green-500/15 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'Being worked on' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

/**
 * What the Advisors have told us.
 *
 * Ordered blocking-first by the API rather than newest-first: an Advisor who
 * cannot work is losing commission every hour, which is a different kind of
 * message from a suggestion.
 */
export default function AgentIssuesPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<Summary>({ open: 0, inProgress: 0, blocking: 0, total: 0 });
  // Derived rather than a separate flag: the list is "loading" whenever what is
  // on screen was fetched for a different filter than the one now selected.
  const [loadedFilter, setLoadedFilter] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const loading = loadedFilter !== filter;
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    const qs = status === 'all' ? '' : `?status=${status}`;
    const res = await fetch(`/api/admin/agent-issues${qs}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    let active = true;
    (async () => {
      try {
        const data = await load(filter);
        if (!active) return;
        if (data) {
          setIssues(data.issues || []);
          setSummary(data.summary || { open: 0, inProgress: 0, blocking: 0, total: 0 });
        }
      } catch (e) {
        console.error('Failed to load agent issues:', e);
      } finally {
        if (active) setLoadedFilter(filter);
      }
    })();
    return () => { active = false; };
  }, [authLoading, user, filter, load]);

  const update = async (issue: Issue, status?: string) => {
    const response = replies[issue.id]?.trim();
    if (!status && !response) {
      toast({ title: 'Write a reply or pick a status first', variant: 'destructive' });
      return;
    }
    setBusyId(issue.id);
    try {
      const res = await fetch('/api/admin/agent-issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: issue.id, status, response: response || undefined }),
      });
      const data = await res.json();
      toast({
        title: res.ok ? 'Sent' : 'Could not update',
        description: data.message || data.error,
        variant: res.ok ? undefined : 'destructive',
      });
      if (res.ok) {
        setReplies((r) => ({ ...r, [issue.id]: '' }));
        const fresh = await load(filter);
        if (fresh) {
          setIssues(fresh.issues || []);
          setSummary(fresh.summary || summary);
        }
      }
    } catch {
      toast({ title: 'Could not update the report', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  if (!authLoading && user && user.role !== 'admin') {
    return (
      <AdminBackground>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Admins only.</p>
        </div>
      </AdminBackground>
    );
  }

  return (
    <AdminBackground>
      <AdminPageHeader
        title="Advisor Reports"
        subtitle="Queries and problems raised by the sales team, answered from here"
      >
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Blocking" value={summary.blocking} icon={AlertTriangle} gradient="from-red-500 to-orange-400" loading={loading} />
          <StatCard label="Open" value={summary.open} icon={Inbox} gradient="from-amber-500 to-yellow-400" loading={loading} />
          <StatCard label="Being worked on" value={summary.inProgress} icon={CircleDot} gradient="from-blue-500 to-sky-400" loading={loading} />
          <StatCard label="Total shown" value={summary.total} icon={MessageSquare} loading={loading} />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === f.id
                  ? 'bg-yellow-500 text-slate-950'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <AdminCard>
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reports…
            </div>
          </AdminCard>
        ) : issues.length === 0 ? (
          <AdminCard>
            <div className="p-10 text-center text-gray-500">
              Nothing here. When an advisor reports something from their portal it lands on this page.
            </div>
          </AdminCard>
        ) : (
          <div className="space-y-4">
            {issues.map((i) => (
              <AdminCard key={i.id}>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{i.subject}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[i.priority] ?? PRIORITY_STYLES.low}`}>
                        {i.priority}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[i.status] ?? STATUS_STYLES.closed}`}>
                        {String(i.status).replace('_', ' ')}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {CATEGORY_LABELS[i.category] ?? i.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {i.agentName}
                      {i.referralCode ? ` (${i.referralCode})` : ''} ·{' '}
                      {new Date(i.createdAt).toLocaleString('en-ZA')}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <a href={`mailto:${i.agentEmail}`} className="flex items-center gap-1 text-amber-600 hover:underline">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                    {i.agentPhone && (
                      <a href={`tel:${i.agentPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{i.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {i.screenshotUrl && (
                    <a href={i.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={i.screenshotUrl}
                        alt="Screenshot from the advisor"
                        className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                      />
                    </a>
                  )}
                  {i.pageUrl && (
                    <a
                      href={i.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Page they were on
                    </a>
                  )}
                </div>

                {i.adminResponse && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {i.respondedBy ?? 'Admin'} replied
                      {i.respondedAt ? ` · ${new Date(i.respondedAt).toLocaleDateString('en-ZA')}` : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-green-900">{i.adminResponse}</p>
                  </div>
                )}

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <Textarea
                    value={replies[i.id] ?? ''}
                    onChange={(e) => setReplies((r) => ({ ...r, [i.id]: e.target.value }))}
                    rows={2}
                    placeholder="Reply to the advisor — they see this in their portal and get a notification."
                    className="border-gray-200 bg-white"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === i.id}
                      onClick={() => update(i)}
                      className="gap-2 bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600"
                    >
                      {busyId === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send reply
                    </Button>
                    {i.status !== 'in_progress' && (
                      <Button size="sm" variant="outline" disabled={busyId === i.id} onClick={() => update(i, 'in_progress')} className="border-gray-300 text-gray-700">
                        Mark in progress
                      </Button>
                    )}
                    {i.status !== 'resolved' && (
                      <Button size="sm" variant="outline" disabled={busyId === i.id} onClick={() => update(i, 'resolved')} className="border-green-300 text-green-700 hover:bg-green-50">
                        Resolve
                      </Button>
                    )}
                    {i.status !== 'closed' && (
                      <Button size="sm" variant="outline" disabled={busyId === i.id} onClick={() => update(i, 'closed')} className="border-gray-300 text-gray-500">
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>
    </AdminBackground>
  );
}
