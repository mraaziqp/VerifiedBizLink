"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { VBLLogo } from "@/components/ui/vbl-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        toast({
          title: "Could not send reset link",
          description: data.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Could not connect to server", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <VBLLogo variant="full" size="md" theme="dark" />
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Check your email</h2>
            <p className="text-gray-500">
              If an account exists for <span className="font-semibold text-gray-700">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-yellow-600 hover:text-yellow-700 hover:underline pt-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Forgot your password?</h2>
              <p className="mt-2 text-gray-500">Enter your email and we'll send you a link to reset it.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-xl text-base shadow-lg shadow-yellow-400/30 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Send Reset Link
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
