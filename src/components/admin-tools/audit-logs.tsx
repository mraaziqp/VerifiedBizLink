'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Edit2, Trash2, Lock, Filter, Search } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  status: 'success' | 'failed';
  details: string;
  ipAddress: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Simulate audit logs data
    const mockLogs: AuditEntry[] = [
      {
        id: '1',
        timestamp: '2026-06-09 18:45:23',
        user: 'ramone@verifiedbizlink.co.za',
        action: 'post_deleted',
        resource: 'Post',
        resourceId: 'post_12345',
        status: 'success',
        details: 'User deleted business post about expansion',
        ipAddress: '197.85.23.45',
      },
      {
        id: '2',
        timestamp: '2026-06-09 18:42:15',
        user: 'wesley@verifiedbizlink.co.za',
        action: 'verification_approved',
        resource: 'Business',
        resourceId: 'biz_98765',
        status: 'success',
        details: 'Approved ABC Consulting for verification',
        ipAddress: '197.85.23.46',
      },
      {
        id: '3',
        timestamp: '2026-06-09 18:39:47',
        user: 'legal@verifiedbizlink.co.za',
        action: 'settings_updated',
        resource: 'Settings',
        resourceId: 'settings_001',
        status: 'success',
        details: 'Updated compliance settings',
        ipAddress: '197.85.23.47',
      },
      {
        id: '4',
        timestamp: '2026-06-09 18:35:12',
        user: 'mraaziq@gmail.com',
        action: 'user_login',
        resource: 'User',
        resourceId: 'user_54321',
        status: 'success',
        details: 'CEO login to admin dashboard',
        ipAddress: '197.85.23.48',
      },
      {
        id: '5',
        timestamp: '2026-06-09 18:30:05',
        user: 'ramone@verifiedbizlink.co.za',
        action: 'comment_updated',
        resource: 'Comment',
        resourceId: 'comment_67890',
        status: 'success',
        details: 'Updated comment on verification request',
        ipAddress: '197.85.23.45',
      },
      {
        id: '6',
        timestamp: '2026-06-09 18:25:33',
        user: 'wesley@verifiedbizlink.co.za',
        action: 'post_created',
        resource: 'Post',
        resourceId: 'post_11111',
        status: 'failed',
        details: 'Failed to create post - content too long',
        ipAddress: '197.85.23.46',
      },
    ];
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((log) => log.status === filterStatus);
    }

    setFilteredLogs(filtered);
  }, [searchTerm, filterAction, filterStatus, logs]);

  const actions = ['all', ...new Set(logs.map((l) => l.action))];
  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <Trash2 className="w-4 h-4 text-red-400" />;
    if (action.includes('update') || action.includes('edit')) return <Edit2 className="w-4 h-4 text-blue-400" />;
    if (action.includes('login')) return <Lock className="w-4 h-4 text-purple-400" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <p className="text-gray-400 text-sm mb-2">Total Entries</p>
          <p className="text-4xl font-bold text-white">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
          <p className="text-gray-400 text-sm mb-2">Successful Actions</p>
          <p className="text-4xl font-bold text-green-400">
            {logs.filter((l) => l.status === 'success').length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {(
              (logs.filter((l) => l.status === 'success').length / logs.length) *
              100
            ).toFixed(0)}
            % success rate
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-gray-400 text-sm mb-2">Failed Actions</p>
          <p className="text-4xl font-bold text-red-400">
            {logs.filter((l) => l.status === 'failed').length}
          </p>
          <p className="text-xs text-gray-500 mt-2">Requires review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
          >
            {actions.map((action) => (
              <option key={action} value={action}>
                {action === 'all' ? 'All Actions' : action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700 bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{log.user}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-gray-300">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs">
                      {log.resource} ({log.resourceId})
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {log.status === 'success' ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Success
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        Failed
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-500">
          Showing {filteredLogs.length} of {logs.length} entries
        </div>
      </div>
    </div>
  );
}
