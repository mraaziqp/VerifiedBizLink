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

// ─── Knowledge Base ────────────────────────────────────────────────────────────
const FAQ: Array<{ patterns: string[]; response: string }> = [
  {
    patterns: ["hi", "hello", "hey", "howzit", "greetings", "good morning", "good afternoon", "sup", "yo"],
    response: "Hey there! 👋 Great to see you on **VerifiedBizLink**.\n\nI can help you with:\n• Business verification & documents\n• Privacy & POPI Act rights\n• Account management & settings\n• Connections & networking\n• Ads & platform features\n\nType your question or tap a quick reply below!",
  },
  {
    patterns: ["verify", "verification", "vetting", "gold badge", "get verified", "trust badge", "checkmark", "verified"],
    response: "To get your business **Gold Verification badge**, go to the **Vetting Hub** in the navigation.\n\nYou'll need to upload 5 documents:\n• CIPC Registration Certificate\n• VAT Compliance Letter\n• Identity Proof of Directors\n• Proof of Bank Account\n• Proof Business Exists (letterhead/lease/utility bill)\n\nVerification typically takes **3–7 business days**. Once verified, your trust score increases significantly.\n\nNeed help? Contact info@verifiedbizlink.co.za",
  },
  {
    patterns: ["upload", "document", "docs", "file", "cipc", "vat", "id proof", "bank letter", "letterhead"],
    response: "To upload verification documents:\n1. Go to the **Vetting** page from the sidebar\n2. Check each required document\n3. Click **'Mark Uploaded'** for each\n4. Once all 5 are uploaded, click **'Submit for Vetting'**\n\nAll documents are encrypted and only visible to our compliance team.",
  },
  {
    patterns: ["privacy", "popi", "popia", "personal information", "gdpr", "data protection", "collect", "what data"],
    response: "VerifiedBizLink is fully **POPI Act compliant** (Protection of Personal Information Act).\n\nWe collect:\n• Your name & email\n• Contact details & address\n• Business name & registration number\n\nWe **never** sell your data. Passwords are encrypted and never stored in plain text.\n\nManage your data in **Settings → Data & Privacy**.\nRead our full [Privacy Policy](/privacy).",
  },
  {
    patterns: ["delete account", "close account", "remove account", "deletion", "delete my data"],
    response: "To delete your account:\n1. Go to **Settings → Data & Privacy**\n2. Scroll to *Delete Account*\n3. Type **DELETE** to confirm\n4. Submit your deletion request\n\nYour data will be permanently deleted within **30–90 days**. You have **7 days** to cancel the request.",
  },
  {
    patterns: ["password", "change password", "reset password", "forgot password", "update password"],
    response: "To **change your password**:\n1. Go to **Settings → Security**\n2. Enter your current password\n3. Enter your new password (min. 8 characters)\n4. Click 'Update Password'\n\nForgot your password? Email info@verifiedbizlink.co.za — we respond within 24 hours.",
  },
  {
    patterns: ["ad", "ads", "advertise", "boost", "advertising", "promote", "campaign", "banner"],
    response: "**Advertising on VerifiedBizLink:**\n\nFree Customer accounts may see ads from verified businesses. Ads are dismissible — click **X** and they return after 5 minutes.\n\n**For businesses:** Advertise to thousands of verified professionals. Boost your ad for premium placement or extend duration from **Settings**.\n\nContact sales@verifiedbizlink.co.za for advertising packages.",
  },
  {
    patterns: ["contact", "support", "help", "reach", "email", "phone", "speak to"],
    response: "Get in touch with us:\n\n📧 **Support:** info@verifiedbizlink.co.za\n🔒 **Privacy/POPI:** privacy@verifiedbizlink.co.za\n⚖️ **Legal:** legal@verifiedbizlink.co.za\n💼 **Sales:** sales@verifiedbizlink.co.za\n\n🕐 Hours: Mon–Fri, **08:00–17:00 SAST**\n⚡ Response: within **24 hours**\n\nOr use our [Contact Page](/contact) to submit a ticket.",
  },
  {
    patterns: ["signup", "register", "create account", "join", "new account", "sign up", "getting started"],
    response: "Getting started is easy!\n\n1. Visit [Sign Up](/signup)\n2. Choose your account type (Customer, Business, or Shareholder)\n3. Fill in your details & accept Terms\n4. Complete the **Onboarding Wizard**\n5. You're live! Businesses can start verification immediately.\n\nAlready have an account? [Login here](/login).",
  },
  {
    patterns: ["network", "connect", "connection", "find business", "discover", "search people"],
    response: "VerifiedBizLink is South Africa's verified B2B professional network.\n\n**Network tab** lets you:\n• View all connections\n• Accept or decline incoming requests\n• Remove connections\n\nThe **right sidebar** on your feed shows business recommendations. Click **Connect** to send a request.\n\nOnly **Gold Verified** businesses appear in top recommendations.",
  },
  {
    patterns: ["trust score", "vetting score", "score", "how scored"],
    response: "Your **Trust Score (0–100)** reflects the authenticity of your business verification.\n\nIt's calculated based on:\n• Document quality & completeness\n• CIPC registration status\n• VAT compliance\n• Director ID verification\n• Business existence proof\n\nHigher score = higher placement in search results. Verified businesses typically score **85+**.",
  },
  {
    patterns: ["review", "rating", "star rating", "leave a review", "customer review", "rate a business"],
    response: "Customers can **rate and review** any verified business on VerifiedBizLink!\n\n⭐ **How to leave a review:**\n1. Visit a business profile\n2. Click **Write a Review**\n3. Select your star rating (1–5)\n4. Add a title and detailed comments\n5. Submit — done!\n\n**Rating scale:**\n• ⭐⭐⭐⭐⭐ Excellent\n• ⭐⭐⭐⭐ Very Good\n• ⭐⭐⭐ Good\n• ⭐⭐ Fair\n• ⭐ Poor\n\nReviews are public and help other users make informed decisions. You can mark reviews as 'Helpful' to boost useful feedback.",
  },
  {
    patterns: ["terms", "conditions", "agreement", "rules", "terms of service"],
    response: "Our Terms & Conditions set the platform rules.\n\nKey points:\n• Must be **18+** to register\n• All business documents must be **genuine** — forgery leads to banning\n• One account per person/business per role\n• Businesses agree to CIPC verification checks\n\nRead the full [Terms & Conditions](/terms).",
  },
  {
    patterns: ["breach", "hacked", "data breach", "security incident", "compromised", "security"],
    response: "**If you suspect a security issue:**\n1. **Change your password immediately** in Settings → Security\n2. Email **privacy@verifiedbizlink.co.za** with details\n3. We respond within **2 hours** for security incidents\n\nIn a confirmed data breach, we notify **all affected users within 72 hours** as required by the POPI Act.",
  },
  {
    patterns: ["post", "posting", "create post", "share update", "publish", "write post", "feed"],
    response: "To **create a post**:\n1. Go to your **Home feed** (main page)\n2. Click the post creator at the top\n3. Write your update — insights, news, announcements\n4. Click **Post**\n\nVerified business posts get a **Verified badge** next to your name for increased credibility.",
  },
  {
    patterns: ["plan", "pricing", "cost", "free", "premium", "price", "subscription", "membership", "paid"],
    response: "**VerifiedBizLink is free to join!**\n\n🆓 **Customer (Free)**\n• Connect with verified businesses\n• View the network feed\n• Ads may appear\n\n🏢 **Business (Free)**\n• Business profile & verification\n• Gold Trust Badge\n• No ads shown\n\n📢 **Advertising** — paid packages available.\nEmail sales@verifiedbizlink.co.za for pricing.",
  },
  {
    patterns: ["thanks", "thank you", "thank", "cheers", "great", "awesome", "perfect", "bye", "goodbye", "cool"],
    response: "You're welcome! 😊 Happy to help anytime.\n\nHave a great day and welcome to **VerifiedBizLink** — South Africa's trusted B2B network! 🇿🇦",
  },
];

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

function findResponse(query: string): string {
  const q = query.toLowerCase().trim();
  let bestScore = 0;
  let bestResponse = "";
  for (const entry of FAQ) {
    let score = 0;
    for (const p of entry.patterns) {
      if (q.includes(p)) score += p.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestResponse = entry.response;
    }
  }
  if (bestScore > 0) return bestResponse;
  return "I'm not sure I can answer that specifically.\n\nHere's how you can get help:\n• Visit our [Contact Page](/contact) to submit a support ticket\n• Email **info@verifiedbizlink.co.za**\n• Response within **24 hours** on business days\n\nTry rephrasing — I know about verification, privacy, accounts, networking, ads, and more!";
}

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
