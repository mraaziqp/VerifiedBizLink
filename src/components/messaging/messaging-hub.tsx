'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, MailWarning } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useChatSync } from '@/hooks/use-chat-sync';
import type { CannedResponse, InboxThread } from '@/lib/messaging';
import { useMessagingStore } from '@/stores/messaging-store';
import { getContactContext, listCannedResponses } from '@/app/actions/messaging-actions';
import { ChatInboxSidebar } from './chat-inbox-sidebar';
import { ActiveChatThread, NoThreadSelected } from './active-chat-thread';
import { B2BContextDrawer } from './b2b-context-drawer';
import type { CardKind } from './message-composer';
import { cn } from '@/lib/utils';

/**
 * /dashboard/messages — three panes on desktop (inbox · thread · details),
 * one at a time on phones. The open conversation lives in the URL
 * (?with=<userId>), so "Message this business" links, the notification
 * email, bookmarks and the phone's back button all land in the right place.
 */
export function MessagingHub() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const withParam = params.get('with');

  useChatSync(Boolean(user));
  const inbox = useMessagingStore((s) => s.inbox);
  const activeId = useMessagingStore((s) => s.activeId);
  const openThread = useMessagingStore((s) => s.openThread);
  const error = useMessagingStore((s) => s.error);
  const threadLength = useMessagingStore((s) => (s.activeId ? s.threads[s.activeId]?.length ?? 0 : 0));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [cardRequest, setCardRequest] = useState<CardKind | null>(null);
  const [placeholder, setPlaceholder] = useState<InboxThread | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Fill exactly the space between the header and the bottom tab bar, so the
  // composer is never hidden — whatever banners sit above (install prompt,
  // notices) and whatever the phone's browser chrome is doing.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const nav = document.querySelector<HTMLElement>('[data-mobile-nav]');
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      setHeight(Math.max(360, Math.floor(window.innerHeight - top - navH)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // The URL decides which conversation is open.
  useEffect(() => {
    if ((withParam ?? null) !== activeId) void openThread(withParam);
  }, [withParam, activeId, openThread]);

  // Drawer open by default on large screens only.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const apply = () => { setWide(mq.matches); setDrawerOpen(mq.matches); };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!user) return;
    void listCannedResponses().then((r) => { if (r.ok) setCanned(r.responses); });
  }, [user]);

  const thread = useMemo(() => inbox.find((t) => t.otherUserId === activeId) ?? null, [inbox, activeId]);

  // Someone you have never messaged (e.g. from a business profile): build
  // the header from their profile until the first message puts them in the inbox.
  useEffect(() => {
    if (!activeId || thread) { setPlaceholder(null); return; }
    let active = true;
    void getContactContext(activeId).then((r) => {
      if (!active || !r.ok) return;
      const c = r.context;
      setPlaceholder({
        otherUserId: c.userId, name: c.business?.companyName || c.name, avatarUrl: c.avatarUrl,
        headline: c.business ? c.name : c.headline, companyName: c.business?.companyName ?? null,
        businessId: c.business?.id ?? null, isVerified: c.business?.status === 'verified', online: c.online,
        lastMessage: '', lastMessageAt: null, lastFromMe: false, unread: 0, isPinned: false, isArchived: false,
        category: 'general', label: null, isConnection: c.isConnection,
      });
    });
    return () => { active = false; };
  }, [activeId, thread]);

  const open = useCallback((id: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set('with', id); else q.delete('with');
    router.push(`/dashboard/messages${q.toString() ? `?${q}` : ''}`, { scroll: false });
  }, [params, router]);

  const canSend = Boolean(user && (user.emailVerified || ['admin', 'banker', 'lawyer'].includes(user.role)));
  const shown = thread ?? placeholder;

  const drawer = activeId ? (
    <B2BContextDrawer
      otherId={activeId}
      onClose={() => setDrawerOpen(false)}
      onRequestCard={(k) => {
        if (wide) { setCardRequest(k); return; }
        // Let the sheet finish closing before the dialog opens, or Radix can
        // leave the page locked (pointer-events: none on <body>).
        setDrawerOpen(false);
        window.setTimeout(() => setCardRequest(k), 250);
      }}
      canned={canned}
      onCannedChange={setCanned}
      refreshKey={threadLength}
    />
  ) : null;

  return (
    <div
      ref={rootRef}
      style={height ? { height } : undefined}
      className="mx-auto flex h-[calc(100dvh-4rem-5rem)] max-w-[1600px] flex-col lg:h-[calc(100dvh-4rem)] lg:p-4"
    >
      {!canSend && user && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 lg:mb-3 lg:rounded-xl lg:border">
          <MailWarning className="h-4 w-4 shrink-0" /> Confirm your email address to send messages. You can still read everything here.
        </div>
      )}
      {error && (
        <div role="status" className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-600 lg:mb-3 lg:rounded-xl lg:border">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" /> {error}
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm">
        <div className={cn('min-h-0 w-full border-slate-200 lg:w-[340px] lg:shrink-0 lg:border-r', activeId ? 'hidden lg:block' : 'block')}>
          <ChatInboxSidebar onOpen={(id) => open(id)} />
        </div>

        <div className={cn('min-h-0 min-w-0 flex-1', activeId ? 'block' : 'hidden lg:block')}>
          {activeId ? (
            <ActiveChatThread
              thread={shown}
              otherId={activeId}
              canned={canned}
              canSend={canSend}
              drawerOpen={drawerOpen}
              onToggleDrawer={() => setDrawerOpen((o) => !o)}
              onBack={() => open(null)}
              cardRequest={cardRequest}
              onCardRequestHandled={() => setCardRequest(null)}
            />
          ) : (
            <NoThreadSelected />
          )}
        </div>

        {wide && drawerOpen && drawer && (
          <div className="min-h-0 w-[320px] shrink-0 border-l border-slate-200">{drawer}</div>
        )}
      </div>

      {!wide && (
        <Sheet open={drawerOpen && !!drawer} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-full max-w-sm p-0 sm:max-w-sm [&>button.absolute]:hidden">
            <SheetTitle className="sr-only">Contact details</SheetTitle>
            {drawer}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
