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
  Zap,
  LogOut,
  Bell,
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
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Ads", value: "3", icon: Zap, color: "from-yellow-500 to-yellow-600" },
            { label: "This Month", value: "1.2K", icon: TrendingUp, color: "from-green-500 to-green-600" },
            { label: "Impressions", value: "12.5K", icon: BarChart3, color: "from-blue-500 to-blue-600" },
            { label: "Plan", value: subscription?.tier || "Free", icon: CreditCard, color: "from-purple-500 to-purple-600" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Chart */}
              <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Performance This Month</h3>
                <PerformanceAnalytics />
              </div>

              {/* Upgrade Card */}
              {subscription?.tier === "Free" && (
                <div className="rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Upgrade to Premium</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Get unlimited ads, advanced analytics, and priority support.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300 mb-4">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        Unlimited ads
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        Advanced analytics
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        Priority support
                      </li>
                    </ul>
                  </div>
                  <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-semibold">
                    Upgrade Now - $50/mo
                  </Button>
                </div>
              )}
            </div>
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
