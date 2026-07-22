'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AdminTeamPortal } from '@/components/admin/admin-team-portal';
import { AdminBackground, AdminPageHeader, AdminCard, glassInteractive } from '@/components/admin/ui';

export default function AdminTeamPage() {
  return (
    <AdminBackground>
      <AdminPageHeader title="Admin Team Portal" subtitle="View all admin team members, roles, and their tools">
        <Link
          href="/admin/orchestrator"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-yellow-500 hover:bg-white/5 ${glassInteractive}`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Admin
        </Link>
      </AdminPageHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminCard className="overflow-hidden !p-0">
          <AdminTeamPortal />
        </AdminCard>

        {/* Info Box */}
        <AdminCard className="mt-8 !border-yellow-500/20 !bg-yellow-500/5">
          <p className="text-yellow-200/90 text-sm leading-relaxed">
            <strong className="text-yellow-400">💡 Admin Structure:</strong> Your platform has three specialized admin roles:
            <strong className="block mt-2 text-slate-100">
              👑 Orchestrator (Ramone)
            </strong>
            - System overview, tier management, platform analytics
            <strong className="block mt-2 text-slate-100">
              🏦 Co-Founder - Head Compliance Officer (Wesley)
            </strong>
            - Business vetting, user management, compliance verification
            <strong className="block mt-2 text-slate-100">
              ⚖️ Legal Officer
            </strong>
            - Audit logs, compliance tracking, regulatory adherence
          </p>
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
