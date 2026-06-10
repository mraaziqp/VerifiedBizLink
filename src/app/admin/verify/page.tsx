'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, FileText, Users, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

interface AdminUser {
  name: string;
  email: string;
  role: 'admin' | 'banker' | 'other';
  tools: string[];
}

const ADMIN_USERS: AdminUser[] = [
  {
    name: 'Ramoen (Lead Admin)',
    email: 'ramoen@verifiedbizlink.co.za',
    role: 'admin',
    tools: [
      'Business Verification',
      'Vetting Queue',
      'User Management',
      'Platform Analytics',
      'Network Status',
      'Settings',
    ],
  },
  {
    name: 'Wesley (Banking Specialist)',
    email: 'wesley@verifiedbizlink.co.za',
    role: 'banker',
    tools: ['Business Vetting Portal', 'Legal Compliance', 'Team Management'],
  },
  {
    name: 'You (Current User)',
    email: 'mraaziqp@gmail.com',
    role: 'other',
    tools: ['Full Access - Super Admin'],
  },
];

export default function AdminVerificationPortal() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'banker' | 'other'>('other');

  if (!user) {
    return null;
  }

  const currentUserEmail = user.email?.toLowerCase() || '';
  const currentUser = ADMIN_USERS.find((u) => u.email.toLowerCase().includes(currentUserEmail.split('@')[0])) || ADMIN_USERS[2];
  const isRamoen = currentUserEmail.includes('ramoen') || user.fullName?.toLowerCase().includes('ramoen');
  const isWesley = currentUserEmail.includes('wesley') || user.fullName?.toLowerCase().includes('wesley');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-white">🔐 Admin Access Verification</h1>
          <p className="text-gray-400 mt-2">Check admin roles and access permissions</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Current User Info */}
        <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border-blue-700/50 mb-8">
          <CardHeader>
            <h2 className="text-2xl font-bold text-blue-200">Current Logged In User</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Full Name</p>
                <p className="text-white text-lg font-semibold">{user.fullName || 'Not Set'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white text-lg font-mono">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Current Role</p>
                <p className={`text-lg font-semibold ${isRamoen ? 'text-green-400' : isWesley ? 'text-blue-400' : 'text-yellow-400'}`}>
                  {isRamoen ? '👑 Admin' : isWesley ? '🏦 Banker' : '⭐ Super Admin (You)'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Access Level</p>
                <p className={`text-lg font-semibold ${isRamoen ? 'text-green-400' : isWesley ? 'text-blue-400' : 'text-green-400'}`}>
                  {isRamoen ? 'Full Admin Access' : isWesley ? 'Banking Access' : 'Super Admin (All Tools)'}
                </p>
              </div>
            </div>

            {/* Quick Access Buttons */}
            <div className="flex gap-2 pt-4">
              <Link href="/admin/dashboard">
                <Button className="bg-green-600 hover:bg-green-700">
                  Go to Admin Dashboard
                </Button>
              </Link>
              <Link href="/admin/orchestrator">
                <Button variant="outline" className="border-yellow-500/30 text-yellow-400">
                  Go to Orchestrator
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to App</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Admin Users Comparison */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">📋 Admin Team Structure</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ADMIN_USERS.map((adminUser, idx) => {
              const isCurrentUser = adminUser.role === currentUser.role;
              const isAdmin = adminUser.role === 'admin';
              const isBanker = adminUser.role === 'banker';

              return (
                <Card
                  key={idx}
                  className={`border-2 transition-all ${
                    isCurrentUser
                      ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/30 border-blue-500'
                      : isBanker
                      ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50'
                      : isAdmin
                      ? 'bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/50'
                      : 'bg-gray-800/40 border-gray-700'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{adminUser.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{adminUser.email}</p>
                      </div>
                      {isCurrentUser && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-purple-400' : isBanker ? 'bg-green-400' : 'bg-blue-400'}`} />
                      <span className={`text-sm font-semibold ${isAdmin ? 'text-purple-300' : isBanker ? 'text-green-300' : 'text-blue-300'}`}>
                        {isAdmin ? '👑 Admin' : isBanker ? '🏦 Banker' : '⭐ Super Admin'}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold mb-3">Access Tools:</p>
                      <ul className="space-y-2">
                        {adminUser.tools.map((tool, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                            {tool}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Access */}
                    {isCurrentUser && (
                      <div className="pt-4 border-t border-gray-700">
                        <Link href="/admin/dashboard">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            Access Your Dashboard
                          </Button>
                        </Link>
                      </div>
                    )}

                    {isAdmin && !isCurrentUser && (
                      <div className="pt-4 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">To test as Ramoen:</p>
                        <div className="bg-gray-900/50 p-2 rounded text-xs font-mono text-gray-300">
                          {adminUser.email}
                        </div>
                      </div>
                    )}

                    {isBanker && !isCurrentUser && (
                      <div className="pt-4 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">To test as Wesley:</p>
                        <div className="bg-gray-900/50 p-2 rounded text-xs font-mono text-gray-300">
                          {adminUser.email}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Access Matrix */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">🔐 Access Control Matrix</h2>

          <Card className="bg-gray-800/40 border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tool / Feature</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Ramoen (Admin)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Wesley (Banker)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tool: 'Business Verification', ramoen: true, wesley: false, customer: false },
                    { tool: 'Vetting Queue', ramoen: true, wesley: true, customer: false },
                    { tool: 'User Management', ramoen: true, wesley: false, customer: false },
                    { tool: 'Platform Analytics', ramoen: true, wesley: false, customer: false },
                    { tool: 'Network Status', ramoen: true, wesley: false, customer: false },
                    { tool: 'Settings', ramoen: true, wesley: false, customer: false },
                    { tool: 'Legal Compliance', ramoen: true, wesley: true, customer: false },
                    { tool: 'Team Management', ramoen: true, wesley: true, customer: false },
                    { tool: 'Dashboard', ramoen: true, wesley: true, customer: false },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 text-sm text-white font-medium">{row.tool}</td>
                      <td className="px-4 py-3 text-center">
                        {row.ramoen ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.wesley ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.customer ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Troubleshooting */}
        <Card className="mt-12 bg-yellow-900/20 border-yellow-700/50">
          <CardHeader>
            <h3 className="text-lg font-bold text-yellow-300">⚠️ Troubleshooting</h3>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <p>
              <strong>Getting "Access Denied"?</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Make sure you're logged in with the correct email (ramoen@ or wesley@)</li>
              <li>Check that your full name includes "Ramoen" or "Wesley"</li>
              <li>Try clearing browser cache and logging in again</li>
              <li>Super admin (you) should always have full access</li>
            </ul>

            <p className="pt-4">
              <strong>Want to test as Ramoen or Wesley?</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Create test accounts with their emails</li>
              <li>Log in with those credentials</li>
              <li>You'll see their specific dashboards and tools</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
