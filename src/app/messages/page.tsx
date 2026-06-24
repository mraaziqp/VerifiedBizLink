'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Send, Search, Plus, MoreVertical, Phone, Video, Info,
  MessageCircle, User, Loader2, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'notification';
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  participant_type: 'business' | 'customer';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  online: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      participant_id: 'biz-123',
      participant_name: 'Tech Solutions Inc',
      participant_email: 'contact@techsolutions.co.za',
      participant_type: 'business',
      last_message: 'Thanks for your interest! We can help you with that.',
      last_message_time: '2 hours ago',
      unread_count: 2,
      online: true
    },
    {
      id: '2',
      participant_id: 'cust-456',
      participant_name: 'John Smith',
      participant_email: 'john@email.com',
      participant_type: 'customer',
      last_message: 'When can you deliver?',
      last_message_time: '30 min ago',
      unread_count: 1,
      online: false
    },
    {
      id: '3',
      participant_id: 'biz-789',
      participant_name: 'Design Studio Pro',
      participant_email: 'hello@designstudio.co.za',
      participant_type: 'business',
      last_message: 'Let\'s schedule a meeting to discuss your project',
      last_message_time: '1 hour ago',
      unread_count: 0,
      online: true
    }
  ]);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages([
      {
        id: '1',
        sender_id: conv.participant_id,
        sender_name: conv.participant_name,
        content: conv.last_message,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true,
        type: 'text'
      },
      {
        id: '2',
        sender_id: user?.id || 'unknown',
        sender_name: user?.email || 'You',
        content: 'That sounds great! When can we start?',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        read: true,
        type: 'text'
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        sender_id: user?.id || 'unknown',
        sender_name: user?.email || 'You',
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text'
      };

      setMessages([...messages, message]);
      setNewMessage('');

      // Send to API
      // await fetch('/api/messages/send', { method: 'POST', body: JSON.stringify({...}) })
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
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
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>
            <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 gap-2">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 h-[calc(100vh-120px)]">
        <div className="flex gap-6 h-full">
          {/* Conversations List */}
          <div className="w-80 bg-slate-800 border border-slate-700 rounded-lg flex flex-col">
            {/* Search */}
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

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-sm">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 border-b border-slate-700 hover:bg-slate-700/50 transition text-left ${
                      selectedConversation?.id === conv.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-lg font-bold text-slate-900">
                          {conv.participant_name[0].toUpperCase()}
                        </div>
                        {conv.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-white font-medium text-sm truncate">
                            {conv.participant_name}
                          </h4>
                          {conv.unread_count > 0 && (
                            <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.last_message}</p>
                        <p className="text-xs text-slate-500 mt-1">{conv.last_message_time}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-lg font-bold text-slate-900">
                      {selectedConversation.participant_name[0].toUpperCase()}
                    </div>
                    {selectedConversation.online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{selectedConversation.participant_name}</h3>
                    <p className="text-xs text-slate-400">
                      {selectedConversation.online ? '🟢 Active now' : '⚫ Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-slate-700 rounded transition">
                    <Phone className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded transition">
                    <Video className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded transition">
                    <Info className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-yellow-400 text-slate-900'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === user?.id
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-700 flex gap-2">
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
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 disabled:bg-slate-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Select a conversation to start messaging</p>
                <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
