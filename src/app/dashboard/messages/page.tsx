'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search, Send, MessageSquare, ShieldCheck, CheckCheck, Loader2,
  Users, ArrowLeft
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/** A row from GET /api/connections (snake_case, straight from SQL). */
interface ApiConnection {
  id: string;
  status: string;
  connected_user_id: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  company_name: string | null;
  business_status: string | null;
}

/** A row from GET /api/messages/list (conversation summaries). */
interface ApiConversation {
  participant_id: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

/** A row from GET /api/messages/list?with=<id>. */
interface ApiMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const toMessage = (m: ApiMessage): MessageItem => ({
  id: String(m.id),
  senderId: String(m.sender_id),
  receiverId: String(m.receiver_id),
  content: m.content ?? '',
  createdAt: m.created_at,
  read: m.read === true,
});

interface ConnectionUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  companyName?: string;
  isVerified?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  online?: boolean;
}

interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

/**
 * Enterprise Split-Pane Messaging & Connections Hub
 * Left Pane: Scrollable, searchable list of active connections
 * Right Pane: Active thread with high-contrast, responsive chat layout
 */
function DashboardMessagesContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialWith = searchParams.get('with');

  const [connectionsList, setConnectionsList] = useState<ConnectionUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ConnectionUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch connections
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Accepted connections only — a pending request is not someone you
        // can message yet. Conversation summaries fill in the last message
        // and unread count. (This page used to read camelCase fields the API
        // never sends, so every contact showed as "Member" and was keyed by
        // the connection's id instead of the person's.)
        const [res, convRes] = await Promise.all([
          fetch('/api/connections?status=accepted'),
          fetch('/api/messages/list', { cache: 'no-store' }),
        ]);
        if (res.ok) {
          const data = await res.json();
          const convData = convRes.ok ? await convRes.json().catch(() => ({})) : {};
          const convs = new Map<string, ApiConversation>(
            ((convData.conversations ?? []) as ApiConversation[]).map((c) => [String(c.participant_id), c]),
          );
          const items: ConnectionUser[] = ((data.connections ?? []) as ApiConnection[]).map((c) => {
            const conv = convs.get(String(c.connected_user_id));
            return {
              id: String(c.connected_user_id),
              fullName: c.full_name || 'Member',
              email: '',
              avatarUrl: c.avatar_url ?? undefined,
              role: c.headline || 'Member',
              companyName: c.company_name ?? undefined,
              isVerified: c.business_status === 'verified',
              lastMessage: conv?.last_message || 'Connected on VerifiedBizLink',
              lastMessageTime: conv?.last_message_time || '',
              unreadCount: Number(conv?.unread_count ?? 0),
              online: false,
            };
          })
            // Most recent conversation first, then everyone else.
            .sort((a, b) => (b.lastMessageTime || '').localeCompare(a.lastMessageTime || ''));

          if (active) {
            setConnectionsList(items);
            if (initialWith) {
              const matched = items.find((x) => x.id === initialWith);
              if (matched) setSelectedUser(matched);
            } else if (items.length > 0) {
              // Functional update: keep whoever is already open, without
              // making this load depend on (and re-run for) the selection.
              setSelectedUser((current) => current ?? items[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        if (active) setLoadingConnections(false);
      }
    })();
    return () => { active = false; };
  }, [initialWith]);

  // Fetch messages when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;
    let active = true;
    setLoadingMessages(true);

    (async () => {
      try {
        const res = await fetch(`/api/messages/list?with=${encodeURIComponent(selectedUser.id)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setMessages(((data.messages ?? []) as ApiMessage[]).map(toMessage));
            // Opening the thread marks it read server-side.
            setConnectionsList((prev) => prev.map((c) => (c.id === selectedUser.id ? { ...c, unreadCount: 0 } : c)));
          }
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
      } finally {
        if (active) setLoadingMessages(false);
      }
    })();

    return () => { active = false; };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    const optimisticMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      senderId: user?.id || 'me',
      receiverId: selectedUser.id,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selectedUser.id, content }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? toMessage(data.message) : m)));
        setConnectionsList((prev) => prev.map((c) => (
          c.id === selectedUser.id ? { ...c, lastMessage: content, lastMessageTime: new Date().toISOString() } : c
        )));
      } else {
        // Undo the optimistic bubble and say why, instead of leaving a
        // message on screen that was never delivered.
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInputText(content);
        toast({ title: 'Message not sent', description: data.error || 'Please try again.', variant: 'destructive' });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(content);
      toast({ title: 'Message not sent', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredConnections = connectionsList.filter((c) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] max-w-7xl mx-auto p-2 sm:p-4">
      {/* Outer Shell */}
      <div className="flex-1 flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        
        {/* LEFT PANE: Searchable & Scrollable Active Connections */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/70',
            selectedUser ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Left Header */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-800" /> Messages
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {connectionsList.length} Connected
              </span>
            </div>

            {/* Connection Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active connections..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Connections List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {loadingConnections ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-700" />
                <p className="text-xs">Loading network connections...</p>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No connections found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connect with verified businesses or members in Explore to start messaging.
                </p>
                <Link href="/explore">
                  <Button variant="outline" size="sm" className="mt-3 text-xs font-bold">
                    Explore Directory
                  </Button>
                </Link>
              </div>
            ) : (
              filteredConnections.map((c) => {
                const isSelected = selectedUser?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedUser(c)}
                    className={cn(
                      'w-full p-3.5 flex items-start gap-3 text-left transition-colors',
                      isSelected
                        ? 'bg-white border-l-4 border-slate-900 shadow-2xs'
                        : 'hover:bg-slate-100/80'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 border border-slate-200">
                        <AvatarImage src={c.avatarUrl} alt={c.fullName} />
                        <AvatarFallback className="bg-slate-200 text-slate-800 font-bold text-sm">
                          {c.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {c.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1">
                          {c.fullName}
                          {c.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.companyName || c.role}
                      </p>
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {c.lastMessage}
                      </p>
                    </div>

                    {c.unreadCount ? (
                      <span className="shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Active Chat Thread */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-white',
            selectedUser ? 'flex' : 'hidden md:flex'
          )}
        >
          {selectedUser ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden h-11 w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-95 text-slate-700 transition-all shrink-0 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.fullName} />
                    <AvatarFallback className="bg-slate-100 text-slate-900 font-bold">
                      {selectedUser.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                      {selectedUser.fullName}
                      {selectedUser.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedUser.companyName ? `${selectedUser.companyName} · ` : ''}{selectedUser.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/network`}>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-600 font-bold">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-900 mr-2" />
                    <span className="text-xs">Decrypting conversations...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-3">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No direct messages yet</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Send a message to introduce yourself or inquire about professional services.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id || m.senderId === 'me';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'flex flex-col',
                          isMe ? 'items-end' : 'items-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs',
                            isMe
                              ? 'bg-slate-900 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && <CheckCheck className="h-3 w-3 text-slate-400" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2"
              >
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${selectedUser.fullName}...`}
                  className="flex-1 h-11 border-slate-200 bg-slate-50 focus:bg-white text-sm"
                />
                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-11 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Users className="h-14 w-14 text-slate-200 mb-3" />
              <h3 className="text-base font-bold text-slate-700">Select a conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose an active connection from the left panel to review past conversations or launch a new inquiry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <DashboardMessagesContent />
    </Suspense>
  );
}
