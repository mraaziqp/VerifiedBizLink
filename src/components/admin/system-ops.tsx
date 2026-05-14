
"use client";

import { useState, useEffect } from "react";
import { Cpu, Database, Cloud, Terminal, CheckCircle2, AlertTriangle, RefreshCw, Users, Building2, Loader2, ShieldCheck, UserPlus, Crown, KeyRound, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  reviewingBusinesses: number;
  rejectedBusinesses: number;
  totalPosts: number;
  totalConnections: number;
  openReports: number;
  openTickets?: number;
  pendingDeletions?: number;
}

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_name: string;
  admin_name: string;
  created_at: string;
}

export function SystemOps() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: 'admin' });
  const [creating, setCreating] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [togglingAds, setTogglingAds] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, adsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/audit-logs?limit=20'),
        fetch('/api/ads/settings'),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
      if (adsRes.ok) {
        const data = await adsRes.json();
        setAdsEnabled(data.enabled !== false);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('System ops error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName || !createForm.email || !createForm.password) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Account Created", description: `${createForm.fullName} has been added as ${createForm.role}.` });
        setCreateForm({ fullName: '', email: '', password: '', role: 'admin' });
        setCreateDialogOpen(false);
        fetchData();
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not create account.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const verificationRate = stats ? Math.round((stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1)) * 100) : 0;

  const toggleAds = async () => {
    setTogglingAds(true);
    try {
      const res = await fetch('/api/admin/ads-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !adsEnabled }),
      });
      if (res.ok) {
        setAdsEnabled(!adsEnabled);
        toast({
          title: adsEnabled ? "Ads Disabled" : "Ads Enabled",
          description: adsEnabled ? "Free account ads are now hidden." : "Free accounts will now see ads.",
        });
      } else {
        toast({ title: "Failed", description: "Could not update ad settings.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setTogglingAds(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Operations</h2>
          <p className="text-xs text-gray-400 font-medium">Last refreshed: {formatDistanceToNow(lastRefresh, { addSuffix: true })}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl">
                <UserPlus className="h-4 w-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-600" />
                  Create Admin / Shareholder Account
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Add a privileged account for operations, compliance, or vetting workflows.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createAdminUser} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    required
                    placeholder="Jane Smith"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    required
                    type="email"
                    placeholder="jane@vbl.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input
                    required
                    type="password"
                    placeholder="Min 8 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin (Full Access)</SelectItem>
                      <SelectItem value="banker">Banker (Vetting Access)</SelectItem>
                      <SelectItem value="lawyer">Lawyer (Compliance Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <KeyRound className="h-4 w-4 flex-shrink-0" />
                  The user can change their password after first login via Settings.
                </div>
                <Button type="submit" disabled={creating} className="w-full bg-gray-900 text-white rounded-xl">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="gap-2 bg-gray-900 text-white rounded-xl" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-purple-600 bg-purple-50" },
            { label: "Verified", value: stats.verifiedBusinesses, icon: ShieldCheck, color: "text-green-600 bg-green-50" },
            { label: "Open Reports", value: stats.openReports, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
            { label: "Support Tickets", value: stats.openTickets ?? 0, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
            { label: "Pending Deletions", value: stats.pendingDeletions ?? 0, icon: AlertTriangle, color: "text-rose-600 bg-rose-50" },
          ].map((stat, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-bold">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DB Status */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-2xl">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700 font-bold">Connected</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Neon DB Cluster</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Region: eu-west-2 (AWS)</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Verification Rate</span>
                <span className="text-gray-900">{verificationRate}%</span>
              </div>
              <Progress value={verificationRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Blob Storage */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <Cloud className="h-6 w-6 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 font-bold">Healthy</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Document Storage</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Verification Documents</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Total Posts</span>
                <span className="text-gray-900">{stats?.totalPosts || 0}</span>
              </div>
              <Progress value={Math.min((stats?.totalPosts || 0) * 5, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Server Health */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-2xl">
                <Cpu className="h-6 w-6 text-yellow-600" />
              </div>
              <Badge className="bg-yellow-100 text-yellow-700 font-bold">Optimal</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Network Activity</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Active Connections: {stats?.totalConnections || 0}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Pending Reviews</span>
                <span className="text-gray-900">{((stats?.pendingBusinesses || 0) + (stats?.reviewingBusinesses || 0))}</span>
              </div>
              <Progress value={Math.min(((stats?.pendingBusinesses || 0) + (stats?.reviewingBusinesses || 0)) * 10, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Audit Log */}
      <Card className="shadow-sm border-none overflow-hidden">
        <CardHeader className="bg-gray-900 text-white flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Live Audit Log ({logs.length} entries)
          </CardTitle>
          <div className="flex gap-2">
            {stats?.openReports ? (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" />
                <span>{stats.openReports} Open Reports</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>All systems go</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-gray-950 font-mono text-xs max-h-64 overflow-y-auto">
          <div className="p-4 space-y-1.5 text-gray-400">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-gray-600">No audit logs available.</p>
            ) : (
              logs.map((log) => (
                <p key={log.id}>
                  <span className="text-gray-600">[{new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}]</span>{' '}
                  <span className={
                    log.action.toLowerCase().includes('verified') ? 'text-green-400' :
                    log.action.toLowerCase().includes('reject') ? 'text-red-400' :
                    log.action.toLowerCase().includes('critical') ? 'text-red-400' :
                    log.action.toLowerCase().includes('warn') ? 'text-yellow-400' :
                    'text-gray-300'
                  }>
                    {log.admin_name}: {log.action}
                    {log.target_name ? ` → ${log.target_name}` : ''}
                  </span>
                </p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {/* Ads Management */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-xl">
                <Megaphone className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-base">Ad System</CardTitle>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Control ads shown to free/customer accounts</p>
              </div>
            </div>
            <button
              onClick={toggleAds}
              disabled={togglingAds}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                adsEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {togglingAds ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : adsEnabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {adsEnabled ? 'Ads ON' : 'Ads OFF'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-gray-50 rounded-xl border text-center">
              <p className="text-2xl font-extrabold text-gray-900">—</p>
              <p className="text-xs text-gray-500 font-bold mt-1">Active Ads</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border text-center">
              <p className="text-2xl font-extrabold text-gray-900">—</p>
              <p className="text-xs text-gray-500 font-bold mt-1">Boosted Ads</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border text-center">
              <p className={`text-2xl font-extrabold ${adsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {adsEnabled ? 'Active' : 'Paused'}
              </p>
              <p className="text-xs text-gray-500 font-bold mt-1">System Status</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 font-medium">
            Ads are only shown to <strong>Customer (free)</strong> accounts. Business, admin, and shareholder roles never see ads.
            Dismissed ads return after 5 minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
