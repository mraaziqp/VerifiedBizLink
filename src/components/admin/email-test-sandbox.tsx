'use client';

import { useState } from 'react';
import {
  Mail, Send, CheckCircle2, Loader2, AlertCircle, Sparkles,
  KeyRound, UserPlus, Receipt, ShieldAlert, Clock, UserCheck, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminCard } from '@/components/admin/ui';

interface EmailTypeOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const EMAIL_TYPES: EmailTypeOption[] = [
  {
    id: 'verification',
    title: 'Signup Verification',
    description: 'Dispatches the one-time email verification token link',
    icon: Mail,
    color: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'welcome',
    title: 'Welcome & Onboarding',
    description: 'Post-verification welcome email with onboarding checklist',
    icon: Sparkles,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'password_reset',
    title: 'Password Reset',
    description: 'Secure 15-minute password reset link with SHA-256 token',
    icon: KeyRound,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'agent_invite',
    title: 'Sales Marketer Invite',
    description: 'Marketer activation email with referral link & commission %',
    icon: UserPlus,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'invoice',
    title: 'Invoice / Payment Receipt',
    description: 'Official PayFast invoice confirmation and breakdown',
    icon: Receipt,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'payment_failed',
    title: 'Payment Failed Warning',
    description: 'Grace period warning and payment retry deadline',
    icon: ShieldAlert,
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'abandoned_signup',
    title: 'Abandoned Signup Nudge',
    description: 'Automated 48-hour recovery nudge for incomplete signups',
    icon: Clock,
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'username_recovery',
    title: 'Username Recovery',
    description: 'List of registered account usernames sent to owner',
    icon: UserCheck,
    color: 'from-indigo-500 to-violet-500',
  },
];

export function EmailTestSandbox({ defaultEmail }: { defaultEmail?: string }) {
  const [targetEmail, setTargetEmail] = useState(defaultEmail || 'info@verifiedbizlink.co.za');
  const [sendingType, setSendingType] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ type: string; recipient: string; time: string } | null>(null);
  const { toast } = useToast();

  const handleSendTest = async (type: string) => {
    if (!targetEmail.trim()) {
      toast({ title: 'Enter a recipient email', variant: 'destructive' });
      return;
    }

    setSendingType(type);
    try {
      const res = await fetch('/api/admin/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetEmail: targetEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: `✅ Test Email Sent (${type})`,
          description: `Dispatched successfully to ${data.recipient}`,
        });
        setLastResult({
          type,
          recipient: data.recipient,
          time: new Date().toLocaleTimeString(),
        });
      } else {
        toast({
          title: 'Delivery Failed',
          description: data.error || data.detail || 'Could not send test email',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Failed to contact test email server',
        variant: 'destructive',
      });
    } finally {
      setSendingType(null);
    }
  };

  return (
    <AdminCard className="mb-8 border-amber-300/50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-400" />
                Live Email Dispatcher &amp; Verification Sandbox
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Trigger and verify live outgoing emails through GoDaddy SMTP (Port 465 SSL) for all system flows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleSendTest('all')}
              disabled={!!sendingType}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold gap-2 px-4 rounded-xl shadow-md transition-all active:scale-95"
              size="sm"
            >
              {sendingType === 'all' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending All 8 Tests…
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4 text-slate-950" />
                  Test All 8 Flows
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Recipient Input & Presets */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Send Test Emails To:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="e.g. your@email.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white placeholder-slate-500 focus-visible:ring-amber-400 rounded-xl"
            />
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTargetEmail('info@verifiedbizlink.co.za')}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
              >
                info@verifiedbizlink.co.za
              </Button>
              {defaultEmail && defaultEmail !== 'info@verifiedbizlink.co.za' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTargetEmail(defaultEmail)}
                  className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
                >
                  My Email
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 8 Flow Test Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EMAIL_TYPES.map((et) => {
            const Icon = et.icon;
            const isSending = sendingType === et.id;
            return (
              <div
                key={et.id}
                className="bg-slate-850 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-400/50 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${et.color} flex items-center justify-center shadow-xs shrink-0`}>
                      <Icon className="h-4 w-4 text-slate-950" />
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {et.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {et.description}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSendTest(et.id)}
                  disabled={!!sendingType}
                  className="w-full bg-slate-700 hover:bg-amber-400 hover:text-slate-950 text-white font-bold text-xs rounded-xl gap-1.5 transition-colors"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dispatching…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Live Dispatched Status Banner */}
        {lastResult && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 px-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Last dispatched <strong>{lastResult.type}</strong> email to <u>{lastResult.recipient}</u> at {lastResult.time}
            </span>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
