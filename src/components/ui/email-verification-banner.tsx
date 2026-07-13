"use client";

import { useState } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isStaff = !!user && STAFF_ROLES.includes((user as { role?: string }).role ?? '');

  if (!user || isStaff || (user as { emailVerified?: boolean }).emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 backdrop-blur-xl border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 text-yellow-500 shrink-0" />
        <p className="text-xs font-semibold text-yellow-200 truncate">
          {sent
            ? "Verification email sent — check your inbox."
            : "Please verify your email address to secure your account."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!sent && (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {sending && <Loader2 className="h-3 w-3 animate-spin" />}
            {sending ? "Sending…" : "Resend"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500/70 hover:text-yellow-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
