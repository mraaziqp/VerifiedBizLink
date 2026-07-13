'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vbl_pwa_install_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    setDismissed(false);

    if (isIOS()) {
      setShowIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="bg-yellow-500/10 backdrop-blur-xl border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Download className="h-4 w-4 text-yellow-500 shrink-0" />
        {showIosHint ? (
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Install this app: tap <Share className="h-3 w-3 inline mx-0.5" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        ) : (
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Install VerifiedBizLink for faster access and offline support.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {!showIosHint && (
          <button
            onClick={handleInstall}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-yellow-500/70 hover:text-yellow-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
