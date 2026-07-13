'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VettingDeskPro } from '@/components/admin/vetting-desk-pro';
import { AdminBackground, AdminPageHeader, AdminCard, glassInteractive } from '@/components/admin/ui';

export default function VettingPage() {
  return (
    <AdminBackground>
      <AdminPageHeader title="Vetting Desk" subtitle="Review and grade business verification documents">
        <Link
          href="/admin"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-yellow-500 hover:bg-white/5 ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <AdminCard className="overflow-hidden !p-0">
          <VettingDeskPro />
        </AdminCard>
      </div>
    </AdminBackground>
  );
}
