'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vbl_pwa_install_dismissed';
// How long to give a browser that's *known* to support beforeinstallprompt
// before assuming it isn't going to fire this visit (engagement heuristics
// can suppress it indefinitely). Kept short — this isn't a real signal of
// installability, just a courtesy wait before showing manual steps anyway.
const NATIVE_PROMPT_TIMEOUT_MS = 2500;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

type Platform = 'ios-safari' | 'ios-other' | 'chromium-android' | 'oem-android' | 'other';

// Chromium-based browsers (Chrome, Edge, Samsung Internet 12+, Brave, Opera
// on Android) reliably support beforeinstallprompt. OEM/forked browsers
// (Huawei Browser, MIUI Browser, UC Browser) and Firefox are inconsistent
// or don't support it at all — for those, skip waiting and go straight to
// manual instructions instead of gambling on an event that likely never
// fires.
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent;

  const isIOSDevice = /iphone|ipad|ipod/i.test(ua);
  if (isIOSDevice) {
    const isRealSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    return isRealSafari ? 'ios-safari' : 'ios-other';
  }

  const isAndroid = /android/i.test(ua);
  if (!isAndroid) return 'other';

  // OEM/forked browsers known to not reliably fire beforeinstallprompt.
  const isOemBrowser = /huaweibrowser|hmscore|honor|miuibrowser|ucbrowser|ucweb|opera mini|opr\/\d+.*mobile/i.test(ua);
  if (isOemBrowser) return 'oem-android';

  // Chrome, Edge (EdgA), Samsung Internet (SamsungBrowser), and Brave all
  // support the event.
  const isChromiumFamily = /chrome|crios|edga|samsungbrowser|brave/i.test(ua);
  if (isChromiumFamily) return 'chromium-android';

  // Firefox for Android and anything unrecognized — no reliable support.
  return 'oem-android';
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

    const platform = detectPlatform();

    if (platform === 'ios-safari') {
      setMode('ios');
      return;
    }
    if (platform === 'ios-other') {
      // Non-Safari iOS browsers can't add a real installable PWA at all —
      // they all run on Safari's engine but don't expose the share-sheet
      // install action. Tell people to switch rather than showing a dead end.
      setMode('manual');
      return;
    }
    if (platform === 'oem-android') {
      // Known unreliable/no support for beforeinstallprompt — don't wait.
      setMode('manual');
      return;
    }

    // platform === 'chromium-android' or desktop Chrome/Edge: genuinely
    // supports the event, worth a short wait.
    let settled = false;
    const handler = (e: Event) => {
      e.preventDefault();
      settled = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('native');
    };
    window.addEventListener('beforeinstallprompt', handler);

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
    <div className="bg-zinc-950 text-zinc-100 border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md relative z-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 shrink-0">
          <Download className="h-4 w-4" />
        </div>
        {mode === 'ios' && (
          <p className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
            Install this app: tap <Share className="h-3.5 w-3.5 inline mx-1 text-amber-400" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        )}
        {mode === 'manual' && (
          <p className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
            Install this app: open your browser menu <Menu className="h-3.5 w-3.5 inline mx-1 text-amber-400" /> and select &quot;Install app&quot; or &quot;Add to Home screen&quot;.
          </p>
        )}
        {mode === 'native' && (
          <p className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
            Install VerifiedBizLink for faster access and offline support.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {mode === 'native' && (
          <button
            onClick={handleInstall}
            className="text-xs font-bold bg-amber-400 text-zinc-950 hover:bg-amber-300 px-3 py-1 rounded-full transition-all shadow-sm active:scale-95"
          >
            Install App
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-800/80 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
