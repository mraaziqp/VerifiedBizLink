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
} from 'lucide-react';

interface DashboardTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
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
          action: () => setActiveSection('verification'),
        },
        {
          id: 'traffic',
          name: 'Traffic Monitoring',
          description: 'Real-time platform traffic and user activity analytics',
          icon: <Activity className="w-6 h-6" />,
          color: 'from-green-500 to-emerald-500',
          action: () => setActiveSection('traffic'),
        },
        {
          id: 'network',
          name: 'Network Status',
          description: 'Monitor server health, API performance, and system uptime',
          icon: <Network className="w-6 h-6" />,
          color: 'from-purple-500 to-pink-500',
          action: () => setActiveSection('network'),
        },
        {
          id: 'analytics',
          name: 'Platform Analytics',
          description: 'Comprehensive analytics and business intelligence',
          icon: <BarChart3 className="w-6 h-6" />,
          color: 'from-orange-500 to-red-500',
          action: () => setActiveSection('analytics'),
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-indigo-500 to-blue-500',
          action: () => setActiveSection('team'),
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
          action: () => setActiveSection('compliance'),
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-green-500 to-teal-500',
          action: () => setActiveSection('team'),
        },
        {
          id: 'vetting',
          name: 'Business Vetting',
          description: 'Review and process business verification requests',
          icon: <ShieldCheck className="w-6 h-6" />,
          color: 'from-yellow-500 to-orange-500',
          action: () => setActiveSection('vetting'),
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
          action: () => setActiveSection('audit'),
        },
        {
          id: 'compliance',
          name: 'Compliance Tracker',
          description: 'Monitor regulatory compliance status',
          icon: <Lock className="w-6 h-6" />,
          color: 'from-purple-500 to-indigo-500',
          action: () => setActiveSection('compliance'),
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage admin team members and permissions',
          icon: <Users className="w-6 h-6" />,
          color: 'from-cyan-500 to-blue-500',
          action: () => setActiveSection('team'),
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
          action: () => setActiveSection('traffic'),
        },
        {
          id: 'network',
          name: 'Network Monitoring',
          description: 'Monitor infrastructure health and performance',
          icon: <Network className="w-6 h-6" />,
          color: 'from-blue-500 to-purple-500',
          action: () => setActiveSection('network'),
        },
        {
          id: 'team',
          name: 'Team Management',
          description: 'Manage all admin team members',
          icon: <Users className="w-6 h-6" />,
          color: 'from-orange-500 to-red-500',
          action: () => setActiveSection('team'),
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
              onClick={tool.action}
              className={`group rounded-xl border border-gray-700 bg-gradient-to-br ${tool.color} opacity-10 hover:opacity-20 transition-all p-6 text-left hover:border-gray-600`}
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
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Tool Content Placeholder */}
          <div className="min-h-96 rounded-lg border border-gray-700 bg-gray-800/30 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-gray-400 text-lg">
                {config.tools.find((t) => t.id === activeSection)?.name} Tool
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {config.tools.find((t) => t.id === activeSection)?.description}
              </p>
              <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-blue-400 text-sm">
                  ✓ This tool is fully accessible to your role
                </p>
              </div>
            </div>
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
