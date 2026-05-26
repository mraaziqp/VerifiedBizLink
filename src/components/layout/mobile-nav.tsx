"use client";

import { Home, Users, ShieldCheck, BarChart3, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Network", href: "/network", icon: Users },
  { name: "Vetting", href: "/vetting", icon: ShieldCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't show on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  const isAdmin = user && ["admin", "banker", "lawyer"].includes(user.role);
  const navItems = isAdmin
    ? [...navigation, { name: "Admin", href: "/admin", icon: Shield }]
    : navigation;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center h-16 px-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/admin"
              ? pathname.startsWith("/admin")
              : pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1 min-w-[72px]",
                isActive ? "text-primary" : "text-gray-400"
              )}
            >
              <item.icon className={cn("h-6 w-6 shrink-0", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-semibold leading-tight", isActive ? "text-primary" : "text-gray-400")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
