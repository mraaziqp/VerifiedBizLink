'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VettingDeskPro } from '@/components/admin/vetting-desk-pro';

export default function VettingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-3">
        <Link href="/admin" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
      </div>

      <div className="p-6">
        <VettingDeskPro />
      </div>
    </div>
  );
}
