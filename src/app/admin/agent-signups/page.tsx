'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { AdminBackground, AdminCard, AdminPageHeader } from '@/components/admin/ui';

interface AgentSignup {
  id: string;
  company_name: string;
  assisted_by: string | null;
  package_type: string | null;
  status: string;
  created_at: string;
  owner_name: string;
  owner_email: string;
}

interface Tier {
  key: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-500/15 text-green-700',
  reviewing: 'bg-blue-500/15 text-blue-700',
  pending: 'bg-amber-500/15 text-amber-700',
  rejected: 'bg-red-500/15 text-red-700',
  unregistered: 'bg-gray-200 text-gray-600',
};

export default function AgentSignupsPage() {
  const { user, loading: authLoading } = useAuth();
  const [signups, setSignups] = useState<AgentSignup[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    let active = true;
    (async () => {
      try {
        const [signupsRes, tiersRes] = await Promise.all([
          fetch('/api/admin/agent-signups'),
          fetch('/api/admin/tiers'),
        ]);
        if (signupsRes.ok) {
          const data = await signupsRes.json();
          if (active) setSignups(data.signups || []);
        }
        if (tiersRes.ok) {
          const data = await tiersRes.json();
          if (active) setTiers(data.tiers || []);
        }
      } catch (error) {
        console.error('Failed to load agent signups:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authLoading, user]);

  const tierName = (key: string | null) => tiers.find((t) => t.key === key)?.name || key || 'Free';

  const filtered = signups.filter((s) =>
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.assisted_by?.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!authLoading && user && user.role !== 'admin') {
    return (
      <AdminBackground>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Admins only.</p>
        </div>
      </AdminBackground>
    );
  }

  return (
    <AdminBackground>
      <AdminPageHeader title="Agent Sign Up Dashboard" subtitle="Every business signup marked as assisted by a sales agent">
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
              placeholder="Search by business, owner, or agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-gray-200 bg-white pl-10 text-gray-900 placeholder-gray-400 focus-visible:ring-amber-400"
            />
          </div>
        </AdminCard>

        <AdminCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-600" /> {filtered.length} Assisted Sign Up{filtered.length === 1 ? '' : 's'}
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No assisted signups found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Business</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Assisted By</th>
                    <th className="px-5 py-3">Tier</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Signed Up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((s) => (
                    <tr key={s.id} className="text-gray-600 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{s.company_name}</td>
                      <td className="px-5 py-3">
                        <div className="text-gray-900">{s.owner_name}</div>
                        <div className="text-xs text-gray-500">{s.owner_email}</div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{s.assisted_by || '—'}</td>
                      <td className="px-5 py-3">{tierName(s.package_type)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[s.status] || STATUS_STYLES.unregistered}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('en-ZA')}</td>
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
