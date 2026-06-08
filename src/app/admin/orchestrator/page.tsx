"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Building2, DollarSign, Activity, Settings, LogOut, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TierManagement from "@/components/admin/tier-management";
import UserSubscriptionManager from "@/components/admin/user-subscription-manager";
import PaymentGatewayConfig from "@/components/admin/payment-gateway-config";

export default function OrchestratorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Mock data - in production, fetch from API
  const revenueData = [
    { month: "Jan", revenue: 12000, target: 10000 },
    { month: "Feb", revenue: 19000, target: 15000 },
    { month: "Mar", revenue: 15000, target: 12000 },
    { month: "Apr", revenue: 22000, target: 18000 },
    { month: "May", revenue: 28000, target: 20000 },
    { month: "Jun", revenue: 35000, target: 25000 },
  ];

  const tierDistribution = [
    { name: "Free", value: 450, fill: "#ef4444" },
    { name: "Standard", value: 280, fill: "#f59e0b" },
    { name: "Premium", value: 95, fill: "#10b981" },
    { name: "Enterprise", value: 8, fill: "#fbbf24" },
  ];

  const metricsData = [
    { label: "Total Businesses", value: "833", change: "+12%", icon: Building2, color: "from-amber-500 to-yellow-500" },
    { label: "Total Users", value: "12.4K", change: "+8%", icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Monthly Revenue", value: "R35K", change: "+18%", icon: DollarSign, color: "from-green-500 to-emerald-500" },
    { label: "Platform Health", value: "99.8%", change: "Optimal", icon: Activity, color: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-50 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Orchestrator Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Business intelligence & tier management</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-800 bg-black/30 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto border-0 p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 text-gray-400 data-[state=active]:text-yellow-400 rounded-none px-4 py-3 border-b-2 border-transparent"
              >
                <Activity className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="tiers"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 text-gray-400 data-[state=active]:text-yellow-400 rounded-none px-4 py-3 border-b-2 border-transparent"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Tiers
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 text-gray-400 data-[state=active]:text-yellow-400 rounded-none px-4 py-3 border-b-2 border-transparent"
              >
                <Shield className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 text-gray-400 data-[state=active]:text-yellow-400 rounded-none px-4 py-3 border-b-2 border-transparent"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Payment Gateway
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metricsData.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 hover:border-gray-600/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">{metric.label}</p>
                    <p className="text-3xl font-bold text-white mt-2">{metric.value}</p>
                    <p className={`text-sm mt-2 ${metric.change.includes("+") ? "text-green-400" : "text-blue-400"}`}>
                      {metric.change}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Revenue Trend
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={2} dot={{ fill: "#fbbf24" }} />
                    <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tier Distribution */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-6">Tier Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tierDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Business Tiers Breakdown */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-6">Tier Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { tier: "Free", count: 450, revenue: "R0", color: "text-red-400" },
                  { tier: "Standard", count: 280, revenue: "R14K/mo", color: "text-amber-400" },
                  { tier: "Premium", count: 95, revenue: "R9.5K/mo", color: "text-green-400" },
                  { tier: "Enterprise", count: 8, revenue: "Custom", color: "text-yellow-400" },
                ].map((tier) => (
                  <div key={tier.tier} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                    <p className="text-gray-400 text-sm mb-2">{tier.tier}</p>
                    <p className={`text-2xl font-bold ${tier.color}`}>{tier.count}</p>
                    <p className="text-gray-500 text-xs mt-2">{tier.revenue}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers">
            <TierManagement />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserSubscriptionManager />
          </TabsContent>

          {/* Payment Gateway Tab */}
          <TabsContent value="payment">
            <PaymentGatewayConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
