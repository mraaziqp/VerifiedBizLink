'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { RoleBasedDashboard } from '@/components/admin/role-based-dashboard';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'banker' | 'lawyer' | 'ceo'>('admin');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Determine user role based on email
    let role: 'admin' | 'banker' | 'lawyer' | 'ceo' = 'ceo'; // Default to CEO for super users

    const email = user.email?.toLowerCase() || '';

    if (email.includes('ramoen')) {
      role = 'admin'; // Orchestrator
    } else if (email.includes('wesley')) {
      role = 'banker'; // Banking Specialist
    } else if (email.includes('legal')) {
      role = 'lawyer'; // Legal Officer
    } else if (email.includes('mraaziq')) {
      role = 'ceo'; // CEO/Founder
    }

    setUserRole(role);
    setIsLoading(false);
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Personalized tools and access for your role
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <RoleBasedDashboard role={userRole} />
      </div>
    </div>
  );
}
