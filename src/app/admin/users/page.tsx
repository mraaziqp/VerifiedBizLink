'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminBackground, AdminCard, AdminPageHeader } from '@/components/admin/ui';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400',
  banker: 'bg-blue-500/15 text-blue-400',
  lawyer: 'bg-purple-500/15 text-purple-400',
  business: 'bg-green-500/15 text-green-400',
  customer: 'bg-gray-500/15 text-gray-400',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminBackground>
      <AdminPageHeader title="User Management" subtitle={`${users.length} total users`}>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
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
              className="border-white/10 bg-white/[0.03] pl-10 text-white placeholder-gray-500 focus-visible:ring-amber-400"
            />
          </div>
        </AdminCard>

        <AdminCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-3">
            <p className="font-semibold text-white">{filteredUsers.length} Users</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-amber-400/80">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="text-gray-300 transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-3 font-medium text-white">{user.full_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">{user.email}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[user.role] || ROLE_STYLES.customer}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('en-ZA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
