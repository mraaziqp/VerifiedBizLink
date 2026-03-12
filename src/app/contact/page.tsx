"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ArrowLeft, Mail, Phone, Clock, MessageSquare,
  Send, CheckCircle2, Loader2, AlertCircle, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    category: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.subject || !form.message) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSubmitted(true);
        toast({
          title: "Message Sent",
          description: "We'll respond within 24 hours on business days.",
        });
      } else {
        const data = await res.json();
        toast({ title: "Failed to send", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not send your message.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-gray-600 hover:text-gray-900 rounded-xl">
          <Link href="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900">VerifiedBizLink</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center space-y-3 mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900">Contact Us</h1>
          <p className="text-gray-500 font-medium text-lg max-w-xl mx-auto">
            We're here to help. Send us a message and we'll respond within 24 hours on business days.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info cards */}
          <div className="space-y-4">
            {[
              {
                icon: Mail,
                title: "Email Us",
                value: "support@verifiedbizlink.co.za",
                sub: "Response within 24 hours",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: Clock,
                title: "Business Hours",
                value: "Mon–Fri: 08:00–17:00",
                sub: "SAST (South African Time)",
                color: "text-green-600 bg-green-50",
              },
              {
                icon: MessageSquare,
                title: "Live Chat",
                value: "Available via chatbot",
                sub: "24/7 for basic queries",
                color: "text-purple-600 bg-purple-50",
              },
              {
                icon: Globe,
                title: "Data Privacy",
                value: "privacy@verifiedbizlink.co.za",
                sub: "POPI Act enquiries",
                color: "text-yellow-600 bg-yellow-50",
              },
            ].map((item, i) => (
              <Card key={i} className="shadow-sm border-none">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-sm text-gray-700 font-medium">{item.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 24-hour SLA notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-yellow-800 text-sm">24-Hour Response Policy</p>
                <p className="text-xs text-yellow-700 mt-1">
                  All support tickets receive an initial response within 24 business hours. Complex or legal matters may require additional time but will be acknowledged immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-white rounded-2xl shadow-sm border-none p-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">Message Sent!</h3>
                <p className="text-gray-500 font-medium">
                  Thanks for reaching out. Our team will review your query and respond within 24 hours on business days.
                </p>
                <p className="text-sm text-gray-400">
                  A confirmation has been sent to{" "}
                  <span className="font-bold text-gray-700">{form.email}</span>.
                </p>
                <Button
                  onClick={() => { setSubmitted(false); setForm(f => ({ ...f, category: "", subject: "", message: "" })); }}
                  variant="outline"
                  className="rounded-xl font-bold mt-2"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
                <h3 className="text-xl font-extrabold text-gray-900">Send a Message</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Your Name</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="name@company.com"
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    required
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select a topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verification">Business Verification</SelectItem>
                      <SelectItem value="account">Account & Login</SelectItem>
                      <SelectItem value="billing">Billing & Payments</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="privacy">Privacy & Data (POPI Act)</SelectItem>
                      <SelectItem value="deletion">Account Deletion</SelectItem>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="report">Report Abuse / Fraud</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    required
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief summary of your query"
                    className="rounded-xl h-11"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail..."
                    className="rounded-xl min-h-[140px] resize-none"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-400 text-right">{form.message.length}/2000</p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !form.category}
                  className="w-full h-12 bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl gap-2 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  By submitting this form, you agree to our{" "}
                  <Link href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</Link>.
                  Your message will be triaged and responded to within 24 hours.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* FAQ section */}
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: "How long does business verification take?",
                a: "Standard verification takes 3–7 business days after all required documents are uploaded. Complex cases involving legal review may take up to 14 days.",
              },
              {
                q: "What documents do I need for verification?",
                a: "CIPC Registration Certificate, VAT Compliance Letter, Identity Proof of Directors, Proof of Bank Account, and Proof Business Exists (letterhead, lease, or utility bill).",
              },
              {
                q: "How do I comply with the POPI Act on this platform?",
                a: "We collect minimal data and only what is legally required. Read our Privacy Policy for full details. You can access, edit, or delete your data from Settings.",
              },
              {
                q: "How do I cancel my account deletion request?",
                a: "Go to Settings → Data & Privacy. You can cancel a deletion request within 7 days of submitting it.",
              },
              {
                q: "How do ads work on VerifiedBizLink?",
                a: "Free (Customer) accounts may see ads from verified businesses. Ads are dismissible and return after 5 minutes. Business, admin, and shareholder roles never see ads.",
              },
              {
                q: "How do I report a fraudulent business?",
                a: "Use the 'Report Abuse / Fraud' category in this contact form, or use the report button on any business profile. Our compliance team investigates all reports within 48 hours.",
              },
            ].map((item, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border shadow-sm">
                <p className="font-bold text-gray-900 text-sm">{item.q}</p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
