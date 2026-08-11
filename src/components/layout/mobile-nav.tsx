"use client";

import { Home, Users, Compass, Building2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

// Capped at 4 fixed slots (3 links + More) on purpose: at 5+ items the row
// no longer fits an iPhone SE-width screen and falls back to horizontal
// scroll, which is what made the bar feel like it was "moving around" —
// everything else (Vetting, Settings, Admin, Sign Out) lives in the More
// drawer instead of competing for space here.
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpen } = useMobileMenu();

  // Don't show on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  const isAdmin = user && ["admin", "banker", "lawyer"].includes(user.role);
  const canManageBusiness = user && (user.role === "business" || isAdmin);

  const thirdSlot = canManageBusiness
    ? { name: "Business", href: "/business/dashboard", icon: Building2 }
    : { name: "Network", href: "/network", icon: Users };

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    thirdSlot,
  ];

  return (
    <nav
      className="safe-area-px fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 lg:hidden [transform:translateZ(0)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // Explicit -webkit- prefix: iOS Safari still needs it for backdrop
        // blur, and without it the bar renders opaque white over content.
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors flex-1",
                isActive ? "text-primary" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-6 w-6 shrink-0", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-semibold leading-tight", isActive ? "text-primary" : "text-gray-500")}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors flex-1 text-gray-500 hover:text-gray-900"
        >
          <MoreHorizontal className="h-6 w-6 shrink-0" />
          <span className="text-[10px] font-semibold leading-tight text-gray-500">More</span>
        </button>
      </div>
    </nav>
  );
}
