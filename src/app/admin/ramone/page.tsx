'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, CheckCircle2, Clock, AlertCircle, TrendingUp, BarChart3,
  Settings, ArrowRight, Zap, Users, Shield, Download, LogOut
} from 'lucide-react';
import Link from 'next/link';

interface AdminTool {
  id: string;
  name: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge?: string;
  isNew?: boolean;
}

export default function RamoneAdminPanel() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const userEmail = user.email?.toLowerCase() || '';
      const isRamone = userEmail.includes('ramone');

      if (!isRamone) {
        router.push('/admin/dashboard');
      }
      setLoading(false);
    }
  }, [user, router]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // Ramone's comprehensive admin tools
  const vettingTools: AdminTool[] = [
    {
      id: 'vetting-desk',
      name: 'Business Vetting Desk',
      description: 'Review and grade business documents with real-time trust score calculation',
      icon: FileText,
      href: '/admin/vetting',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Primary Tool',
      isNew: false,
    },
    {
      id: 'document-review',
      name: 'Document Review Queue',
      description: 'View pending documents, grade, approve or reject with detailed feedback',
      icon: CheckCircle2,
      href: '/admin/ramone/documents',
      color: 'from-green-500 to-emerald-500',
      badge: 'In Queue',
      isNew: true,
    },
    {
      id: 'pending-businesses',
      name: 'Pending Verifications',
      description: 'See all businesses awaiting verification and manage their status',
      icon: Clock,
      href: '/admin/ramone/pending',
      color: 'from-yellow-500 to-orange-500',
      badge: '12 Pending',
      isNew: true,
    },
    {
      id: 'verified-list',
      name: 'Verified Businesses',
      description: 'View all verified businesses with their trust scores and certificates',
      icon: Shield,
      href: '/admin/ramone/verified',
      color: 'from-purple-500 to-pink-500',
      badge: '847 Verified',
      isNew: true,
    },
  ];

  const analyticsTools: AdminTool[] = [
    {
      id: 'vetting-stats',
      name: 'Vetting Statistics',
      description: 'Real-time dashboard of verification metrics and trends',
      icon: BarChart3,
      href: '/admin/ramone/stats',
      color: 'from-indigo-500 to-blue-500',
      badge: 'Real-time',
      isNew: true,
    },
    {
      id: 'performance',
      name: 'Your Performance',
      description: 'Track your verifications, average processing time, and quality metrics',
      icon: TrendingUp,
      href: '/admin/ramone/performance',
      color: 'from-pink-500 to-rose-500',
      badge: 'Personal',
      isNew: true,
    },
    {
      id: 'audit-trail',
      name: 'Audit Trail',
      description: 'Complete log of all your actions and decisions for compliance',
      icon: AlertCircle,
      href: '/admin/ramone/audit',
      color: 'from-red-500 to-orange-500',
      badge: 'Compliant',
      isNew: true,
    },
  ];

  const utilityTools: AdminTool[] = [
    {
      id: 'settings',
      name: 'Preferences',
      description: 'Manage your admin preferences and notification settings',
      icon: Settings,
      href: '/admin/ramone/settings',
      color: 'from-gray-600 to-gray-700',
    },
    {
      id: 'reports',
      name: 'Generate Reports',
      description: 'Export verification reports and statistics for analysis',
      icon: Download,
      href: '/admin/ramone/reports',
      color: 'from-teal-500 to-cyan-500',
      isNew: true,
    },
  ];

  const allTools = [...vettingTools, ...analyticsTools, ...utilityTools];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-green-400" />
                <h1 className="text-4xl font-bold text-white">👑 Ramone's Vetting Command Center</h1>
              </div>
              <p className="text-gray-400">Complete business verification and vetting management workspace</p>
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
                <p className="text-gray-400 text-sm">Vetting Administrator</p>
                <p className="text-white text-lg font-semibold">{user.fullName || user.email}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Status: <span className="font-semibold text-green-400">✓ Active</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white font-mono text-sm">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Pending Verifications</p>
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400 mt-2">12</p>
              <p className="text-xs text-gray-500 mt-2">Awaiting your review</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">This Month</p>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400 mt-2">247</p>
              <p className="text-xs text-gray-500 mt-2">Verifications completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg Quality</p>
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-400 mt-2">98.7%</p>
              <p className="text-xs text-gray-500 mt-2">Approval rate</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg Time</p>
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-400 mt-2">2.3h</p>
              <p className="text-xs text-gray-500 mt-2">Per verification</p>
            </CardContent>
          </Card>
        </div>

        {/* Vetting Tools Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            <FileText className="inline h-6 w-6 mr-2" />
            Business Vetting Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vettingTools.map((tool) => {
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
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            tool.isNew ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
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
                        Open <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Analytics & Reports Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            <BarChart3 className="inline h-6 w-6 mr-2" />
            Analytics & Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analyticsTools.map((tool) => {
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
                          <span className="text-xs font-semibold px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
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
                        View <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Utilities Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            <Settings className="inline h-6 w-6 mr-2" />
            Utilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {utilityTools.map((tool) => {
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
                          <span className="text-xs font-semibold px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
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
                        Access <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
