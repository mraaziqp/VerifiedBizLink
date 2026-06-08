"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
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
} from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-flex items-center justify-center w-12 h-12 border-4 border-gray-700 border-t-yellow-400 rounded-full mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-40 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Manage ads, settings, and subscription</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-medium text-sm">{user?.email}</p>
                <p className="text-yellow-400 text-xs font-semibold">
                  {subscription?.tier || "Free"} Plan
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 border-gray-700 hover:border-gray-600 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Active Ads",
              value: "3",
              trend: "+2",
              trendUp: true,
              icon: Zap,
              color: "from-yellow-500 to-yellow-600",
              subtext: "vs last month",
            },
            {
              label: "Impressions",
              value: "12.5K",
              trend: "+18%",
              trendUp: true,
              icon: Eye,
              color: "from-blue-500 to-blue-600",
              subtext: "this month",
            },
            {
              label: "Click-Through Rate",
              value: "3.2%",
              trend: "+0.5%",
              trendUp: true,
              icon: MousePointerClick,
              color: "from-green-500 to-green-600",
              subtext: "engagement rate",
            },
            {
              label: "Current Plan",
              value: subscription?.tier || "Free",
              trend: subscription?.tier === "Free" ? "Upgrade" : "Active",
              trendUp: subscription?.tier !== "Free",
              icon: Award,
              color: "from-purple-500 to-purple-600",
              subtext: subscription?.tier === "Free" ? "limited features" : "all features",
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;
            const trendColor = stat.trendUp ? "text-green-400" : "text-red-400";
            return (
              <Card
                key={idx}
                className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6 hover:from-gray-800/60 hover:to-gray-900/60 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 ${trendColor} text-sm font-semibold`}>
                    <TrendIcon className="h-4 w-4" />
                    <span>{stat.trend}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-2">{stat.subtext}</p>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/30 border border-gray-700/50 rounded-lg p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="ads"
              className="data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400"
            >
              Ads
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400"
            >
              Subscription
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main Performance Chart */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Performance Metrics</h3>
              <PerformanceAnalytics />
            </div>

            {/* Additional Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Engagement Card */}
              <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5 text-blue-400" />
                  Engagement Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Clicks</span>
                    <span className="text-white font-bold">4,012</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{ width: "75%" }} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                    <span>Last 30 days</span>
                    <span className="text-green-400">+12% vs prev</span>
                  </div>
                </div>
              </Card>

              {/* Reach Card */}
              <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-400" />
                  Reach & Visibility
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Unique Viewers</span>
                    <span className="text-white font-bold">8,234</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full" style={{ width: "62%" }} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                    <span>Active audience</span>
                    <span className="text-green-400">+8% this week</span>
                  </div>
                </div>
              </Card>

              {/* Status Card */}
              <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-400" />
                  Account Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Plan Status</span>
                    <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                      {subscription?.tier === "Free" ? "Free" : "Active"}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {subscription?.tier === "Free" ? (
                      <div>
                        <p className="mb-2">Upgrade your plan to unlock:</p>
                        <ul className="space-y-1 text-xs">
                          <li>✓ Unlimited ads</li>
                          <li>✓ Advanced analytics</li>
                          <li>✓ Priority support</li>
                        </ul>
                      </div>
                    ) : (
                      <p>You have full access to all features.</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Upgrade CTA */}
            {subscription?.tier === "Free" && (
              <div className="rounded-2xl bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 p-8 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Ready to go Premium?</h3>
                  <p className="text-gray-300">Unlock unlimited ads, advanced analytics, and priority support.</p>
                </div>
                <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-semibold px-6 py-2">
                  Upgrade Now - $50/mo
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Ads</h2>
                <p className="text-gray-400 text-sm mt-1">Create and manage your campaigns</p>
              </div>
              <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2">
                <Plus className="h-5 w-5" />
                Create Ad
              </Button>
            </div>

            <AdCreator />
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <SubscriptionManager subscription={subscription} onUpdate={fetchSubscription} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <UserAccountSettings user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
