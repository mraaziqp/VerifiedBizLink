"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LogOut,
  Bell,
  Menu,
  X,
  User,
  MessageSquare,
  Users,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  connectionsCount: number;
  postsCount: number;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
    const [profileRes, postsRes, notifRes] = await Promise.allSettled([
      fetch("/api/users/profile"),
      fetch("/api/posts?limit=100"),
      fetch("/api/notifications"),
    ]);

    let connectionsCount = 0;
    let postsCount = 0;

    if (profileRes.status === "fulfilled" && profileRes.value.ok) {
      const data = await profileRes.value.json();
      connectionsCount = data.connectionsCount ?? 0;
    }
    if (postsRes.status === "fulfilled" && postsRes.value.ok) {
      const data = await postsRes.value.json();
      const posts = data.posts || [];
      postsCount = posts.filter((p: { user_id?: string }) => p.user_id === user?.id).length;
    }
    if (notifRes.status === "fulfilled" && notifRes.value.ok) {
      const data = await notifRes.value.json();
      setNotifications((data.notifications || []).slice(0, 5));
    }

    setStats({ connectionsCount, postsCount });
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      setLoading(false);
      fetchDashboardData();
    }
  }, [user, router, fetchDashboardData]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full opacity-25 blur-lg animate-pulse" />
              <div className="absolute inset-0 border-4 border-transparent border-t-yellow-400 rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800/50 sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-b from-black/80 to-black/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">D</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-400 text-xs">Welcome back, {user?.fullName?.split(' ')[0]}!</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/settings?tab=notifications" className="relative p-2.5 text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-all duration-300">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
              )}
            </Link>

            <div className="h-8 w-px bg-gray-700/50" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{user?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-600 shadow-lg">
                <span className="text-white font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-300"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white bg-gray-800/30 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800/50 bg-black/50 backdrop-blur px-4 py-4 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-white font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{user?.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} className="w-full" variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/profile">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="bg-white/20 p-3 rounded-lg w-fit group-hover:scale-110 transition-transform">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mt-4">Profile</h3>
              <p className="text-blue-100 text-sm mt-1">Edit your profile &amp; bio</p>
            </div>
          </Link>

          <Link href="/dashboard/posts">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="bg-white/20 p-3 rounded-lg w-fit group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mt-4">Posts</h3>
              <p className="text-purple-100 text-sm mt-1">Manage your content</p>
            </div>
          </Link>

          <Link href="/network">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="bg-white/20 p-3 rounded-lg w-fit group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mt-4">My Network</h3>
              <p className="text-emerald-100 text-sm mt-1">Connections &amp; requests</p>
            </div>
          </Link>

          <Link href="/explore">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="bg-white/20 p-3 rounded-lg w-fit group-hover:scale-110 transition-transform">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mt-4">Explore</h3>
              <p className="text-amber-100 text-sm mt-1">Find verified businesses</p>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Connections</p>
            <p className="text-4xl font-bold text-white mt-2">{stats?.connectionsCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Your Posts</p>
            <p className="text-4xl font-bold text-white mt-2">{stats?.postsCount ?? 0}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-400" />
            Recent Activity
          </h3>
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity yet — it&apos;ll show up here as you connect, post, and get noticed.</p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-center justify-between gap-3">
                  <p className="text-white text-sm">{n.message}</p>
                  <p className="text-gray-500 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
