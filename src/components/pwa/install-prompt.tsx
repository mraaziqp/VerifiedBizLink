'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vbl_pwa_install_dismissed';
// Chrome only fires beforeinstallprompt once it decides engagement
// heuristics are met — it can simply never fire on a given visit. Don't
// wait forever for it before offering the manual fallback instead.
const NATIVE_PROMPT_TIMEOUT_MS = 4000;

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

function isSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua);
}

type Mode = 'native' | 'ios' | 'manual' | null;

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    setDismissed(false);

    if (isIOS()) {
      // Only Safari on iOS can actually add to home screen — Chrome/Firefox
      // on iOS use Safari's engine but can't trigger the share-sheet install.
      setMode(isSafari() ? 'ios' : 'manual');
      return;
    }

    let settled = false;
    const handler = (e: Event) => {
      e.preventDefault();
      settled = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('native');
    };
    window.addEventListener('beforeinstallprompt', handler);

    // beforeinstallprompt may never fire (engagement heuristics, or the
    // browser doesn't support it at all e.g. Firefox desktop) — fall back
    // to manual browser-menu instructions rather than showing nothing.
    const timer = setTimeout(() => {
      if (!settled) setMode('manual');
    }, NATIVE_PROMPT_TIMEOUT_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
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

  if (dismissed || !mode) return null;

  return (
    <div className="bg-yellow-500/10 backdrop-blur-xl border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Download className="h-4 w-4 text-yellow-500 shrink-0" />
        {mode === 'ios' && (
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Install this app: tap <Share className="h-3 w-3 inline mx-0.5" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        )}
        {mode === 'manual' && (
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Install this app: open your browser menu <Menu className="h-3 w-3 inline mx-0.5" /> and tap &quot;Install app&quot; or &quot;Add to Home Screen&quot;.
          </p>
        )}
        {mode === 'native' && (
          <p className="text-xs font-semibold text-yellow-200 truncate">
            Install VerifiedBizLink for faster access and offline support.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {mode === 'native' && (
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
