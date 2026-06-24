'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Search, Mail, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      banker: 'bg-blue-100 text-blue-800',
      lawyer: 'bg-purple-100 text-purple-800',
      business: 'bg-green-100 text-green-800',
      customer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.customer;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <Link href="/admin" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        {/* Header */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-yellow-400" />
              <CardTitle className="text-white text-2xl">User Management</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Search */}
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-700 text-white border-slate-600 placeholder-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="bg-slate-700 border-b border-slate-600">
            <CardTitle className="text-white">
              {filteredUsers.length} Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-600">
                    <tr className="text-yellow-400 text-sm font-semibold">
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Role</th>
                      <th className="px-6 py-3 text-left">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-700 transition-colors text-slate-300">
                        <td className="px-6 py-3">{user.full_name}</td>
                        <td className="px-6 py-3 font-mono text-sm text-slate-400">{user.email}</td>
                        <td className="px-6 py-3">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
