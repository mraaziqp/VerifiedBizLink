'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, CheckCircle2, Clock, ArrowRight, Shield, LogOut, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { GlassBackground } from '@/components/shared/glass-ui';

interface AdminTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge?: string;
}

interface Stats {
  pendingBusinesses: number;
  verifiedBusinesses: number;
}

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

export default function RamoneAdminPanel() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (user) {
      if (!STAFF_ROLES.includes(user.role)) {
        router.push('/admin/dashboard');
      }
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data?.stats) setStats(data.stats); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <GlassBackground>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </GlassBackground>
    );
  }

  if (!user) {
    return null;
  }

  const vettingTools: AdminTool[] = [
    {
      id: 'vetting-desk',
      name: 'Business Vetting Desk',
      description: 'Review and grade business documents with real-time trust score calculation',
      icon: FileText,
      href: '/admin/vetting',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Primary Tool',
    },
    {
      id: 'document-review',
      name: 'Document Review Queue',
      description: 'View pending documents, grade, approve or reject with detailed feedback',
      icon: CheckCircle2,
      href: '/admin/ramone/documents',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'pending-businesses',
      name: 'Pending Verifications',
      description: 'See all businesses awaiting verification and manage their status',
      icon: Clock,
      href: '/admin/ramone/pending',
      color: 'from-yellow-500 to-orange-500',
      badge: stats ? `${stats.pendingBusinesses} pending` : undefined,
    },
    {
      id: 'verified-list',
      name: 'Verified Businesses',
      description: 'View all verified businesses with their trust scores and certificates',
      icon: Shield,
      href: '/admin/ramone/verified',
      color: 'from-purple-500 to-pink-500',
      badge: stats ? `${stats.verifiedBusinesses} verified` : undefined,
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <GlassBackground>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-green-400" />
                <h1 className="text-4xl font-bold text-gray-900">Vetting Command Center</h1>
              </div>
              <p className="text-gray-500">Business verification and vetting management workspace</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/dashboard">
                <Button variant="outline" className="border-gray-500/30">
                  Admin Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-red-500/30 text-red-400"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* User Info Card */}
        <Card className="bg-gradient-to-r from-green-800/30 to-cyan-800/20 border-green-700/50 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Vetting Administrator</p>
                <p className="text-gray-900 text-lg font-semibold">{user.fullName || user.email}</p>
                <p className="text-gray-500 text-sm mt-1">
                  Status: <span className="font-semibold text-green-600">✓ Active</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm">Email</p>
                <p className="text-gray-900 font-mono text-sm">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vetting Tools Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            <FileText className="inline h-6 w-6 mr-2" />
            Business Vetting Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vettingTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.id} href={tool.href}>
                  <Card className="rounded-2xl bg-white/80 border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg shadow-md cursor-pointer group h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        {tool.badge && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-700">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700">
                          {tool.name}
                        </h3>
                        <p className="text-gray-500 text-sm mt-2">{tool.description}</p>
                      </div>
                      <div className="flex items-center text-primary text-sm font-semibold pt-2">
                        Open <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </GlassBackground>
  );
}
