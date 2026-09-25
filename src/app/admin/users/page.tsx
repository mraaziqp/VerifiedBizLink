'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Loader2, Mail, ShieldCheck, Ban, RotateCcw,
  Trash2, Building2, User, Users, Briefcase, Shield, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader } from '@/components/admin/ui';
import { ROLES, STAFF_ROLES, ROLE_LABELS as SHARED_ROLE_LABELS } from '@/lib/roles';
import { AnimatedTabs, type TabItem } from '@/components/ui/animated-tabs';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_type?: string;
  status: string;
  created_at: string;
  email_verified: boolean;
  is_suspended: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-red-50 text-red-800 border-red-200 border',
  finance_admin: 'bg-emerald-50 text-emerald-800 border-emerald-200 border',
  compliance_admin: 'bg-indigo-50 text-indigo-800 border-indigo-200 border',
  banker: 'bg-blue-50 text-blue-800 border-blue-200 border',
  lawyer: 'bg-purple-50 text-purple-800 border-purple-200 border',
  sales_agent: 'bg-amber-50 text-amber-900 border-amber-200 border',
  business: 'bg-emerald-50 text-emerald-800 border-emerald-200 border',
  customer: 'bg-slate-100 text-slate-800 border-slate-200 border',
};

const ROLE_LABELS = SHARED_ROLE_LABELS;

const ASSIGNABLE_ROLES = [
  ROLES.CUSTOMER,
  ROLES.BUSINESS,
  ROLES.SALES_AGENT,
  ROLES.FINANCE_ADMIN,
  ROLES.COMPLIANCE_ADMIN,
  ROLES.BANKER,
  ROLES.LAWYER,
  ROLES.ADMIN,
];

