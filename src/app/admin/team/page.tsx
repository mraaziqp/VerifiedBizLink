'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { AdminTeamPortal } from '@/components/admin/admin-team-portal';

export default function AdminTeamPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-40 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/admin/orchestrator"
            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Team Portal</h1>
              <p className="text-gray-400 text-sm mt-1">
                View all admin team members, roles, and their tools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminTeamPortal />

        {/* Info Box */}
        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <p className="text-amber-200 text-sm">
            <strong>💡 Admin Structure:</strong> Your platform has three specialized admin roles:
            <strong className="block mt-2">
              👑 Orchestrator (Ramone)
            </strong>
            - System overview, tier management, platform analytics
            <strong className="block mt-2">
              🏦 Banker/Specialist (Wesley)
            </strong>
            - Business vetting, user management, compliance verification
            <strong className="block mt-2">
              ⚖️ Legal Officer
            </strong>
            - Audit logs, compliance tracking, regulatory adherence
          </p>
        </div>
      </div>
    </div>
  );
}
