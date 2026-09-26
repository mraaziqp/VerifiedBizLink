'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, QrCode, RefreshCw, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminBackground, AdminCard, AdminPageHeader } from '@/components/admin/ui';
import { useAuth } from '@/contexts/auth-context';
import type { AppBuild, BuildsResult } from '@/lib/app-builds';

const REPO = 'https://github.com/mraaziqp/VerifiedBizLink';

function size(bytes: number | null) {
  return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—';
}

function when(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

const downloadHref = (b: AppBuild) => `/api/admin/app-builds/link?name=${encodeURIComponent(b.name)}&redirect=1`;

export default function AdminMobileAppPage() {
  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState<BuildsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<{ name: string; image: string; expires: number } | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/app-builds', { cache: 'no-store' });
      setResult((await res.json()) as BuildsResult);
    } catch {
      setResult({ ok: false, reason: 'error', message: 'Could not load builds. Check your connection.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user, load]);

  const showQr = async (b: AppBuild) => {
    setQrLoading(b.name);
    setQrError(null);
    try {
      const res = await fetch(`/api/admin/app-builds/link?name=${encodeURIComponent(b.name)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create a link.');
      setQr({ name: b.name, image: data.qr, expires: Date.now() + data.expiresInSecs * 1000 });
    } catch (e) {
      setQrError(e instanceof Error ? e.message : 'Could not create a link.');
    } finally {
      setQrLoading(null);
    }
  };

  if (authLoading) {
    return (
      <AdminBackground>
        <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      </AdminBackground>
    );
  }
  if (user?.role !== 'admin') {
    return (
      <AdminBackground>
        <div className="flex min-h-screen items-center justify-center"><p className="text-slate-600">Admins only.</p></div>
      </AdminBackground>
    );
  }

  const builds = result?.ok ? result.builds : [];
  const latest = builds[0];

  return (
    <AdminBackground>
      <AdminPageHeader title="Mobile App — test builds" subtitle="Android APKs for testing on your phone. Private to admins until you decide to release.">
        <Button variant="outline" size="sm" className="gap-2 rounded-xl bg-white" asChild>
          <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Admin</Link>
        </Button>
      </AdminPageHeader>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {loading ? (
          <AdminCard className="flex items-center gap-3 p-6 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading builds…</AdminCard>
        ) : !result?.ok || !latest ? (
          <>
            {!result?.ok && (
              <AdminCard className="space-y-4 p-6">
                <h2 className="text-lg font-black text-slate-900">
                  {result?.reason === 'no_bucket' ? 'No builds published yet'
                    : result?.reason === 'not_configured' ? 'Storage not configured'
                    : result?.reason === 'unreachable' ? "Can't reach your Supabase storage"
                    : 'Could not load builds'}
                </h2>
                <p className="text-sm text-slate-700">{result?.message}</p>
                {result?.reason === 'unreachable' ? (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    <li>Open <a className="font-semibold text-slate-900 underline" href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer">your Supabase dashboard</a>. If the project says <b>Paused</b>, click <b>Restore project</b> and wait a few minutes. (This also fixes profile pictures stored in Supabase.)</li>
                    <li>If it isn&apos;t paused, check that <code className="rounded bg-slate-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> in Amplify matches the project&apos;s URL (Project Settings → API), then redeploy.</li>
                    <li>Come back here and press <b>Refresh</b>. Until then, use the GitHub download below.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    <li>
                      On GitHub, open <a className="font-semibold text-slate-900 underline" href={`${REPO}/settings/secrets/actions`} target="_blank" rel="noreferrer">Settings → Secrets and variables → Actions</a> and add two repository secrets:
                      <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">SUPABASE_URL</code> (same value as <code className="rounded bg-slate-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> in Amplify) and
                      <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
                    </li>
                    <li>
                      Open <a className="font-semibold text-slate-900 underline" href={`${REPO}/actions/workflows/android-build.yml`} target="_blank" rel="noreferrer">Actions → Build Android App (APK)</a>, click <b>Run workflow</b> on <b>main</b>, and wait about 5 minutes.
                    </li>
                    <li>Come back here and press <b>Refresh</b>.</li>
                  </ol>
                )}
                <Button onClick={load} variant="outline" className="gap-2 rounded-xl"><RefreshCw className="h-4 w-4" /> Refresh</Button>
              </AdminCard>
            )}
            {result?.ok && !latest && (
              <AdminCard className="space-y-3 p-6">
                <h2 className="text-lg font-black text-slate-900">No builds yet</h2>
                <p className="text-sm text-slate-700">
                  Run <a className="font-semibold underline" href={`${REPO}/actions/workflows/android-build.yml`} target="_blank" rel="noreferrer">Build Android App (APK)</a> on GitHub, then refresh.
                </p>
                <Button onClick={load} variant="outline" className="gap-2 rounded-xl"><RefreshCw className="h-4 w-4" /> Refresh</Button>
              </AdminCard>
            )}
            {/* Always works: every CI build keeps its APK as a GitHub artifact for 30 days. */}
            <AdminCard className="space-y-3 p-6">
              <h3 className="font-black text-slate-900">Download the latest build from GitHub instead</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                <li>Sign in to GitHub, then open the <a className="font-semibold text-slate-900 underline" href={`${REPO}/actions/workflows/android-build.yml?query=branch%3Amain+is%3Asuccess`} target="_blank" rel="noreferrer">latest successful Android builds</a> and click the top one.</li>
                <li>Scroll to <b>Artifacts</b> and click <b>VerifiedBizLink-APK-…</b> — it downloads as a .zip.</li>
                <li>Open the zip on your phone (the Files app can extract it) and tap the <b>.apk</b> inside to install. Allow &ldquo;install unknown apps&rdquo; if Android asks.</li>
              </ol>
              <Button asChild className="h-11 gap-2 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">
                <a href={`${REPO}/actions/workflows/android-build.yml?query=branch%3Amain+is%3Asuccess`} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /> Open builds on GitHub</a>
              </Button>
            </AdminCard>
          </>
        ) : (
          <>
            <AdminCard className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-amber-400"><Smartphone className="h-7 w-7" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest {latest.kind === 'release' ? 'release' : 'test'} build</p>
                    <h2 className="text-2xl font-black text-slate-900">Version {latest.version}</h2>
                    <p className="text-sm text-slate-600">
                      {when(latest.createdAt)} · {size(latest.sizeBytes)} ·{' '}
                      <a className="underline" href={`${REPO}/commit/${latest.commit}`} target="_blank" rel="noreferrer">{latest.commit}</a>
                    </p>
                  </div>
                </div>
                <Button onClick={load} variant="ghost" size="sm" className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 flex-1 gap-2 rounded-xl bg-amber-400 font-bold text-slate-900 hover:bg-amber-300">
                  <a href={downloadHref(latest)}><Download className="h-5 w-5" /> Download APK</a>
                </Button>
                <Button onClick={() => showQr(latest)} disabled={qrLoading === latest.name} variant="outline" className="h-12 flex-1 gap-2 rounded-xl">
                  {qrLoading === latest.name ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />} Scan with your phone
                </Button>
              </div>
              {qrError && <p role="alert" className="text-sm font-medium text-red-700">{qrError}</p>}
              {qr && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <img src={qr.image} alt="QR code linking to the APK download" width={220} height={220} className="rounded-lg bg-white p-2" />
                  <p className="text-sm text-slate-700">Scan with your Android phone&apos;s camera to download <b>{qr.name}</b>.</p>
                  <p className="text-xs text-slate-500">This link is private and expires at {new Date(qr.expires).toLocaleTimeString('en-ZA', { timeStyle: 'short' })}.</p>
                </div>
              )}
            </AdminCard>

            <AdminCard className="space-y-3 p-6">
              <h3 className="font-black text-slate-900">Install on your phone</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                <li>Tap <b>Download APK</b> on the phone, or scan the QR code with the phone&apos;s camera.</li>
                <li>Open the downloaded file. If Android asks, allow your browser to <b>install unknown apps</b> (Settings → Apps → Special access).</li>
                <li>Tap <b>Install</b>. Newer builds install over older ones — no need to uninstall.</li>
              </ol>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" /> Without a connection the app shows a friendly offline screen and reconnects on its own.</div>
                <div className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" /> Test builds are for you only — nothing appears on the public site or Play Store.</div>
              </div>
            </AdminCard>

            {builds.length > 1 && (
              <AdminCard className="p-6">
                <h3 className="mb-3 font-black text-slate-900">Earlier builds</h3>
                <ul className="divide-y divide-slate-100">
                  {builds.slice(1).map((b) => (
                    <li key={b.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">Version {b.version} <span className="text-xs font-medium text-slate-500">({b.kind})</span></p>
                        <p className="text-xs text-slate-600">{when(b.createdAt)} · {size(b.sizeBytes)} · {b.commit}</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="gap-2 rounded-lg">
                        <a href={downloadHref(b)}><Download className="h-4 w-4" /> Download</a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </AdminCard>
            )}
          </>
        )}
      </div>
    </AdminBackground>
  );
}
