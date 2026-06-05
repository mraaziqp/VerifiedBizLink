"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle2, XCircle, LogOut, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EnforcerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<"content" | "fraud" | "compliance">("content");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Mock data
  const contentQueue = [
    { id: 1, business: "TechCorp SA", adTitle: "50% Off Electronics", type: "promotion", submitted: "2h ago", status: "pending" },
    { id: 2, business: "Fashion House", adTitle: "New Collection Launch", type: "product", submitted: "4h ago", status: "pending" },
    { id: 3, business: "Digital Agency", adTitle: "Web Design Services", type: "service", submitted: "6h ago", status: "reviewing" },
  ];

  const fraudAlerts = [
    { id: 1, type: "unusual_spend_spike", business: "Mystery Marketing", severity: "high", detected: "1h ago", action: "investigate" },
    { id: 2, type: "click_fraud", business: "Auto Clicks Inc", severity: "high", detected: "3h ago", action: "suspend" },
    { id: 3, type: "content_violation", business: "Gray Market", severity: "medium", detected: "5h ago", action: "review" },
  ];

  const complianceIssues = [
    { category: "POPI Act", status: "compliant", businesses: "833/833" },
    { category: "Age Restrictions", status: "review", businesses: "12 requiring review" },
    { category: "Content Policy", status: "compliant", businesses: "831/833" },
    { category: "Geographic Targeting", status: "compliant", businesses: "833/833" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-red-900/30 sticky top-0 z-50 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-red-400">Enforcer Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Content moderation, fraud detection & compliance</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/40">
            <p className="text-red-400 text-sm font-bold">PENDING REVIEW</p>
            <p className="text-3xl font-bold text-red-300 mt-2">3</p>
            <p className="text-gray-500 text-xs mt-1">Content & ads</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-900/20 border border-orange-800/40">
            <p className="text-orange-400 text-sm font-bold">FRAUD ALERTS</p>
            <p className="text-3xl font-bold text-orange-300 mt-2">3</p>
            <p className="text-gray-500 text-xs mt-1">Requires action</p>
          </div>
          <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-800/40">
            <p className="text-yellow-400 text-sm font-bold">COMPLIANCE ISSUES</p>
            <p className="text-3xl font-bold text-yellow-300 mt-2">2</p>
            <p className="text-gray-500 text-xs mt-1">Under review</p>
          </div>
          <div className="p-4 rounded-xl bg-green-900/20 border border-green-800/40">
            <p className="text-green-400 text-sm font-bold">APPROVED TODAY</p>
            <p className="text-3xl font-bold text-green-300 mt-2">42</p>
            <p className="text-gray-500 text-xs mt-1">Ads & content</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {(["content", "fraud", "compliance"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 capitalize font-bold text-sm transition-all ${
                selectedTab === tab
                  ? "text-red-400 border-b-2 border-red-400"
                  : "text-gray-500 hover:text-gray-400"
              }`}
            >
              {tab} Moderation
            </button>
          ))}
        </div>

        {/* Content Moderation Queue */}
        {selectedTab === "content" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-red-900/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Eye className="h-5 w-5 text-red-400" />
                Content Review Queue
              </h2>
              <div className="space-y-3">
                {contentQueue.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-between hover:border-red-700/40 transition-all">
                    <div className="flex-1">
                      <p className="text-white font-bold">{item.business}</p>
                      <p className="text-gray-400 text-sm">{item.adTitle}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 rounded bg-gray-700/50 text-gray-300">{item.type}</span>
                        <span className="px-2 py-1 rounded bg-gray-700/50 text-gray-400">{item.submitted}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600/30 text-green-400 border border-green-600 hover:bg-green-600/50 gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20 gap-1">
                        <ThumbsDown className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fraud Detection */}
        {selectedTab === "fraud" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-red-900/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Fraud Alerts & Suspicious Activity
              </h2>
              <div className="space-y-3">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-gray-800/30 border border-orange-700/30 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-bold">{alert.business}</p>
                      <p className="text-gray-400 text-sm capitalize">{alert.type.replace(/_/g, " ")}</p>
                      <p className="text-gray-500 text-xs mt-1">{alert.detected}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        alert.severity === "high"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <Button size="sm" className="bg-red-600/30 text-red-400 border border-red-600 hover:bg-red-600/50">
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compliance */}
        {selectedTab === "compliance" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-red-900/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-400" />
                Compliance Checklist
              </h2>
              <div className="space-y-3">
                {complianceIssues.map((issue) => (
                  <div key={issue.category} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{issue.category}</p>
                      <p className="text-gray-400 text-sm">{issue.businesses}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                      issue.status === "compliant"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {issue.status === "compliant" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {issue.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Log */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
          <h2 className="text-xl font-bold text-white mb-4">Recent Actions</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>✓ Approved: "TechStore Mega Sale" by TechStore (1h ago)</p>
            <p>✓ Approved: "Photography Session" by StudioPro (2h ago)</p>
            <p>✗ Rejected: "Unknown Service" by Unknown Corp (3h ago)</p>
            <p>⚠ Flagged: Unusual spend from FastMarketing (5h ago)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
