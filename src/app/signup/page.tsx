
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [role, setRole] = useState<"customer" | "business">("customer");
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
            Build your professional reputation.
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Join the network of thousands of vetted companies and secure your business future.
          </p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
            <p className="mt-2 text-gray-600 font-medium">Join the circle of trust today</p>
          </div>

          <div className="flex flex-col gap-6">
            <Tabs 
              defaultValue="customer" 
              className="w-full" 
              onValueChange={(v) => setRole(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 h-14 rounded-2xl">
                <TabsTrigger value="customer" className="rounded-xl font-bold flex gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="business" className="rounded-xl font-bold flex gap-2">
                  <Building2 className="h-4 w-4" />
                  Business
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" className="h-12 rounded-xl" />
                </div>
              </div>

              {role === "business" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" placeholder="Acme Corp" className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-number">Company Registration Number</Label>
                    <Input id="reg-number" placeholder="2024/123456/07" className="h-12 rounded-xl" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="name@company.com" className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Minimum 8 characters" className="h-12 rounded-xl" />
              </div>

              <div className="pt-2">
                <Button className="w-full h-12 bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl text-base shadow-lg shadow-primary/20">
                  Create Account
                </Button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-gray-600 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
