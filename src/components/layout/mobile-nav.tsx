"use client";

import { Home, Users, Compass, Building2, MoreHorizontal, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useMobileMenu } from "@/contexts/mobile-menu-context";
import { useMessagingStore } from "@/stores/messaging-store";

// Five fixed slots (4 links + More), each flex-1 with a short label, so the
// row fits a 320px screen without scrolling — horizontal scroll is what used
// to make this bar feel like it was "moving around". Everything else
// (Vetting, Settings, Admin, Sign Out) lives in the More drawer.
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpen } = useMobileMenu();
  const unread = useMessagingStore((s) => s.unread);

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
    ...(user ? [{ name: "Messages", href: "/dashboard/messages", icon: MessageSquare }] : []),
    thirdSlot,
  ];

  return (
    <nav
      data-mobile-nav
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
              <span className="relative">
                <item.icon className={cn("h-6 w-6 shrink-0", isActive && "text-primary")} />
                {item.name === "Messages" && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-900" aria-label={`${unread} unread`}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
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
