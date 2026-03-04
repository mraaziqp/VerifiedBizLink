
"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LoginPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'auth-hero');

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side: Visuals */}
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
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600 font-medium">Log in to manage your connections</p>
          </div>

          <form className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="name@company.com" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-sm font-semibold text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" className="h-12 rounded-xl" />
              </div>
            </div>

            <Button className="w-full h-12 bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl text-base shadow-lg shadow-primary/20">
              Sign In
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-bold tracking-wider">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-11 rounded-xl border-gray-200 font-semibold">
                Google
              </Button>
              <Button variant="outline" className="h-11 rounded-xl border-gray-200 font-semibold">
                LinkedIn
              </Button>
            </div>
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
