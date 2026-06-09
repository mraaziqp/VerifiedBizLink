'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Settings,
  Shield,
  BarChart3,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Search,
} from 'lucide-react';

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'banker' | 'lawyer';
  status: 'active' | 'inactive';
  joinedDate: string;
  mainTools: string[];
  lastActive: string;
}

const ADMIN_TEAM: AdminMember[] = [
  {
    id: 'admin-001',
    name: 'Ramoen (Lead Admin)',
    email: 'ramoen@verifiedbizlink.co.za',
    role: 'admin',
    status: 'active',
    joinedDate: '2026-01-15',
    mainTools: ['Overview', 'Tier Management', 'Analytics'],
    lastActive: '2 minutes ago',
  },
  {
    id: 'banker-001',
    name: 'Wesley (Banking Specialist)',
    email: 'wesley@verifiedbizlink.co.za',
    role: 'banker',
    status: 'active',
    joinedDate: '2026-02-01',
    mainTools: ['Vetting Desk', 'User Management', 'Compliance Analytics'],
    lastActive: '15 minutes ago',
  },
  {
    id: 'lawyer-001',
    name: 'Legal Officer',
    email: 'legal@verifiedbizlink.co.za',
    role: 'lawyer',
    status: 'active',
    joinedDate: '2026-01-20',
    mainTools: ['Audit Logs', 'Compliance Tracker', 'User Management'],
    lastActive: '1 hour ago',
  },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  admin: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '👑' },
  banker: { bg: 'bg-green-500/10', text: 'text-green-400', icon: '🏦' },
  lawyer: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: '⚖️' },
};

export function AdminTeamPortal() {
  const [selectedMember, setSelectedMember] = useState<AdminMember>(ADMIN_TEAM[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeam = ADMIN_TEAM.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColor = ROLE_COLORS[selectedMember.role];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Team List */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Admin Team
          </h3>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Team Members List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTeam.map((member) => {
              const memberColor = ROLE_COLORS[member.role];
              const isSelected = selectedMember.id === member.id;

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{memberColor.icon}</span>
                        <p className="font-semibold text-white truncate">
                          {member.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-2">
                        {member.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${memberColor.bg} ${memberColor.text}`}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                        {member.status === 'active' ? (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            Inactive
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Member Details */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{roleColor.icon}</span>
                  <h2 className="text-3xl font-bold text-white">
                    {selectedMember.name}
                  </h2>
                </div>
                <p className="text-gray-400 mb-3">{selectedMember.email}</p>
              </div>
              <div className="text-right">
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold ${roleColor.bg} ${roleColor.text}`}
                >
                  {selectedMember.role.charAt(0).toUpperCase() +
                    selectedMember.role.slice(1)}
                </div>
              </div>
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {selectedMember.status === 'active' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-green-400">Active</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-gray-500">Inactive</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Last Active</p>
                <p className="font-semibold text-white">
                  {selectedMember.lastActive}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Joined</p>
                <p className="font-semibold text-white">
                  {new Date(selectedMember.joinedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Main Tools */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Main Tools & Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedMember.mainTools.map((tool, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${roleColor.bg} border-gray-700 hover:border-gray-600 transition-colors cursor-pointer group`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${roleColor.text}`}>
                        {tool}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {tool === 'Overview' &&
                          'System overview and key metrics'}
                        {tool === 'Tier Management' &&
                          'Manage subscription tiers'}
                        {tool === 'Analytics' && 'Platform analytics and reports'}
                        {tool === 'Vetting Desk' &&
                          'Business verification workflow'}
                        {tool === 'User Management' &&
                          'Manage user accounts and roles'}
                        {tool === 'Compliance Analytics' &&
                          'Compliance metrics and tracking'}
                        {tool === 'Audit Logs' && 'Activity and change logs'}
                        {tool === 'Compliance Tracker' &&
                          'Regulatory compliance status'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Description */}
          <div className={`rounded-lg p-6 ${roleColor.bg} border border-gray-700`}>
            <h4 className={`font-bold ${roleColor.text} mb-2`}>Role Overview</h4>
            <p className="text-gray-300 text-sm">
              {selectedMember.role === 'admin' &&
                'Lead administrator responsible for system overview, tier management, and platform analytics. Full access to all administrative tools and user management systems.'}
              {selectedMember.role === 'banker' &&
                'Banking specialist focused on business verification and user management. Primary responsibility for vetting workflow and compliance analytics to ensure accurate business data.'}
              {selectedMember.role === 'lawyer' &&
                'Legal officer handling audit logs, compliance tracking, and regulatory adherence. Ensures all platform activities comply with South African legal requirements.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
