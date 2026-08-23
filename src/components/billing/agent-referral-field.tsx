'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, BadgeCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

/**
 * "Did an advisor help you?" — shown wherever a business is about to pay.
 *
 * A marketer who signed somebody up in person often never gets credited,
 * because the business went home and paid on their own laptop days later.
 * This is the last point at which that can still be put right, so it belongs
 * next to the price rather than buried in settings.
 *
 * Once a business is credited the field turns into a read-only confirmation:
 * the first advisor keeps the sale, and the customer can see who it went to.
 */
export function AgentReferralField({ className = '' }: { className?: string }) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [agentName, setAgentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/businesses/referral', { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchStatus();
      if (!active) return;
      if (data?.attributed) setAgentName(data.agentName ?? 'your advisor');
      setLoading(false);
    })();
    return () => { active = false; };
  }, [fetchStatus]);

  const apply = async () => {
    if (!code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/businesses/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgentName(data.agentName);
        setCode('');
        toast({ title: 'Referral applied', description: data.message });
      } else {
        toast({ title: 'Could not apply that code', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not apply that code', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  if (agentName) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 ${className}`}>
        <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-900">
          This purchase is credited to <span className="font-bold">{agentName}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white/70 p-4 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <UserPlus className="h-4 w-4 text-amber-600" />
        Did an advisor help you?
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Enter their referral code so they get credited for helping you. Optional —
        it does not change what you pay.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
          placeholder="Referral code or advisor name"
          className="h-10 border-gray-200 bg-white text-gray-900"
        />
        <Button
          type="button"
          onClick={apply}
          disabled={saving || !code.trim()}
          className="h-10 shrink-0 gap-2 bg-yellow-500 font-bold text-slate-950 hover:bg-yellow-600"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Apply
        </Button>
      </div>
    </div>
  );
}
