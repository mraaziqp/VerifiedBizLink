"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { SidebarLeft } from "@/components/layout/sidebar-left";

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [aiResponse, setAiResponse] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.aiResponse);
        toast({
          title: "Message sent!",
          description: "We've received your query. Check your email for a response.",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setAiResponse(""), 5000);
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="hidden lg:block lg:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="lg:col-span-9 space-y-8 min-w-0">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Get in Touch</h1>
              <p className="text-gray-600">
                Have a question or feedback? Our AI-powered support team is here to help.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-bold text-gray-900">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      className="rounded-xl h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-bold text-gray-900">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your@email.com"
                      className="rounded-xl h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-900">Subject</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="What is this about?"
                    className="rounded-xl h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-900">Message</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Tell us more..."
                    className="rounded-xl min-h-[150px] resize-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl gap-2 w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>

              {aiResponse && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <p className="font-bold text-blue-900">Initial AI Response:</p>
                  <p className="text-blue-800 text-sm leading-relaxed">{aiResponse}</p>
                  <p className="text-xs text-blue-600 mt-2">
                    Our team will also review your message and send a personalized response to your email.
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="font-bold text-gray-900 mb-2">Fast Response</h3>
                <p className="text-sm text-gray-600">
                  AI-powered responses within minutes
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="font-bold text-gray-900 mb-2">Always Available</h3>
                <p className="text-sm text-gray-600">
                  24/7 support for your questions
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="font-bold text-gray-900 mb-2">Expert Team</h3>
                <p className="text-sm text-gray-600">
                  Escalated to humans when needed
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
