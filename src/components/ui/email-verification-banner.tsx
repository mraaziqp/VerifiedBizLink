"use client";

import { useState } from "react";
import { Mail, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStaff = !!user && STAFF_ROLES.includes((user as { role?: string }).role ?? '');

  if (!user || isStaff || (user as { emailVerified?: boolean }).emailVerified || dismissed) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSent(false);
      setError(null);
    }
  };

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not send the email. Please try again in a few minutes.");
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="bg-yellow-500/10 backdrop-blur-xl border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Please verify your email address to secure your account.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenChange(true)}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
          >
            Didn&apos;t receive it?
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-yellow-500/70 hover:text-yellow-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-yellow-500" />
              Verify your email
            </DialogTitle>
            <DialogDescription>
              We sent a verification link to <span className="font-semibold text-foreground">{user.email}</span>.
              Click the link in that email to unlock posting, uploads, and messaging. Be sure to check your spam
              or junk folder — if it&apos;s still not there, request a new one below.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              A new verification email is on its way — check your inbox.
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error} If this keeps happening, contact support and we can verify your account directly.</span>
                </div>
              )}
              <Button
                onClick={handleResend}
                disabled={sending}
                className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-bold"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  "Resend Verification Email"
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
