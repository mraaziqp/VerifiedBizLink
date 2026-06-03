"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Settings, Plus, Trash2, Lock } from "lucide-react";

// Admin personas
const ADMIN_PERSONAS = {
  "mraaziqp@gmail.com": {
    name: "Orchestrator",
    role: "Founder",
    color: "from-amber-500 to-yellow-400",
    accentColor: "bg-yellow-400 text-gray-900",
    bgColor: "dark:from-amber-950 dark:to-yellow-900",
    vibe: "Obsidian & Gold - High-level omniscient view",
  },
  ramone: {
    name: "Architect",
    role: "Compliance Officer",
    color: "from-green-500 to-emerald-400",
    accentColor: "bg-green-400 text-gray-900",
    bgColor: "dark:from-green-950 dark:to-emerald-900",
    vibe: "Cyberpunk Neon Green - Terminal-inspired",
  },
  wesley: {
    name: "Enforcer",
    role: "Security Lead",
    color: "from-red-500 to-pink-400",
    accentColor: "bg-red-400 text-gray-900",
    bgColor: "dark:from-red-950 dark:to-pink-900",
    vibe: "Crimson Red & Gunmetal - Tactical layout",
  },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAI, setShowAI] = useState(true);
  const [widgets, setWidgets] = useState([
    { id: 1, name: "Users Overview", active: true },
    { id: 2, name: "Revenue Metrics", active: true },
    { id: 3, name: "System Health", active: true },
    { id: 4, name: "Recent Activity", active: true },
  ]);

  // Determine which persona based on user
  const userEmail = user?.email || "";
  let currentPersona = ADMIN_PERSONAS["mraaziqp@gmail.com"];
  
  if (userEmail.includes("ramone")) {
    currentPersona = ADMIN_PERSONAS.ramone;
  } else if (userEmail.includes("wesley")) {
    currentPersona = ADMIN_PERSONAS.wesley;
  }

  const toggleWidget = (id: number) => {
    setWidgets(widgets.map(w => (w.id === id ? { ...w, active: !w.active } : w)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Command Palette Backdrop */}
      {showAI && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-none z-40" />
      )}

      {/* Main Admin Layout */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {currentPersona.name} Portal
            </h1>
            <p className="text-gray-400 mt-1">{currentPersona.vibe}</p>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
            <Input
              placeholder="Search (or press Cmd+K)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 rounded-xl"
            />
          </div>
        </div>

        {/* Glassmorphism Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {["Overview", "Analytics", "Users", "Settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`
                px-6 py-3 rounded-2xl font-bold transition-all
                backdrop-blur-xl border
                ${
                  activeTab === tab.toLowerCase()
                    ? `${currentPersona.accentColor} border-transparent shadow-lg shadow-yellow-500/50`
                    : "bg-gray-800/30 border-gray-700/50 hover:bg-gray-700/30 text-gray-300"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content - Glassmorphic Panels */}
        <div className="space-y-6">
          {/* Panel 1: Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Users", value: "1,247", change: "+12%" },
              { label: "Verified Businesses", value: "342", change: "+8%" },
              { label: "System Health", value: "99.8%", change: "Optimal" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="
                  p-6 rounded-2xl
                  bg-gradient-to-br from-gray-800/40 to-gray-900/40
                  backdrop-blur-xl border border-gray-700/50
                  hover:border-gray-600/50 transition-all
                  shadow-lg shadow-black/20
                "
              >
                <p className="text-gray-400 text-sm font-medium">{metric.label}</p>
                <p className="text-3xl font-bold mt-2">{metric.value}</p>
                <p className={`text-sm mt-2 ${metric.change.includes("+") ? "text-green-400" : "text-blue-400"}`}>
                  {metric.change}
                </p>
              </div>
            ))}
          </div>

          {/* Panel 2: Widget Manager */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Personalization</h2>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setShowAI(!showAI)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="
                    p-4 rounded-xl
                    bg-gray-700/20 border border-gray-600/30
                    flex items-center justify-between
                    hover:bg-gray-700/40 transition-all
                  "
                >
                  <span className={widget.active ? "text-white font-medium" : "text-gray-500"}>
                    {widget.name}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={widget.active}
                      onChange={() => toggleWidget(widget.id)}
                      className="rounded"
                    />
                    <button className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3: Theme Customization */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 space-y-4">
            <h2 className="text-xl font-bold">Theme Settings</h2>
            <div className="flex gap-3">
              {["Obsidian Gold", "Neon Green", "Crimson Red"].map((theme) => (
                <button
                  key={theme}
                  className="px-4 py-2 rounded-lg bg-gray-700/40 border border-gray-600/50 hover:border-gray-500 transition-all"
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Assistant Toggle */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => setShowAI(!showAI)}
            className={`rounded-full h-14 w-14 flex items-center justify-center ${currentPersona.accentColor}`}
          >
            🤖
          </Button>
        </div>
      </div>
    </div>
  );
}
