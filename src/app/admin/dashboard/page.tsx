'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, CheckCircle2, Clock, Users, BarChart3, Settings, Zap, FileText, CreditCard, History, UserCheck, Trophy, ShieldAlert, Receipt, Link2, Megaphone, Mail, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader, StatCard } from '@/components/admin/ui';
import { EmailTestSandbox } from '@/components/admin/email-test-sandbox';

interface AdminTool {
  id: string;
  name: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge?: string;
}

interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  reviewingBusinesses: number;
  openReports: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exportingEmail, setExportingEmail] = useState(false);

  const handleExportUsersEmail = async () => {
    setExportingEmail(true);
    try {
      const res = await fetch('/api/admin/users/export-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'info@verifiedbizlink.co.za' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: '✅ Users List Emailed!',
          description: `Master directory (${data.count} users + CSV attached) sent to ${data.recipient}`,
        });
      } else {
        toast({
          title: 'Failed to Send Email',
          description: data.error || 'Could not dispatch email',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Failed to contact server',
        variant: 'destructive',
      });
    } finally {
      setExportingEmail(false);
    }
  };

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          if (active) setStats(data.stats);
        }
      } catch {
        /* shown via loading state */
      } finally {
        if (active) setStatsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const fmt = (n?: number) =>
    n === undefined ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  // DB role is the only source of truth for tool access — no name/email matching.
  const isSuperAdmin = user.role === 'admin';
  const isBanker = user.role === 'banker' || user.role === 'lawyer';
  const isAdmin = isSuperAdmin;

  const adminTools: AdminTool[] = [
    { id: 'business-vetting', name: 'Business Vetting Desk', description: 'Review and grade business documents, manage verification status', icon: FileText, href: '/admin/vetting', color: 'from-blue-500 to-cyan-500', badge: statsLoading ? undefined : `${stats?.pendingBusinesses ?? 0} pending` },
    { id: 'payment-gateway', name: 'Payment Gateway', description: 'PayFast transactions, revenue, and payment status', icon: CreditCard, href: '/admin/payments', color: 'from-yellow-500 to-amber-500' },
    { id: 'user-management', name: 'User Management', description: 'Manage all users, roles, permissions, and access', icon: Users, href: '/admin/users', color: 'from-purple-500 to-pink-500', badge: statsLoading ? undefined : `${fmt(stats?.totalUsers)} users` },
    { id: 'platform-analytics', name: 'Platform Analytics', description: 'View platform metrics, traffic, and performance data', icon: BarChart3, href: '/admin/analytics', color: 'from-orange-500 to-yellow-500', badge: 'Live' },
    { id: 'network-monitoring', name: 'Network Status', description: 'Monitor system health, uptime, and performance', icon: Zap, href: '/admin/network', color: 'from-red-500 to-rose-500' },
    { id: 'activity-logs', name: 'Activity Logs', description: 'Every admin action, in order', icon: History, href: '/admin/logs', color: 'from-slate-600 to-slate-700' },
    { id: 'admin-settings', name: 'Settings', description: 'Configure platform settings and admin preferences', icon: Settings, href: '/admin/settings', color: 'from-gray-600 to-gray-700' },
    { id: 'ad-management', name: 'Ad Placement & Credits', description: 'Monitor sponsored campaigns, configure placement slots & frequency, and manage business ad credits', icon: Megaphone, href: '/admin/ads', color: 'from-amber-500 to-yellow-500', badge: 'Active' },
    { id: 'agents', name: 'Sales Agents & Payouts', description: 'Invite marketers, issue referral links and QR codes, track commission owed', icon: Link2, href: '/admin/agents', color: 'from-indigo-500 to-violet-500' },
    { id: 'agent-signups', name: 'Agent Sign Up Dashboard', description: 'Every business signup marked as assisted by a sales agent', icon: UserCheck, href: '/admin/agent-signups', color: 'from-teal-500 to-cyan-500' },
    { id: 'agent-sales', name: 'Agent Sales Dashboard', description: 'Assisted signups grouped by agent, with the tier each business took', icon: Trophy, href: '/admin/agent-sales', color: 'from-amber-500 to-orange-500' },
    { id: 'activity', name: 'Activity & Receipts', description: 'Every sign-up and payment as it happens, with receipt references', icon: Receipt, href: '/admin/activity', color: 'from-teal-500 to-emerald-500' },
    { id: 'security', name: 'Security & Moderation', description: 'Warnings, strikes, bans, verification control and account removal', icon: ShieldAlert, href: '/admin/security', color: 'from-rose-500 to-red-500' },
  ];

  const bankingTools: AdminTool[] = [
    { id: 'compliance', name: 'Legal Compliance', description: 'Monitor compliance status and regulatory requirements', icon: FileText, href: '/admin/compliance', color: 'from-green-500 to-emerald-500' },
    { id: 'team-management', name: 'Team Management', description: 'Manage team members and their permissions', icon: Users, href: '/admin/team', color: 'from-purple-500 to-pink-500' },
  ];

  let tools: AdminTool[] = [];
  let dashboardTitle = '';
  let dashboardDescription = '';
  if (isSuperAdmin) {
    tools = [...adminTools, ...bankingTools.filter((t) => !adminTools.find((a) => a.id === t.id))];
    dashboardTitle = '⭐ Admin Dashboard';
    dashboardDescription = 'Full platform access and control';
  } else if (isBanker) {
    tools = bankingTools;
    dashboardTitle = '🏦 Banking Portal';
    dashboardDescription = 'Review and approve business vetting requests';
  }

  return (
    <AdminBackground>
      <AdminPageHeader title={dashboardTitle} subtitle={dashboardDescription}>
        <Link href="/admin/orchestrator">
          <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            Orchestrator
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="sm" className="border-gray-500/30 text-gray-600 hover:bg-gray-100">
            Back to App
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <AdminCard className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="text-lg font-semibold text-gray-900">{user.fullName || user.email}</p>
              <p className="mt-1 text-sm text-gray-500">
                Role:{' '}
                <span className={`font-semibold ${isSuperAdmin ? 'text-yellow-600' : 'text-blue-600'}`}>
                  {isSuperAdmin ? 'Admin' : user.role === 'lawyer' ? 'Legal' : 'Compliance Officer'}
                </span>
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-mono text-sm text-gray-900">{user.email}</p>
            </div>
          </div>
        </AdminCard>

        {isSuperAdmin && (
          <div className="mb-8 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-yellow-50 to-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-base">Export & Email User Directory</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
                Compiles all real registered users, businesses, verification timestamps, and package tiers into a detailed report with an attached CSV spreadsheet, emailed instantly to <strong className="text-gray-900">info@verifiedbizlink.co.za</strong>.
              </p>
            </div>
            <Button
              onClick={handleExportUsersEmail}
              disabled={exportingEmail}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-2 px-5 rounded-xl shadow-xs shrink-0 self-stretch sm:self-auto"
            >
              {exportingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compiling & Dispatching…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Email Master Users List
                </>
              )}
            </Button>
          </div>
        )}

        {isSuperAdmin && (
          <EmailTestSandbox defaultEmail={user.email} />
        )}

        <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">
          {isAdmin ? 'Admin Tools' : 'Compliance Tools'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} href={tool.href} className="group">
                <AdminCard hover className="h-full">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} transition-transform group-hover:scale-110`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    {tool.badge && (
                      <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-semibold text-blue-700">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{tool.name}</h3>
                  <p className="mt-2 text-sm text-gray-500">{tool.description}</p>
                  <div className="flex items-center pt-4 text-sm font-semibold text-amber-400">
                    Open Tool <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </AdminCard>
              </Link>
            );
          })}
        </div>

        {isSuperAdmin && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Pending Verifications" value={fmt(stats?.pendingBusinesses)} icon={Clock} gradient="from-amber-500 to-orange-500" loading={statsLoading} onClick={() => router.push('/admin/vetting')} />
            <StatCard label="Total Businesses" value={fmt(stats?.totalBusinesses)} icon={Building2} gradient="from-blue-500 to-cyan-500" loading={statsLoading} onClick={() => router.push('/admin/vetting')} />
            <StatCard label="Verified" value={fmt(stats?.verifiedBusinesses)} icon={CheckCircle2} gradient="from-green-500 to-emerald-500" loading={statsLoading} onClick={() => router.push('/admin/vetting')} />
            <StatCard label="Active Users" value={fmt(stats?.totalUsers)} icon={Users} gradient="from-purple-500 to-pink-500" loading={statsLoading} onClick={() => router.push('/admin/users')} />
          </div>
        )}
      </div>
    </AdminBackground>
  );
}
