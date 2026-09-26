'use client';

import { useEffect } from 'react';
import { messagingChannel, useMessagingStore } from '@/stores/messaging-store';

/**
 * Keeps the messaging store fresh for every component that shows messages.
 *
 * Serverless hosting has no long-lived socket, so this polls — but once for
 * the whole page however many components mount it (widget + hub share one
 * timer), quickly while the tab is visible and slowly when it is hidden, and
 * immediately when the tab regains focus or another tab broadcasts a change.
 */

const VISIBLE_MS = 5000;
const HIDDEN_MS = 30000;

let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let stopListeners: (() => void) | null = null;

function schedule() {
  if (timer) clearTimeout(timer);
  const delay = typeof document !== 'undefined' && document.visibilityState === 'hidden' ? HIDDEN_MS : VISIBLE_MS;
  timer = setTimeout(async () => {
    await useMessagingStore.getState().sync({ quiet: true });
    if (subscribers > 0) schedule();
  }, delay);
}

function start() {
  void useMessagingStore.getState().sync({ quiet: true });
  schedule();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void useMessagingStore.getState().sync({ quiet: true });
    schedule();
  };
  const onMessage = () => void useMessagingStore.getState().sync({ quiet: true });
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  messagingChannel?.addEventListener('message', onMessage);
  stopListeners = () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    messagingChannel?.removeEventListener('message', onMessage);
  };
}

function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  stopListeners?.();
  stopListeners = null;
}

/** Mount wherever messages are shown. `enabled` false for signed-out views. */
export function useChatSync(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    subscribers += 1;
    if (subscribers === 1) start();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [enabled]);
}