type CategoryTab = 'all' | 'business' | 'customer' | 'job_seeker' | 'staff';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingEmail, setExportingEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          if (active) setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/resend-verification`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: 'Verification email sent' });
      } else {
        toast({ title: 'Could not send email', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not send email', variant: 'destructive' });
    } finally {
      setResendingId(null);
    }
  };

  const handleForceVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/verify-email`, { method: 'POST' });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, email_verified: true } : u)));
        toast({ title: 'User verified' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not verify user', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not verify user', variant: 'destructive' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRoleChange = async (user: UserItem, nextRole: string) => {
    if (nextRole === user.role) return;
    const label = SHARED_ROLE_LABELS[nextRole] || nextRole;
    const warning = nextRole === ROLES.ADMIN
      ? `\n\nThis grants FULL platform control, including user management.`
      : '';
    if (!window.confirm(`Change ${user.full_name}'s role to ${label}?${warning}`)) return;

    setSavingRoleId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
        toast({ title: `${user.full_name} is now ${label}` });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not change role', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not change role', variant: 'destructive' });
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleToggleSuspend = async (user: UserItem) => {
    const suspending = !user.is_suspended;
    if (suspending) {
      const reason = window.prompt('Reason for suspending this account (shown to the user):', '');
      if (reason === null) return;
      await doSuspend(user.id, true, reason);
    } else {
      await doSuspend(user.id, false);
    }
  };

  const doSuspend = async (id: string, isSuspended: boolean, suspendedReason?: string) => {
    setSuspendingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended, suspendedReason }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_suspended: isSuspended } : u)));
        toast({ title: isSuspended ? 'Account suspended' : 'Account reinstated' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not update account', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update account', variant: 'destructive' });
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDelete = async (user: UserItem) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.full_name || user.email} (${user.email})?\n\nThis removes their account, posts, connections, messages, and business listing. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast({ title: 'User deleted' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not delete user', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not delete user', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

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
          title: '✅ Users Directory Dispatched',
          description: `Master list (${data.count} users) sent to ${data.recipient}`,
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

  // Group counts for tabs
  const businessCount = users.filter((u) => u.role === 'business' || u.user_type === 'business').length;
  const jobSeekerCount = users.filter((u) => u.user_type === 'job_seeker' || u.role === 'job_seeker').length;
  const customerCount = users.filter((u) => (u.role === 'customer' && u.user_type !== 'job_seeker') || u.user_type === 'customer').length;
  const staffCount = users.filter((u) => STAFF_ROLES.includes(u.role)).length;

  const categoryTabs: TabItem<CategoryTab>[] = [
    { id: 'all', label: 'All Accounts', icon: Users, badge: users.length },
    { id: 'business', label: 'Businesses', icon: Building2, badge: businessCount },
    { id: 'customer', label: 'Shoppers / Customers', icon: User, badge: customerCount },
    { id: 'job_seeker', label: 'Job Seekers', icon: Briefcase, badge: jobSeekerCount },
    { id: 'staff', label: 'Staff & Compliance', icon: Shield, badge: staffCount },
  ];

  const filteredUsers = users.filter((u) => {
    // 1. Text Search Filter
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    // 2. Tab Category Filter
    if (activeTab === 'all') return true;
    if (activeTab === 'business') return u.role === 'business' || u.user_type === 'business';
    if (activeTab === 'customer') return (u.role === 'customer' && u.user_type !== 'job_seeker') || u.user_type === 'customer';
    if (activeTab === 'job_seeker') return u.user_type === 'job_seeker' || u.role === 'job_seeker';
    if (activeTab === 'staff') return STAFF_ROLES.includes(u.role);
    return true;
  });

  return (
    <AdminBackground>
      <AdminPageHeader title="User &amp; Member Management" subtitle={`${users.length} registered accounts across all personas`}>
        <Button
          onClick={handleExportUsersEmail}
          disabled={exportingEmail}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold"
          size="sm"
        >
          {exportingEmail ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Compiling &amp; Sending…
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" /> Email Directory CSV
            </>
          )}
        </Button>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-800 hover:bg-slate-100 font-bold">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
        {/* Animated Persona Tabs */}
        <AnimatedTabs<CategoryTab>
          tabs={categoryTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pill"
        />

        {/* Search Bar */}
        <AdminCard>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by full name or email address across this view..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 rounded-xl"
            />
          </div>
        </AdminCard>

        {/* Users Table */}
        <AdminCard className="p-0 overflow-hidden shadow-xs border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
            <p className="font-bold text-slate-900 text-sm">
              {filteredUsers.length} {activeTab === 'all' ? 'Users' : categoryTabs.find(t => t.id === activeTab)?.label}
            </p>
            {search && (
              <span className="text-xs text-slate-500 font-medium">
                Filtered from {users.length} total
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-slate-900" /> Loading account records…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-base">No accounts found</p>
              <p className="text-xs text-slate-400 mt-1">Try switching tabs or resetting your search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Persona / Role</th>
                    <th className="px-5 py-3.5">Email Status</th>
                    <th className="px-5 py-3.5">Account State</th>
                    <th className="px-5 py-3.5">Joined</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isStaffUser = STAFF_ROLES.includes(u.role);
                    return (
                      <tr key={u.id} className="text-slate-700 transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {u.full_name || 'Anonymous User'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_STYLES[u.role] || ROLE_STYLES.customer}`}>
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                            <select
                              aria-label={`Change role for ${u.full_name}`}
                              value={u.role}
                              disabled={savingRoleId === u.id}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                              ))}
                            </select>
                            {savingRoleId === u.id && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {isStaffUser ? (
                            <span className="text-xs text-slate-400 font-medium">Staff Account</span>
                          ) : u.email_verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900">
                                Unverified
                              </span>
                              <button
                                onClick={() => handleResend(u.id)}
                                disabled={resendingId === u.id}
                                title="Send a fresh verification email"
                                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                {resendingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleForceVerify(u.id)}
                                disabled={verifyingId === u.id}
                                title="Verify email manually"
                                className="p-1 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                              >
                                {verifyingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isStaffUser ? (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {u.is_suspended ? (
                                <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-800">
                                  Suspended
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                                  Active
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleSuspend(u)}
                                disabled={suspendingId === u.id}
                                title={u.is_suspended ? 'Reinstate account' : 'Suspend account'}
                                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                {suspendingId === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : u.is_suspended ? (
                                  <RotateCcw className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Ban className="h-4 w-4 text-red-500" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!isStaffUser && (
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={deletingId === u.id}
                              title="Delete user"
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              {deletingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
