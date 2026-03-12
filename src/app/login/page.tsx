
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAuth();

  const heroImage = PlaceHolderImages.find(img => img.id === 'auth-hero');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        router.push("/");
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Login Failed", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (type: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@vbl.com', password: 'Admin@123' },
      banker: { email: 'banker@vbl.com', password: 'Banker@123' },
      business: { email: 'sarah@nexgen.com', password: 'Pass@123' },
    };
    if (creds[type]) { setEmail(creds[type].email); setPassword(creds[type].password); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-gray-900 overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover opacity-60"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-gray-900/80 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary p-2 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-gray-900" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">VerifiedBizLink</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Where trusted businesses meet customers.
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            The world's first verified B2B networking platform powered by transparency.
          </p>
          <div className="mt-6 p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <p className="text-white/80 text-sm font-bold mb-3 uppercase tracking-wider">Demo Credentials</p>
            <div className="space-y-1.5 text-sm font-mono text-white/70">
              <p>🔧 Admin: admin@vbl.com / Admin@123</p>
              <p>🏦 Banker: banker@vbl.com / Banker@123</p>
              <p>🏢 Business: sarah@nexgen.com / Pass@123</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600 font-medium">Log in to manage your connections</p>
          </div>

          {/* Quick Demo Fill */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-xl" onClick={() => fillDemo('admin')}>
              Admin Login
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-xl" onClick={() => fillDemo('banker')}>
              Banker Login
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-xl" onClick={() => fillDemo('business')}>
              Business Login
            </Button>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="h-12 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-sm font-semibold text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl text-base shadow-lg shadow-primary/20"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 font-medium">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


