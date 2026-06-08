"use client";

import { useAuth } from "@/contexts/auth-context";
import { User2, Shield, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminRole {
  role: string;
  title: string;
  icon: React.ReactNode;
  mainTools: string[];
  color: string;
  description: string;
}

const ADMIN_ROLES: Record<string, AdminRole> = {
  admin: {
    role: "admin",
    title: "Chief Systems Architect",
    icon: <Shield className="h-5 w-5" />,
    mainTools: ["Overview", "Tiers", "Analytics"],
    color: "from-blue-500 to-cyan-500",
    description: "System oversight and platform administration",
  },
  banker: {
    role: "banker",
    title: "Verification Specialist",
    icon: <Briefcase className="h-5 w-5" />,
    mainTools: ["Vetting", "Users", "Analytics"],
    color: "from-green-500 to-emerald-500",
    description: "Business verification and compliance",
  },
  lawyer: {
    role: "lawyer",
    title: "Legal & Compliance Officer",
    icon: <Shield className="h-5 w-5" />,
    mainTools: ["Audit Logs", "Compliance", "Users"],
    color: "from-purple-500 to-pink-500",
    description: "Legal oversight and regulatory compliance",
  },
};

export function AdminProfilePanel() {
  const { user } = useAuth();

  if (!user) return null;

  const roleConfig = ADMIN_ROLES[user.role] || ADMIN_ROLES.admin;

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Admin Avatar & Info */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${roleConfig.color} flex items-center justify-center`}>
          <User2 className="h-8 w-8 text-white" />
        </div>

        <div className="flex-1">
          {/* Name & Title */}
          <div className="mb-2">
            <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>

          {/* Role Badge */}
          <div className="flex items-center gap-3 mb-3">
            <Badge className={`bg-gradient-to-r ${roleConfig.color} text-white border-0`}>
              {roleConfig.title}
            </Badge>
            <span className="text-xs text-gray-400">{roleConfig.description}</span>
          </div>

          {/* Main Tools */}
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-2">MAIN TOOLS</p>
            <div className="flex gap-2 flex-wrap">
              {roleConfig.mainTools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1 bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full border border-gray-600/30"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
