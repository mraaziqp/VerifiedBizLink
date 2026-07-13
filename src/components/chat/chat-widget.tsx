'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Mail, Search, Plus, Settings, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { compressImage, fetchWithTimeout } from '@/lib/image-compress';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  read: boolean;
}

interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_email?: string;
  participant_type: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'search'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Search users/businesses to start a new conversation with.
  useEffect(() => {
    if (activeTab !== 'search') return;
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const startChatWith = (u: any) => {
    setSelectedConversation({
      participant_id: u.id,
      participant_name: u.company_name || u.full_name || u.email,
      participant_email: u.email,
      participant_type: u.role === 'business' ? 'business' : (u.role || 'user'),
      last_message: '',
      last_message_time: '',
      unread_count: 0,
    });
    setMessages([]);
    setActiveTab('conversations');
    setSearchQuery('');
    setSearchResults([]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages/list', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load real conversations when the widget opens (and poll while open)
  useEffect(() => {
    if (!isOpen || !user) return;
    loadConversations();
    const interval = setInterval(() => {
      if (!selectedConversation) loadConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, user, selectedConversation]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages([]);
    try {
      const res = await fetch(`/api/messages/list?with=${conv.participant_id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };

  const sendPayload = async (content: string, imageUrl: string | null) => {
    if (!selectedConversation) return;

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: user?.id || '',
      receiver_id: selectedConversation.participant_id,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selectedConversation.participant_id, content, image_url: imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (content) setNewMessage(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (content) setNewMessage(content);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const content = newMessage.trim();
    setNewMessage('');
    await sendPayload(content, null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedConversation) return;

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
    } catch (error) {
      console.error('Error uploading chat image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-40 md:bottom-28 right-6 bg-yellow-400 text-slate-900 rounded-full p-4 shadow-lg hover:bg-yellow-500 transition-all duration-300 hover:scale-110 z-50"
        title="Open Chat"
      >
        <MessageCircle className="h-6 w-6" />
        {conversations.some(c => c.unread_count > 0) && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 md:bottom-28 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-slate-800 rounded-lg shadow-2xl z-50 flex flex-col max-h-[70vh] sm:max-h-96 border border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 rounded-t-lg flex items-center justify-between border-b border-slate-600">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-yellow-400" />
            Messages
          </h3>
          <p className="text-xs text-slate-400">Chat with businesses & clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700 rounded transition"
          >
            <Settings className="h-4 w-4 text-slate-300" />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setSelectedConversation(null);
            }}
            className="p-1 hover:bg-slate-700 rounded transition"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!selectedConversation ? (
            <>
              {/* Tabs */}
              <div className="flex border-b border-slate-700">
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === 'conversations'
                      ? 'border-b-2 border-yellow-400 text-yellow-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Conversations
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === 'search'
                      ? 'border-b-2 border-yellow-400 text-yellow-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="h-4 w-4 inline mr-1" />
                  Find
                </button>
              </div>

              {/* Conversations List */}
              {activeTab === 'conversations' && (
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-slate-400 text-sm">No conversations yet</p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        Start New Chat
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map(conv => (
                      <button
                        key={conv.participant_id}
                        onClick={() => handleSelectConversation(conv)}
                        className="w-full p-3 border-b border-slate-700 hover:bg-slate-700/50 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                            {conv.participant_type === 'business' ? '🏢' : '👤'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-white font-medium text-sm truncate">
                                {conv.participant_name}
                              </h4>
                              {conv.unread_count > 0 && (
                                <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {conv.last_message}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {conv.last_message_time ? new Date(conv.last_message_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Search / Start New Chat Tab */}
              {activeTab === 'search' && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="p-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search people or businesses…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-400 focus:border-yellow-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {searchQuery.trim().length < 2 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        Type a name, business or email to start a new conversation.
                      </p>
                    ) : searching ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">Searching…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">No matches found.</p>
                    ) : (
                      searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => startChatWith(u)}
                          className="flex w-full items-center gap-3 border-b border-slate-700 p-3 text-left transition hover:bg-slate-700/50"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-lg">
                            {u.role === 'business' ? '🏢' : '👤'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {u.company_name || u.full_name || u.email}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {u.full_name && u.company_name ? `${u.full_name} · ` : ''}{u.email}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 shrink-0 text-yellow-400" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Messages View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50">
                <div className="sticky top-0 bg-slate-800 pb-2 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ← Back
                  </button>
                  <div>
                    <h4 className="text-white font-medium text-sm">
                      {selectedConversation.participant_name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {selectedConversation.participant_type === 'business' ? '🏢 Business' : '👤 Customer'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedConversation.participant_email && (
                      <a
                        href={`mailto:${selectedConversation.participant_email}`}
                        className="p-1 hover:bg-slate-700 rounded transition"
                        title={`Email ${selectedConversation.participant_name}`}
                      >
                        <Mail className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                      </a>
                    )}
                  </div>
                </div>

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] ${
                        msg.sender_id === user?.id
                          ? 'bg-yellow-500 text-slate-950 rounded-l-xl rounded-tr-xl px-4 py-2 shadow-sm'
                          : 'bg-slate-800 text-slate-100 rounded-r-xl rounded-tl-xl px-4 py-2 border border-slate-700'
                      } ${msg.image_url ? '!p-1.5' : ''}`}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Shared photo"
                          className="rounded-lg max-w-full max-h-52 object-cover"
                        />
                      )}
                      {msg.content && (
                        <p className={`text-sm whitespace-pre-wrap ${msg.image_url ? 'px-1.5 pt-1.5' : ''}`}>{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 mb-2 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-700 flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploadingImage}
                  className="hidden"
                  aria-label="Send image"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded px-3 py-2 transition"
                  title="Send an image"
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-600 text-slate-900 disabled:text-slate-400 rounded px-4 py-2 transition font-medium"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
