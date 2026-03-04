
"use client";

import { ShieldAlert, Scale, History, UserX, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const REPORTS = [
  { id: 1, user: "SpamBot_99", type: "Fraudulent Activity", risk: "High", time: "10m ago" },
  { id: 2, user: "TraderX", type: "T&C Violation", risk: "Medium", time: "1h ago" },
];

const AUDIT_LOG = [
  { action: "Verified Business", target: "Apex Dynamics", admin: "lawyer_jane", time: "30m ago" },
  { action: "Updated Terms", target: "Privacy Policy v2.1", admin: "admin_legal", time: "4h ago" },
  { action: "Suspended User", target: "BadActor_01", admin: "mod_team", time: "6h ago" },
];

export function ComplianceLegal() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Risk & Compliance</h2>
        <Badge className="bg-red-100 text-red-700 font-bold px-4 py-1">System Health: Critical</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reported Users */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Urgent Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {REPORTS.map((r, i) => (
              <div key={r.id} className={cn("flex items-center justify-between p-4 hover:bg-gray-50 transition-colors", i !== REPORTS.length - 1 && "border-b")}>
                <div className="flex gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <UserX className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{r.user}</span>
                    <span className="text-xs text-gray-500">{r.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={r.risk === "High" ? "border-red-200 text-red-600 bg-red-50 font-bold" : "font-bold"}>{r.risk} Risk</Badge>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{r.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Compliance Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {AUDIT_LOG.map((a, i) => (
              <div key={i} className={cn("p-4 hover:bg-gray-50 transition-colors", i !== AUDIT_LOG.length - 1 && "border-b")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">{a.action}</span>
                  <span className="text-xs text-gray-400 font-medium">{a.time}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary font-bold">Target:</span>
                  <span className="text-gray-600 font-medium">{a.target}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">By {a.admin}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Disputes Table */}
      <Card className="shadow-sm border-none">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Pending T&C Disputes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
             <div className="flex items-center gap-2 text-gray-400 font-medium">
               <AlertCircle className="h-5 w-5" />
               <span>No pending legal disputes found in this region.</span>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
