'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, CheckCircle, Users, BarChart3, Settings, Shield, FileText, Zap } from 'lucide-react';
import Link from 'next/link';

interface AdminTool {
  id: string;
  name: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // Determine if user is admin or banker
  const isAdmin = user.email?.toLowerCase().includes('ramoen');
  const isBanker = user.email?.toLowerCase().includes('wesley');
  const isAuthorized = isAdmin || isBanker;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-800/50 border-red-500/50">
          <CardContent className="p-8">
            <p className="text-red-400">Access Denied. This page is for admins only.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin tools for Ramoen (CEO/Admin)
  const adminTools: AdminTool[] = isAdmin ? [
    {
      id: 'business-verification',
      name: 'Business Verification',
      description: 'Verify and approve businesses, manage CIPC & SARS status',
      icon: CheckCircle,
      href: '/admin/business-verification',
      color: 'from-green-500 to-emerald-500',
      badge: 'Pending: 12',
    },
    {
      id: 'vetting-queue',
      name: 'Vetting Queue',
      description: 'Manage business vetting requests and approvals',
      icon: FileText,
      href: '/vetting',
      color: 'from-blue-500 to-cyan-500',
      badge: 'In Review: 8',
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Manage all users, roles, permissions, and access',
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-500 to-pink-500',
      badge: '12.4K Users',
    },
    {
      id: 'platform-analytics',
      name: 'Platform Analytics',
      description: 'View platform metrics, traffic, and performance data',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'from-orange-500 to-yellow-500',
      badge: 'Real-time',
    },
    {
      id: 'network-monitoring',
      name: 'Network Status',
      description: 'Monitor system health, uptime, and performance',
      icon: Zap,
      href: '/admin/network',
      color: 'from-red-500 to-rose-500',
      badge: '99.8%',
    },
    {
      id: 'admin-settings',
      name: 'Settings',
      description: 'Configure platform settings and admin preferences',
      icon: Settings,
      href: '/admin/settings',
      color: 'from-gray-600 to-gray-700',
    },
  ] : [];

  // Banking tools for Wesley (Banker)
  const bankingTools: AdminTool[] = isBanker ? [
    {
      id: 'business-vetting',
      name: 'Business Vetting Portal',
      description: 'Review and approve business vetting requests',
      icon: Shield,
      href: '/vetting',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Pending: 8',
    },
    {
      id: 'compliance',
      name: 'Legal Compliance',
      description: 'Monitor compliance status and regulatory requirements',
      icon: FileText,
      href: '/admin/compliance',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'user-management',
      name: 'Team Management',
      description: 'Manage team members and their permissions',
      icon: Users,
      href: '/admin/team',
      color: 'from-purple-500 to-pink-500',
    },
  ] : [];

  const tools = isAdmin ? adminTools : bankingTools;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white">
                {isAdmin ? '👑 Admin Control Center' : '🏦 Banking Portal'}
              </h1>
              <p className="text-gray-400 mt-2">
                {isAdmin
                  ? 'Manage platform, businesses, and verification'
                  : 'Review and approve business vetting requests'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/orchestrator">
                <Button variant="outline" className="border-yellow-500/30 text-yellow-400">
                  Orchestrator
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="border-gray-500/30">
                  Back to App
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* User Info Card */}
        <Card className="bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Logged in as</p>
                <p className="text-white text-lg font-semibold">{user.fullName || user.email}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Role: <span className="text-blue-400 font-semibold">{isAdmin ? 'Admin' : 'Banker'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white font-mono text-sm">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tools Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {isAdmin ? 'Admin Tools' : 'Banking Tools'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.id} href={tool.href}>
                  <Card className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-gray-900 cursor-pointer group h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        {tool.badge && (
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-gray-200">
                          {tool.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-2">{tool.description}</p>
                      </div>
                      <div className="flex items-center text-primary text-sm font-semibold pt-2">
                        Open Tool <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        {isAdmin && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Pending Verifications</p>
                <p className="text-3xl font-bold text-green-400 mt-2">12</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Total Businesses</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">833</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-purple-400 mt-2">12.4K</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">System Health</p>
                <p className="text-3xl font-bold text-green-400 mt-2">99.8%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isBanker && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Pending Reviews</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">8</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Approved This Month</p>
                <p className="text-3xl font-bold text-green-400 mt-2">24</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700">
              <CardContent className="p-6">
                <p className="text-gray-400 text-sm">Compliance Status</p>
                <p className="text-3xl font-bold text-green-400 mt-2">100%</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
