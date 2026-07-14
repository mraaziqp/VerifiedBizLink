'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminBackground, AdminCard, AdminPageHeader, SectionTitle } from '@/components/admin/ui';

interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  created_at: string;
  admin_name: string | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <AdminBackground>
      <AdminPageHeader title="Activity Logs" subtitle="Every admin action, in order">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <AdminCard className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6 pb-0">
            <SectionTitle icon={FileText}>Recent Activity</SectionTitle>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="mb-5 sm:mb-6 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-yellow-500 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No activity logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-white/5 text-left text-slate-400">
                    <th className="px-5 py-3 font-medium">Admin</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                    <th className="px-5 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-5 py-3 text-slate-100 font-medium">{log.admin_name || 'System'}</td>
                      <td className="px-5 py-3 text-slate-300">{log.action}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {log.target_type ? `${log.target_type}${log.target_name ? `: ${log.target_name}` : ''}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-ZA', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
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
