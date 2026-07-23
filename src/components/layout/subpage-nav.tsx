"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Building2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { useAuth } from "@/contexts/auth-context";

interface SubpageNavProps {
  title?: string;
  backHref?: string;
}

export function SubpageNav({ title, backHref }: SubpageNavProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="rounded-xl font-bold border-gray-200 hover:bg-gray-100 text-gray-900 gap-1.5 shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
            <span>Back</span>
          </Button>

          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <VBLLogo variant="icon" size="sm" iconSize={32} theme="dark" />
            <span className="font-extrabold text-base text-gray-900 tracking-tight hidden sm:inline-block">
              Verified<span className="text-yellow-500">BizLink</span>
            </span>
          </Link>
        </div>

        {title && (
          <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs text-center">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 gap-1">
              <Home className="h-4 w-4 text-gray-500" />
              <span className="hidden md:inline">Home</span>
            </Button>
          </Link>

          <Link href="/explore">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 gap-1">
              <Compass className="h-4 w-4 text-gray-500" />
              <span className="hidden md:inline">Explore</span>
            </Button>
          </Link>

          {user && (
            <Link href="/business/dashboard">
              <Button size="sm" className="rounded-xl bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold text-xs gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
