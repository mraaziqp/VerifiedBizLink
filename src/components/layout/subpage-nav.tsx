"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Building2, Compass, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { useAuth } from "@/contexts/auth-context";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

interface SubpageNavProps {
  title?: string;
  backHref?: string;
}

export function SubpageNav({ title, backHref }: SubpageNavProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { setOpen } = useMobileMenu();

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
    <header className="safe-area-pt sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            aria-label="Go back"
            className="rounded-xl font-bold border-gray-200 hover:bg-gray-100 text-gray-900 gap-1.5 shadow-xs px-2.5 min-[380px]:px-3"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
            <span className="hidden min-[380px]:inline">Back</span>
          </Button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>

          <Link href="/" aria-label="VerifiedBizLink home" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <VBLLogo variant="icon" size="sm" iconSize={32} theme="dark" />
            <span className="font-extrabold text-base text-gray-900 tracking-tight hidden sm:inline-block">
              Verified<span className="text-amber-600 font-black">BizLink</span>
            </span>
          </Link>
        </div>

        {title && (
          <h1 className="min-w-0 flex-1 font-bold text-gray-900 text-sm sm:text-base truncate text-center">
            {title}
          </h1>
        )}

        {/* Home and Explore are in the bottom tab bar on phones, so they only
            appear here from sm up — at 320px the extra buttons pushed the
            header 30px past the screen edge. asChild: a link styled as a
            button, rather than a <button> nested inside an <a>. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 gap-1">
            <Link href="/" aria-label="Home">
              <Home className="h-4 w-4 text-gray-500" />
              <span className="hidden md:inline">Home</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 gap-1">
            <Link href="/explore" aria-label="Explore">
              <Compass className="h-4 w-4 text-gray-500" />
              <span className="hidden md:inline">Explore</span>
            </Link>
          </Button>

          {user && (
            <Button asChild size="sm" className="rounded-xl bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold text-xs gap-1 px-2.5 sm:px-3">
              <Link href="/business/dashboard" aria-label="Dashboard">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
