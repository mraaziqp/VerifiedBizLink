'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { VBLLogo } from '@/components/ui/vbl-logo';

/**
 * Where a newly hired marketer lands from their invite link. They set a
 * password; the role and referral code come from the invite record on the
 * server, never from anything this page sends.
 */
export default function AgentInvitePage() {
  const params = useParams();
  const { toast } = useToast();
  const token = String(params?.token || '');

  const [invite, setInvite] = useState<{ fullName: string; email: string; referralCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/agent-invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok) setInvite(data);
        else setError(data.error || 'This invite link is not valid.');
      } catch {
        if (active) setError('Could not check this invite. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/agent-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Welcome aboard', description: `Your referral code is ${data.referralCode}.` });
        // Full navigation so the new session cookie is picked up everywhere.
        window.location.href = '/agent';
      } else {
        toast({ title: 'Could not complete sign up', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not complete sign up', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <VBLLogo variant="full" size="md" theme="dark" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking your invite…
            </div>
          ) : error ? (
            <div className="text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900">Invite not usable</h1>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <Button asChild variant="outline" className="mt-5 border-gray-300">
                <a href="/login">Go to sign in</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-green-600" />
                <h1 className="text-2xl font-extrabold text-gray-900">
                  Welcome, {invite?.fullName?.split(' ')[0]}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Set a password to activate your Sales Agent account.
                </p>
              </div>

              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Your referral code
                </p>
                <p className="font-mono text-2xl font-bold tracking-widest text-amber-900">
                  {invite?.referralCode}
                </p>
              </div>

              <form onSubmit={accept} className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input value={invite?.email ?? ''} readOnly className="mt-1 border-gray-200 bg-gray-50 text-gray-600" />
                </div>
                <div>
                  <Label htmlFor="pw" className="text-sm font-semibold text-gray-700">Choose a password</Label>
                  <Input
                    id="pw" type="password" required minLength={8} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 border-gray-200 bg-white"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <Label htmlFor="pw2" className="text-sm font-semibold text-gray-700">Confirm password</Label>
                  <Input
                    id="pw2" type="password" required value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-1 border-gray-200 bg-white"
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Activate my account
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
