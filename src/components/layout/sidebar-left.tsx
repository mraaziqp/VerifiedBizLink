
"use client";

import { Home, Users, ShieldCheck, BarChart3, Settings, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "My Network", href: "/network", icon: Users },
  { name: "Vetting Hub", href: "/vetting", icon: ShieldCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function SidebarLeft() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VB';

  const isAdmin = user && ['admin', 'banker', 'lawyer'].includes(user.role);

  return (
    <div className="flex flex-col gap-6">
      {/* App Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="bg-primary rounded-lg p-2">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">VerifiedBizLink</span>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden shadow-sm">
        <div className="h-16 bg-gradient-to-r from-yellow-400 to-yellow-500" />
        <CardContent className="pt-0 -mt-8 text-center pb-6">
          {loading ? (
            <div className="space-y-3 mt-2">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
          ) : (
            <>
              <Avatar className="h-16 w-16 mx-auto border-4 border-white">
                <AvatarImage src={user?.avatarUrl || `https://picsum.photos/seed/${user?.id || 'guest'}/200/200`} alt={user?.fullName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <h3 className="font-semibold text-lg text-gray-900">{user?.fullName || 'Guest'}</h3>
                {user && <GoldCheckmark />}
              </div>
              <p className="text-sm text-gray-500 font-medium">{user?.headline || 'VerifiedBizLink Member'}</p>
              {user && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Role</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Status</p>
                    <p className="text-sm font-semibold text-primary">Active</p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              pathname === item.href
                ? "bg-primary/10 text-primary font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5",
              pathname === item.href ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
            )} />
            <span>{item.name}</span>
          </Link>
        ))}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mt-1",
              pathname.startsWith('/admin')
                ? "bg-gray-900 text-primary font-semibold"
                : "text-gray-600 hover:bg-gray-900 hover:text-primary"
            )}
          >
            <Shield className={cn(
              "h-5 w-5",
              pathname.startsWith('/admin') ? "text-primary" : "text-gray-400 group-hover:text-primary"
            )} />
            <span>Admin Hub</span>
          </Link>
        )}
      </nav>

      <div className="mt-auto">
        {user ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-500 hover:text-red-500 hover:bg-red-50 px-4 rounded-xl"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        ) : (
          <Link href="/login">
            <Button className="w-full bg-primary text-gray-900 font-bold rounded-xl">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
