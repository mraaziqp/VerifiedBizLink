'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import {
  ArrowLeft, Send, Search, Plus, MessageCircle, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';
import { compressImage, fetchWithTimeout } from '@/lib/image-compress';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  read: boolean;
  created_at: string;
}

interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_avatar: string | null;
  participant_type: string;
  business_id?: string | null;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/list', { cache: 'no-store' });
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
      const res = await fetch(`/api/messages/list?with=${participantId}`, { cache: 'no-store' });
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
            business_id: other.businessId || null,
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

  const sendPayload = async (content: string, imageUrl: string | null) => {
    if (!selectedId) return;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selectedId, content, image_url: imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        fetchConversations();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Message not sent', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Message not sent', description: 'Could not reach the server.', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    const content = newMessage.trim();
    setSending(true);
    try {
      setNewMessage('');
      await sendPayload(content, null);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedId) return;

    setUploadingImage(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('bucket', 'messages');

      const res = await fetchWithTimeout('/api/media/upload', { method: 'POST', body: formData }, 45000);
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      await sendPayload('', data.url);
    } catch {
      toast({ title: 'Could not send image', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selected = conversations.find((c) => c.participant_id === selectedId) || null;
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <GlassBackground>
      {/* Header */}
      <div className="safe-area-pt bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className={`p-2 hover:bg-gray-100 rounded-lg ${glassInteractive}`}>
                  <ArrowLeft className="h-5 w-5 text-gray-900" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-yellow-500" />
                  Messages
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {unreadTotal > 0 ? `${unreadTotal} unread message${unreadTotal !== 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>
            <Link href="/explore">
              <Button className={`gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}>
                <Plus className="h-4 w-4" />
                Find a Business
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 sm:px-6 lg:px-8 h-[calc(100dvh-88px)] sm:h-[calc(100dvh-120px)]">
        <div className="flex gap-6 h-full">
          {/* Conversations List */}
          <div className={`w-full md:w-80 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-lg flex-col shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 pl-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 ${glassInteractive}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 text-yellow-500 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.participant_id}
                    onClick={() => openThread(conv.participant_id)}
                    className={`w-full p-4 border-b border-gray-200 hover:bg-gray-100 text-left ${glassInteractive} ${
                      selectedId === conv.participant_id ? 'bg-gray-200' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.participant_avatar || undefined} alt={conv.participant_name} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-400 text-slate-950 font-bold">
                          {initials(conv.participant_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-gray-900 font-medium text-sm truncate">{conv.participant_name}</h4>
                          {conv.unread_count > 0 && (
                            <span className="bg-yellow-500 text-slate-950 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{conv.last_message || 'Start the conversation'}</p>
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
            <div className="flex-1 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-lg flex flex-col min-w-0">
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className={`md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-900 rounded ${glassInteractive}`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selected.participant_avatar || undefined} alt={selected.participant_name} />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-400 text-slate-950 font-bold">
                    {initials(selected.participant_name)}
                  </AvatarFallback>
                </Avatar>
                {selected.business_id ? (
                  <Link href={`/business/${selected.business_id}`} className="text-gray-900 font-semibold hover:text-yellow-600 hover:underline">
                    {selected.participant_name}
                  </Link>
                ) : (
                  <h3 className="text-gray-900 font-semibold">{selected.participant_name}</h3>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingThread ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 text-yellow-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                    No messages yet — say hello!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-lg shadow-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950'
                          : 'bg-gray-100 border border-gray-200 backdrop-blur-sm text-gray-900'
                      } ${msg.image_url ? '!p-1.5' : ''}`}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Shared photo" className="rounded-md max-w-full max-h-60 object-cover" />
                        )}
                        {msg.content && (
                          <p className={`text-sm whitespace-pre-wrap break-words ${msg.image_url ? 'px-1.5 pt-1.5' : ''}`}>{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${msg.image_url ? 'px-1.5' : ''} ${msg.sender_id === user?.id ? 'text-slate-800' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-200 flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploadingImage}
                  className="hidden"
                  aria-label="Send image"
                />
                <Button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  variant="outline"
                  className={`border-gray-200 text-gray-600 hover:bg-gray-100 ${glassInteractive}`}
                  title="Send an image"
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
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
                  className={`flex-1 bg-gray-100 border border-gray-200 rounded px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 ${glassInteractive}`}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold disabled:opacity-50 ${glassInteractive}`}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-lg items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Select a conversation to start messaging</p>
                <Link href="/explore">
                  <Button className={`bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Find a Business to Message
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassBackground>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}
