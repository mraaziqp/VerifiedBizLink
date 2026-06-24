"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  LogOut,
  Bell,
  Eye,
  MousePointerClick,
  Award,
  Menu,
  X,
  User,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import AdCreator from "@/components/dashboard/ad-creator";
import UserAccountSettings from "@/components/dashboard/account-settings";
import SubscriptionManager from "@/components/dashboard/subscription-manager";
import PerformanceAnalytics from "@/components/dashboard/performance-analytics";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchSubscription();
    }
  }, [user, router]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/user/tier`);
      const data = await res.json();
      setSubscription(data);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

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

  const stats = [
    {
      label: "Active Ads",
      value: "3",
      trend: "+2",
      trendUp: true,
      icon: Zap,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "from-yellow-500/10 to-yellow-600/10",
      subtext: "vs last month",
    },
    {
      label: "Impressions",
      value: "12.5K",
      trend: "+18%",
      trendUp: true,
      icon: Eye,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-500/10 to-blue-600/10",
      subtext: "this month",
    },
    {
      label: "Click-Through Rate",
      value: "3.2%",
      trend: "+0.5%",
      trendUp: true,
      icon: MousePointerClick,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-500/10 to-green-600/10",
      subtext: "engagement rate",
    },
    {
      label: "Current Plan",
      value: subscription?.tier || "Free",
      trend: subscription?.tier === "Free" ? "Upgrade" : "Active",
      trendUp: subscription?.tier !== "Free",
      icon: Award,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-500/10 to-purple-600/10",
      subtext: subscription?.tier === "Free" ? "limited features" : "all features",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {/* Premium Header */}
      <div className="border-b border-gray-800/50 sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-b from-black/80 to-black/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">D</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-400 text-xs">Welcome back!</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <button className="relative p-2.5 text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-all duration-300 hover:scale-110 group">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                No new notifications
              </div>
            </button>

            <div className="h-8 w-px bg-gray-700/50" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{user?.email}</p>
                <p className="text-yellow-400 text-xs font-bold tracking-wider">
                  {subscription?.tier || "Free"} Plan
                </p>
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
          <div className="md:hidden border-t border-gray-800/50 bg-black/50 backdrop-blur px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-white font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{user?.email}</p>
                <p className="text-yellow-400 text-xs font-bold">{subscription?.tier || "Free"} Plan</p>
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
              <div className="flex items-start justify-between">
                <div className="bg-white/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <User className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mt-4">Profile</h3>
              <p className="text-blue-100 text-sm mt-1">Edit your profile & bio</p>
            </div>
          </Link>

          <Link href="/dashboard/posts">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="flex items-start justify-between">
                <div className="bg-white/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mt-4">Posts</h3>
              <p className="text-purple-100 text-sm mt-1">Manage your content</p>
            </div>
          </Link>

          <Link href="/business/ads">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="flex items-start justify-between">
                <div className="bg-white/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Megaphone className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mt-4">Ads Manager</h3>
              <p className="text-red-100 text-sm mt-1">Manage your ads</p>
            </div>
          </Link>

          <Link href="/dashboard/profile">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
              <div className="flex items-start justify-between">
                <div className="bg-white/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Settings className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mt-4">Settings</h3>
              <p className="text-green-100 text-sm mt-1">Account & Privacy</p>
            </div>
          </Link>
        </div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;
            const trendColor = stat.trendUp ? "text-emerald-400" : "text-red-400";

            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6 hover:border-gray-600/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/10 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Animated Glow */}
                <div className="absolute -inset-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur" />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 ${trendColor} text-sm font-bold`}>
                      <TrendIcon className="h-4 w-4" />
                      <span>{stat.trend}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-4xl font-bold text-white mt-2 group-hover:scale-110 transition-transform duration-300 origin-left">
                      {stat.value}
                    </p>
                  </div>

                  <p className="text-gray-500 text-xs">{stat.subtext}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs Section */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 p-6 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-1 mb-8 shadow-lg">
              {[
                { value: "overview", label: "Overview", icon: "📊" },
                { value: "ads", label: "Ads", icon: "📢" },
                { value: "subscription", label: "Subscription", icon: "💳" },
                { value: "settings", label: "Settings", icon: "⚙️" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border data-[state=active]:border-yellow-400/50 rounded-lg transition-all duration-300 hover:bg-gray-700/30 text-sm font-semibold"
                >
                  <span className="mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500">
              <div className="rounded-xl bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  Performance Metrics
                </h3>
                <PerformanceAnalytics />
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Engagement Summary",
                    icon: MousePointerClick,
                    color: "from-blue-500 to-blue-600",
                    items: [
                      { label: "Total Clicks", value: "4,012" },
                      { label: "Last 30 days", value: "+12% vs prev" },
                    ],
                  },
                  {
                    title: "Reach & Visibility",
                    icon: Eye,
                    color: "from-purple-500 to-purple-600",
                    items: [
                      { label: "Unique Viewers", value: "8,234" },
                      { label: "Active audience", value: "+8% this week" },
                    ],
                  },
                  {
                    title: "Revenue Impact",
                    icon: TrendingUp,
                    color: "from-emerald-500 to-emerald-600",
                    items: [
                      { label: "Est. Revenue", value: "$2,450" },
                      { label: "Growth rate", value: "+24% this month" },
                    ],
                  },
                ].map((metric, idx) => {
                  const MetricIcon = metric.icon;
                  return (
                    <div
                      key={idx}
                      className="group rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6 hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <MetricIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-4">{metric.title}</h4>
                      <div className="space-y-3">
                        {metric.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <span className="text-white font-bold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Ads Tab */}
            <TabsContent value="ads" className="animate-in fade-in duration-500">
              <div className="rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6 shadow-lg">
                <AdCreator />
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="animate-in fade-in duration-500">
              <div className="rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6 shadow-lg">
                <SubscriptionManager subscription={subscription} onUpdate={fetchSubscription} />
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="animate-in fade-in duration-500">
              <div className="rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6 shadow-lg">
                <UserAccountSettings user={user} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
