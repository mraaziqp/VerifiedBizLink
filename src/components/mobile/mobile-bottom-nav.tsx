"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Search, MessageSquare, User, Menu,
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      icon: <Home className="h-6 w-6" />,
      label: "Home",
      href: "/",
      active: pathname === "/" || pathname === "/dashboard",
    },
    {
      icon: <Search className="h-6 w-6" />,
      label: "Discover",
      href: "/discover",
      active: pathname === "/discover",
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      label: "Messages",
      href: "/messages",
      active: pathname === "/messages",
    },
    {
      icon: <User className="h-6 w-6" />,
      label: "Profile",
      href: "/profile",
      active: pathname === "/profile",
    },
    {
      icon: <Menu className="h-6 w-6" />,
      label: "More",
      href: "/menu",
      active: pathname === "/menu",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 border-t border-gray-200 bg-white">
      <nav className="flex justify-around items-center h-20">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              item.active
                ? "text-yellow-500"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
