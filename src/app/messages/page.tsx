'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import {
  ArrowLeft, Send, Search, Plus, MessageCircle, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_avatar: string | null;
  participant_type: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

function MessagesPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/list');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const openThread = useCallback(async (participantId: string) => {
    setSelectedId(participantId);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/messages/list?with=${participantId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      toast({ title: 'Could not load conversation', variant: 'destructive' });
    } finally {
      setLoadingThread(false);
    }
  }, [toast]);

  // Deep link: /messages?with=<userId> opens (or starts) a conversation
  // directly — used by the "Message" button on a business profile.
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || !user || withId === selectedId) return;

    const existing = conversations.find((c) => c.participant_id === withId);
    if (existing) {
      openThread(withId);
      return;
    }
    if (loadingConversations) return; // wait for the list before deciding it's new

    (async () => {
      try {
        const res = await fetch(`/api/users/${withId}`);
        if (!res.ok) {
          toast({ title: 'User not found', variant: 'destructive' });
          return;
        }
        const { user: other } = await res.json();
        setConversations((prev) => [
          {
            participant_id: other.id,
            participant_name: other.fullName || 'Unknown',
            participant_avatar: other.avatarUrl || null,
            participant_type: other.role,
            last_message: '',
            last_message_time: new Date().toISOString(),
            unread_count: 0,
          },
          ...prev,
        ]);
        openThread(other.id);
      } catch {
        toast({ title: 'Could not start conversation', variant: 'destructive' });
      }
    })();
  }, [searchParams, user, conversations, loadingConversations, selectedId, openThread, toast]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    const content = newMessage.trim();
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selectedId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage('');
        fetchConversations();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Message not sent', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Message not sent', description: 'Could not reach the server.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selected = conversations.find((c) => c.participant_id === selectedId) || null;
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-yellow-400" />
                  Messages
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  {unreadTotal > 0 ? `${unreadTotal} unread message${unreadTotal !== 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>
            <Link href="/explore">
              <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 gap-2">
                <Plus className="h-4 w-4" />
                Find a Business
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 h-[calc(100vh-120px)]">
        <div className="flex gap-6 h-full">
          {/* Conversations List */}
          <div className="w-80 bg-slate-800 border border-slate-700 rounded-lg flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 pl-10 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 text-yellow-400 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-sm">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.participant_id}
                    onClick={() => openThread(conv.participant_id)}
                    className={`w-full p-4 border-b border-slate-700 hover:bg-slate-700/50 transition text-left ${
                      selectedId === conv.participant_id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.participant_avatar || undefined} alt={conv.participant_name} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 font-bold">
                          {initials(conv.participant_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-white font-medium text-sm truncate">{conv.participant_name}</h4>
                          {conv.unread_count > 0 && (
                            <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.last_message || 'Start the conversation'}</p>
                        {conv.last_message && (
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selected ? (
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex flex-col min-w-0">
              <div className="p-4 border-b border-slate-700 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selected.participant_avatar || undefined} alt={selected.participant_name} />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 font-bold">
                    {initials(selected.participant_name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-white font-semibold">{selected.participant_name}</h3>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingThread ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 text-yellow-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                    No messages yet — say hello!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-white'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-slate-700' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-700 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 disabled:bg-slate-600"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Select a conversation to start messaging</p>
                <Link href="/explore">
                  <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Find a Business to Message
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}
