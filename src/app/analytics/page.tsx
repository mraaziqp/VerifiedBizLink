"use client";

import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, Users, ShieldCheck, Eye } from "lucide-react";

const connectionData = [
  { month: "Jan", connections: 400 },
  { month: "Feb", connections: 520 },
  { month: "Mar", connections: 680 },
  { month: "Apr", connections: 840 },
  { month: "May", connections: 950 },
  { month: "Jun", connections: 1200 },
];

const vettingHistory = [
  { date: "Week 1", score: 85 },
  { date: "Week 2", score: 88 },
  { date: "Week 3", score: 92 },
  { date: "Week 4", score: 95 },
  { date: "Week 5", score: 98 },
];

const chartConfig = {
  connections: {
    label: "Connections",
    color: "hsl(var(--primary))",
  },
  score: {
    label: "Trust Score",
    color: "hsl(var(--primary))",
  }
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <div className="text-sm text-gray-500 font-medium">Last 30 Days</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Profile Views", value: "2,482", icon: Eye, trend: "+12%" },
                { label: "New Connections", value: "142", icon: Users, trend: "+18%" },
                { label: "Vetting Score", value: "98%", icon: ShieldCheck, trend: "+2%" },
                { label: "Search Appearances", value: "854", icon: TrendingUp, trend: "+24%" },
              ].map((stat, i) => (
                <Card key={i} className="shadow-sm border-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <stat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.trend}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connection Growth */}
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Network Expansion</CardTitle>
                  <CardDescription>Monthly growth of verified business connections</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={connectionData}>
                        <defs>
                          <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="connections" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorConnections)" 
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Trust Score History */}
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Trust Score Trajectory</CardTitle>
                  <CardDescription>Reputation building over the last 5 weeks</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vettingHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <YAxis domain={[0, 100]} hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="score" 
                          fill="hsl(var(--primary))" 
                          radius={[6, 6, 0, 0]} 
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
