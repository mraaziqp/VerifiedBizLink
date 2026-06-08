"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    id: "overview",
  },
  {
    label: "Tier Management",
    icon: DollarSign,
    id: "tiers",
  },
  {
    label: "Users",
    icon: Users,
    id: "users",
  },
  {
    label: "Payment Gateway",
    icon: CreditCard,
    id: "payment",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    id: "analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    id: "settings",
  },
];

export default function AdminSidebar({
  onNavigate,
  activeTab,
}: {
  onNavigate: (tab: string) => void;
  activeTab: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 md:hidden z-50 text-white hover:bg-gray-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-br from-gray-900 to-gray-950 border-r border-gray-800 p-6 transition-transform md:translate-x-0 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="mb-8 pt-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <span className="text-gray-900 font-bold text-sm">⚙</span>
            </div>
            Admin
          </h2>
        </div>

        {/* Menu Items */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  isActive
                    ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Help Section */}
        <div className="mt-auto pt-8 border-t border-gray-800">
          <Button className="w-full bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 justify-start text-sm">
            📚 Docs
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
