"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Users,
  ShieldCheck,
  BarChart3,
  Settings
} from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Network", icon: Users, href: "/network" },
  { label: "Vetting", icon: ShieldCheck, href: "/vetting" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-primary/20 shadow-lg md:hidden z-40">
      <div className="flex justify-around items-stretch">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1.5 transition-all duration-200 relative group ${
                isActive
                  ? "text-primary"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <div className={`relative p-1.5 rounded-lg transition-all duration-200 ${isActive ? "bg-primary/20" : "group-hover:bg-primary/10"}`}>
                <Icon size={22} className={isActive ? "scale-110" : "group-hover:scale-105"} style={{transition: "transform 0.2s"}} />
              </div>
              <span className={`text-xs font-semibold tracking-tight transition-all duration-200 ${
                isActive ? "text-primary opacity-100" : "opacity-70 group-hover:opacity-100"
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
