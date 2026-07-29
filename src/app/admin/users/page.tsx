'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Mail, ShieldCheck, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminBackground, AdminCard, AdminPageHeader } from '@/components/admin/ui';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  email_verified: boolean;
  is_suspended: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-700',
  banker: 'bg-blue-500/15 text-blue-700',
  lawyer: 'bg-purple-500/15 text-purple-700',
  business: 'bg-green-500/15 text-green-700',
  customer: 'bg-gray-500/15 text-gray-700',
};

// 'banker' is the internal RBAC role name — show it as the friendly title
// staff actually use instead of the raw role value.
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  banker: 'Compliance Officer',
  lawyer: 'Lawyer',
  business: 'Business',
  customer: 'Customer',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
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

  const handleToggleSuspend = async (user: User) => {
    const suspending = !user.is_suspended;
    if (suspending) {
      const reason = window.prompt('Reason for suspending this account (shown to the user):', '');
      if (reason === null) return; // cancelled
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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminBackground>
      <AdminPageHeader title="User Management" subtitle={`${users.length} total users`}>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-6">
        <AdminCard>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-gray-200 bg-white pl-10 text-gray-900 placeholder-gray-400 focus-visible:ring-amber-400"
            />
          </div>
        </AdminCard>

        <AdminCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="font-semibold text-gray-900">{filteredUsers.length} Users</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Verified</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isStaffUser = ['admin', 'banker', 'lawyer'].includes(user.role);
                    return (
                    <tr key={user.id} className="text-gray-600 transition-colors hover:bg-gray-100">
                      <td className="px-5 py-3 font-medium text-gray-900">{user.full_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{user.email}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[user.role] || ROLE_STYLES.customer}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {isStaffUser ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : user.email_verified ? (
                          <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-700">Verified</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-400">Unverified</span>
                            <button
                              onClick={() => handleResend(user.id)}
                              disabled={resendingId === user.id}
                              title="Send a fresh verification email"
                              className="text-gray-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                            >
                              {resendingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleForceVerify(user.id)}
                              disabled={verifyingId === user.id}
                              title="Mark verified directly — use if the client says the email never arrives"
                              className="text-gray-500 hover:text-green-400 disabled:opacity-50 transition-colors"
                            >
                              {verifyingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isStaffUser ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {user.is_suspended ? (
                              <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-700">Suspended</span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">Active</span>
                            )}
                            <button
                              onClick={() => handleToggleSuspend(user)}
                              disabled={suspendingId === user.id}
                              title={user.is_suspended ? 'Reinstate this account' : 'Suspend this account'}
                              className={`disabled:opacity-50 transition-colors ${user.is_suspended ? 'text-gray-500 hover:text-green-400' : 'text-gray-500 hover:text-red-400'}`}
                            >
                              {suspendingId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.is_suspended ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('en-ZA')}
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
