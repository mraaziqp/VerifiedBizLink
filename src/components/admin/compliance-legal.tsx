
"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Scale, History, UserX, AlertCircle, Loader2, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  report_type: string;
  risk_level: string;
  description: string;
  status: string;
  created_at: string;
  reported_user_name: string | null;
  reporter_name: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_name: string;
  admin_name: string;
  created_at: string;
}

const riskColors: Record<string, string> = {
  critical: "border-red-200 text-red-600 bg-red-50",
  high: "border-red-200 text-red-600 bg-red-50",
  medium: "border-yellow-200 text-yellow-700 bg-yellow-50",
  low: "border-green-200 text-green-700 bg-green-50",
};

export function ComplianceLegal() {
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, logsRes] = await Promise.all([
        fetch('/api/admin/reports'),
        fetch('/api/admin/audit-logs?limit=10'),
      ]);
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Compliance data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resolveReport = async (reportId: string) => {
    setResolvingId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
        toast({ title: "Report resolved", description: "The compliance report has been marked as resolved." });
      } else {
        toast({ title: "Failed to resolve report", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to resolve report", variant: "destructive" });
    } finally {
      setResolvingId(null);
    }
  };

  const openReports = reports.filter(r => r.status === 'open' || r.status === 'investigating');
  const criticalReports = reports.filter(r => r.risk_level === 'high' || r.risk_level === 'critical');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Risk & Compliance</h2>
        <div className="flex items-center gap-2">
          <Badge className={criticalReports.length > 0 ? "bg-red-100 text-red-700 font-bold px-4 py-1" : "bg-green-100 text-green-700 font-bold px-4 py-1"}>
            {criticalReports.length > 0 ? `${criticalReports.length} High Risk` : 'All Clear'}
          </Badge>
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Active Reports */}
            <Card className="shadow-sm border-none">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Active Reports ({openReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {openReports.length === 0 ? (
                  <div className="flex items-center gap-2 text-gray-400 font-medium p-6">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>No active reports.</span>
                  </div>
                ) : (
                  openReports.map((r, i) => (
                    <div key={r.id} className={cn("flex items-center justify-between p-4 hover:bg-gray-50 transition-colors", i !== openReports.length - 1 && "border-b")}>
                      <div className="flex gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <UserX className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{r.reported_user_name || 'Unknown User'}</span>
                          <span className="text-xs text-gray-500">{r.report_type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`${riskColors[r.risk_level] || riskColors.medium} font-bold text-xs`}>
                          {r.risk_level.charAt(0).toUpperCase() + r.risk_level.slice(1)} Risk
                        </Badge>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card className="shadow-sm border-none">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-500" />
                  Compliance Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <div className="p-6 text-gray-400 text-sm">No audit logs available.</div>
                ) : (
                  logs.slice(0, 6).map((a, i) => (
                    <div key={a.id} className={cn("p-4 hover:bg-gray-50 transition-colors", i !== Math.min(logs.length, 6) - 1 && "border-b")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-800">{a.action}</span>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-primary font-bold">Target:</span>
                        <span className="text-gray-600 font-medium">{a.target_name || '—'}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">By {a.admin_name || 'System'}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Disputes */}
          <Card className="shadow-sm border-none">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                All Compliance Reports ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {reports.length === 0 ? (
                <div className="flex items-center justify-center h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                    <AlertCircle className="h-5 w-5" />
                    <span>No compliance reports found.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border hover:border-gray-300 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.report_type}</p>
                        <p className="text-xs text-gray-500">Against: {r.reported_user_name || '—'} • By: {r.reporter_name || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={riskColors[r.risk_level] || riskColors.medium}>
                          {r.risk_level}
                        </Badge>
                        <Badge className={r.status === 'open' ? 'bg-red-100 text-red-700' : r.status === 'investigating' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                          {r.status}
                        </Badge>
                        {r.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-lg border-green-200 text-green-700 hover:bg-green-50 gap-1"
                            disabled={resolvingId === r.id}
                            onClick={() => resolveReport(r.id)}
                          >
                            {resolvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
