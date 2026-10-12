'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Everything in the root layout that is not part of the page someone came to
 * read: the ad slot, the messages bubble, the assistant, the slide-out menu
 * and the "confirm your email" banner.
 *
 * As ordinary imports their code — and the dialog library several of them
 * share — was downloaded, parsed and hydrated before any page became
 * interactive, on every page, including the ones a signed-out visitor sees.
 * On a mid-range phone that is the difference between a tap landing and a
 * tap being ignored.
 *
 * They now load in their own chunks once the browser is idle, or at the
 * first touch or key press, whichever comes first — so the menu is there by
 * the time a finger reaches it. The floating ones are position: fixed and
 * move nothing when they arrive. The menu's open state lives in its context,
 * so a tap that beats the download still opens it the moment it mounts.
 */
const AdBanner = dynamic(() => import('@/components/ads/ad-banner').then((m) => m.AdBanner), { ssr: false });
const MessagesWidget = dynamic(() => import('@/components/chat/chat-widget'), { ssr: false });
const ChatWidget = dynamic(() => import('@/components/chatbot/chat-widget').then((m) => m.ChatWidget), { ssr: false });
const MobileMenuDrawer = dynamic(() => import('@/components/layout/mobile-menu-drawer').then((m) => m.MobileMenuDrawer), { ssr: false });
const EmailVerificationBanner = dynamic(
  () => import('@/components/ui/email-verification-banner').then((m) => m.EmailVerificationBanner),
  { ssr: false },
);

/** False until the browser is idle or the person first interacts. */
function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => setReady(true);
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));

    // requestIdleCallback where it exists; Safari has only recently gained
    // it, so a short timer stands in — long enough for the page to settle.
    let cancel: () => void;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(go, { timeout: 2500 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const timer = window.setTimeout(go, 1200);
      cancel = () => window.clearTimeout(timer);
    }

    return () => {
      cancel();
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);

  return ready;
}

/** Above the page: the email-confirmation banner, for the accounts that need it. */
export function DeferredTopBanners() {
  return useAfterFirstPaint() ? <EmailVerificationBanner /> : null;
}

/** Over the page: menu drawer, ad slot, messages bubble and assistant. */
export function DeferredWidgets() {
  if (!useAfterFirstPaint()) return null;
  return (
    <>
      <MobileMenuDrawer />
      <AdBanner />
      <MessagesWidget />
      <ChatWidget />
    </>
  );
}
