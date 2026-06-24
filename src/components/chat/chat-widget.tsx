'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Phone, Mail, Search, Plus, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'notification' | 'system';
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_type: 'business' | 'customer';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  avatar?: string;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'search'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      participant_id: 'biz-123',
      participant_name: 'Tech Solutions Inc',
      participant_type: 'business',
      last_message: 'Thanks for your interest! We can help you with that.',
      last_message_time: '2 hours ago',
      unread_count: 2,
      avatar: '🏢'
    },
    {
      id: '2',
      participant_id: 'cust-456',
      participant_name: 'John Smith',
      participant_type: 'customer',
      last_message: 'When can you deliver?',
      last_message_time: '30 min ago',
      unread_count: 1,
      avatar: '👤'
    }
  ]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        sender_id: user?.id || 'unknown',
        sender_name: user?.email || 'You',
        receiver_id: selectedConversation.participant_id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text'
      };

      setMessages([...messages, message]);
      setNewMessage('');

      // Update last message in conversation
      setConversations(
        conversations.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                last_message: newMessage,
                last_message_time: 'just now'
              }
            : conv
        )
      );

      // In production, send to API
      // await fetch('/api/messages/send', { method: 'POST', body: JSON.stringify(message) })
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    // Load messages for this conversation
    setMessages([
      {
        id: '1',
        sender_id: conv.participant_id,
        sender_name: conv.participant_name,
        receiver_id: user?.id || 'unknown',
        content: conv.last_message,
        timestamp: conv.last_message_time,
        read: true,
        type: 'text'
      }
    ]);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-yellow-400 text-slate-900 rounded-full p-4 shadow-lg hover:bg-yellow-500 transition-all duration-300 hover:scale-110 z-50"
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
    <div className="fixed bottom-6 right-6 w-96 bg-slate-800 rounded-lg shadow-2xl z-50 flex flex-col max-h-96 border border-slate-700">
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
                      <button className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1 mx-auto">
                        <Plus className="h-4 w-4" />
                        Start New Chat
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className="w-full p-3 border-b border-slate-700 hover:bg-slate-700/50 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                            {conv.avatar}
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
                            <p className="text-xs text-slate-500 mt-1">{conv.last_message_time}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Search Tab */}
              {activeTab === 'search' && (
                <div className="flex-1 p-4">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                  />
                  <div className="mt-4">
                    <h4 className="text-white font-medium text-sm mb-3">Or start a new conversation:</h4>
                    <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-medium py-2 rounded transition flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      Message a Business
                    </button>
                    <button className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition flex items-center justify-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Support
                    </button>
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
                    <button className="p-1 hover:bg-slate-700 rounded transition">
                      <Phone className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                    </button>
                    <button className="p-1 hover:bg-slate-700 rounded transition">
                      <Mail className="h-4 w-4 text-slate-400 hover:text-yellow-400" />
                    </button>
                  </div>
                </div>

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
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
                <div ref={messagesEndRef} />
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
