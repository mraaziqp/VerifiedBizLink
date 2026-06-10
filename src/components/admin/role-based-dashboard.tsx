'use client';

import React, { useState } from 'react';
import {
  Activity,
  Network,
  ShieldCheck,
  BookOpen,
  Users,
  BarChart3,
  Zap,
  Lock,
  TrendingUp,
  AlertCircle,
  X,
} from 'lucide-react';
import { TrafficMonitoring } from '@/components/admin-tools/traffic-monitoring';
import { NetworkStatus } from '@/components/admin-tools/network-status';
import { AuditLogs } from '@/components/admin-tools/audit-logs';
import { ComplianceTracker } from '@/components/admin-tools/compliance-tracker';
import { VettingPortal } from '@/components/admin-tools/vetting-portal';

interface DashboardTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  component?: React.ReactNode;
}

interface RoleConfig {
  name: string;
  title: string;
  tools: DashboardTool[];
  emoji: string;
}

export function RoleBasedDashboard({ role }: { role: 'admin' | 'banker' | 'lawyer' | 'ceo' }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Tools available to each role
  const roleConfigs: Record<string, RoleConfig> = {
    admin: {
      name: 'Orchestrator',
      title: 'System Overview & Verification',
      emoji: '👑',
      tools: [
        {
          id: 'verification',
          name: 'Business Verification',
          description: 'Manage business verification workflow and vetting status',
          icon: <ShieldCheck className="w-6 h-6" />,
          color: 'from-blue-500 to-cyan-500',
        },
        {
          id: 'traffic',
          name: 'Traffic Monitoring',
          description: 'Real-time platform traffic and user activity analytics',
          icon: <Activity className="w-6 h-6" />,
          color: 'from-green-500 to-emerald-500',
          component: <TrafficMonitoring />,
        },
        {
          id: 'network',
          name: 'Network Status',
          description: 'Monitor server health, API performance, and system uptime',
          icon: <Network className="w-6 h-6" />,
          color: 'from-purple-500 to-pink-500',
          component: <NetworkStatus />,
        },
        {
          id: 'analytics',
          name: 'Platform Analytics',
          description: 'Comprehensive analytics and business intelligence',
          icon: <BarChart3 className="w-6 h-6" />,
          color: 'from-orange-500 to-red-500',
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-indigo-500 to-blue-500',
        },
      ],
    },
    banker: {
      name: 'Banking Specialist',
      title: 'Compliance & Team Management',
      emoji: '🏦',
      tools: [
        {
          id: 'compliance',
          name: 'Legal Compliance',
          description: 'Track regulatory compliance and legal adherence',
          icon: <BookOpen className="w-6 h-6" />,
          color: 'from-blue-500 to-indigo-500',
          component: <ComplianceTracker />,
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-green-500 to-teal-500',
        },
        {
          id: 'vetting',
          name: 'Business Vetting',
          description: 'Review and process business verification requests',
          icon: <ShieldCheck className="w-6 h-6" />,
          color: 'from-yellow-500 to-orange-500',
          component: <VettingPortal />,
        },
      ],
    },
    lawyer: {
      name: 'Legal Officer',
      title: 'Audit & Compliance',
      emoji: '⚖️',
      tools: [
        {
          id: 'audit',
          name: 'Audit Logs',
          description: 'View all platform activities and changes',
          icon: <AlertCircle className="w-6 h-6" />,
          color: 'from-red-500 to-pink-500',
          component: <AuditLogs />,
        },
        {
          id: 'compliance',
          name: 'Compliance Tracker',
          description: 'Monitor regulatory compliance status',
          icon: <Lock className="w-6 h-6" />,
          color: 'from-purple-500 to-indigo-500',
          component: <ComplianceTracker />,
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-cyan-500 to-blue-500',
        },
      ],
    },
    ceo: {
      name: 'CEO/Founder',
      title: 'Traffic & Operations Management',
      emoji: '👔',
      tools: [
        {
          id: 'traffic',
          name: 'Traffic Monitoring',
          description: 'Real-time platform traffic and user metrics',
          icon: <Activity className="w-6 h-6" />,
          color: 'from-green-500 to-emerald-500',
          component: <TrafficMonitoring />,
        },
        {
          id: 'network',
          name: 'Network Monitoring',
          description: 'Monitor infrastructure health and performance',
          icon: <Network className="w-6 h-6" />,
          color: 'from-blue-500 to-purple-500',
          component: <NetworkStatus />,
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage all admin team members',
          icon: <Users className="w-6 h-6" />,
          color: 'from-orange-500 to-red-500',
        },
      ],
    },
  };

  const config = roleConfigs[role] || roleConfigs.admin;

  return (
    <div className="space-y-6">
      {/* Role Header */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{config.emoji}</div>
          <div>
            <h2 className="text-3xl font-bold text-white">{config.name}</h2>
            <p className="text-gray-400">{config.title}</p>
          </div>
        </div>
        <div className="flex gap-4 pt-4 border-t border-gray-700">
          <div>
            <p className="text-sm text-gray-400">Tools Available</p>
            <p className="text-2xl font-bold text-blue-400">{config.tools.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Status</p>
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Your Tools & Permissions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveSection(tool.id)}
              className={`group rounded-xl border border-gray-700 bg-gradient-to-br ${tool.color} opacity-25 hover:opacity-40 transition-all p-6 text-left hover:border-gray-500 shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${tool.color} text-white`}>
                  {tool.icon}
                </div>
                <TrendingUp className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              </div>
              <h4 className="font-semibold text-white mb-2">{tool.name}</h4>
              <p className="text-sm text-gray-400">{tool.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  Click to access →
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Section Content */}
      {activeSection && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">
              {config.tools.find((t) => t.id === activeSection)?.name}
            </h3>
            <button
              onClick={() => setActiveSection(null)}
              className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tool Content */}
          <div>
            {config.tools.find((t) => t.id === activeSection)?.component}
          </div>
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <p className="text-amber-200 text-sm">
          <strong>💡 Your Role Permissions:</strong> You have access to{' '}
          <strong>{config.tools.length} specialized tools</strong> designed for your role as a{' '}
          <strong>{config.name}</strong>. Each tool provides the specific functionality needed for
          your responsibilities on the platform.
        </p>
      </div>
    </div>
  );
}
