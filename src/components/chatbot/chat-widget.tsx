"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User, ChevronDown, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
  timestamp: Date;
}

// Quick reply chips shown before the user's first message
const QUICK_REPLIES = [
  { label: "Check my status 🎫", text: "Where am I in the verification process?" },
  { label: "Get verified 🏅", text: "How do I get my business verified?" },
  { label: "Leave a review ⭐", text: "How do I leave a review for a business?" },
  { label: "Upload docs 📄", text: "How do I upload my verification documents?" },
  { label: "Privacy & POPI 🔒", text: "How does VerifiedBizLink protect my data under POPI?" },
  { label: "Talk to a human 📞", text: "I'd like to speak to a real person" },
  { label: "Pricing 💰", text: "What does VerifiedBizLink cost?" },
];

const GREETING: Message = {
  id: 0,
  role: "bot",
  text: "Hi! 👋 I'm the **VBL Assistant** — your guide to VerifiedBizLink.\n\nI can help with verification, privacy rights, account management, and more.\n\nTap a quick question below or type anything!",
  timestamp: new Date(),
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function BotMessage({ text }: { text: string }) {
  const renderText = (t: string) => {
    return t.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            const lm = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (lm) {
              return (
                <a key={j} href={lm[2]} className="text-primary font-bold hover:underline">
                  {lm[1]}
                </a>
              );
            }
            return part;
          })}
          {i < t.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return <div className="text-sm leading-relaxed text-gray-800">{renderText(text)}</div>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), role: "user", text, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    if (!textOverride) setInput("");
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      const botResponse = data.message || 'Sorry, I encountered an error. Please try again.';
      const botMsg: Message = { id: Date.now() + 1, role: "bot", text: botResponse, timestamp: new Date() };
      setMessages((m) => [...m, botMsg]);
      if (!open) setUnread((u) => u + 1);
    } catch (error) {
      const errorMsg = 'Sorry, I\'m having trouble connecting. Please check your internet or try again later.';
      const botMsg: Message = { id: Date.now() + 1, role: "bot", text: errorMsg, timestamp: new Date() };
      setMessages((m) => [...m, botMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([GREETING]);
    setInput("");
  };

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 md:bottom-8 right-6 z-50 w-14 h-14 bg-gray-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Open chat assistant"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6" />
            {unread > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-gray-900 text-xs font-extrabold rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </div>
            )}
          </div>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-44 md:bottom-28 right-6 z-50 w-[22rem] sm:w-[26rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ height: "560px", maxHeight: "80vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-gray-900" />
              </div>
              <div>
                <p className="font-bold text-sm">VBL Assistant</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-xs text-gray-300">Online · instant replies</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {userMessageCount > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 self-end ${
                    msg.role === "bot" ? "bg-gray-900" : "bg-primary"
                  }`}
                >
                  {msg.role === "bot" ? (
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-gray-900" />
                  )}
                </div>
                <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl ${
                      msg.role === "bot"
                        ? "bg-white border border-gray-100 shadow-sm rounded-tl-sm"
                        : "bg-gray-900 text-white rounded-tr-sm"
                    }`}
                  >
                    {msg.role === "bot" ? (
                      <BotMessage text={msg.text} />
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — shown until first user message */}
          {userMessageCount === 0 && !isTyping && (
            <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-100 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.text}
                    onClick={() => sendMessage(qr.text)}
                    className="text-xs bg-white border border-gray-200 hover:border-primary hover:bg-primary/5 text-gray-700 font-medium px-2.5 py-1.5 rounded-full transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="rounded-xl h-10 text-sm flex-1 border-gray-200 focus-visible:ring-primary"
            />
            <Button
              size="sm"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="h-10 w-10 p-0 bg-gray-900 text-white hover:bg-gray-800 rounded-xl flex-shrink-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
