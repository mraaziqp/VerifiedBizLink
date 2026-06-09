'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: 'compliant' | 'warning' | 'review';
  requirement: string;
  deadline: string;
  lastAudited: string;
  actions: number;
}

export function ComplianceTracker() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const complianceItems: ComplianceItem[] = [
    {
      id: '1',
      title: 'POPIA Compliance',
      description: 'Protection of Personal Information Act',
      status: 'compliant',
      requirement: 'Secure storage and processing of personal data',
      deadline: '2026-12-31',
      lastAudited: '2026-06-01',
      actions: 0,
    },
    {
      id: '2',
      title: 'CIPC Registration',
      description: 'Company registration compliance',
      status: 'compliant',
      requirement: 'All businesses verified against CIPC',
      deadline: 'Ongoing',
      lastAudited: '2026-06-08',
      actions: 0,
    },
    {
      id: '3',
      title: 'SARS Tax Compliance',
      description: 'VAT and tax registration requirements',
      status: 'warning',
      requirement: 'Verify VAT registration for businesses over R1M',
      deadline: '2026-09-30',
      lastAudited: '2026-05-15',
      actions: 3,
    },
    {
      id: '4',
      title: 'B-BBEE Verification',
      description: 'Broad-Based Black Economic Empowerment',
      status: 'compliant',
      requirement: 'Track and validate B-BBEE status',
      deadline: '2026-12-31',
      lastAudited: '2026-06-05',
      actions: 0,
    },
    {
      id: '5',
      title: 'Consumer Protection',
      description: 'Consumer goods sector compliance',
      status: 'review',
      requirement: 'Ensure e-commerce platform compliance',
      deadline: '2026-07-15',
      lastAudited: '2026-04-20',
      actions: 5,
    },
    {
      id: '6',
      title: 'Companies Act Amendment',
      description: 'Disclosure requirements for close corporations',
      status: 'compliant',
      requirement: 'Track enhanced financial disclosure',
      deadline: '2026-12-31',
      lastAudited: '2026-06-01',
      actions: 0,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-400" />;
      case 'review':
        return <Clock className="w-6 h-6 text-orange-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'review':
        return 'border-orange-500/30 bg-orange-500/10';
      default:
        return 'border-gray-700 bg-gray-800/50';
    }
  };

  const complianceCount = complianceItems.filter((item) => item.status === 'compliant').length;
  const warningCount = complianceItems.filter((item) => item.status === 'warning').length;
  const reviewCount = complianceItems.filter((item) => item.status === 'review').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Compliant</h4>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-green-400">{complianceCount}</p>
          <p className="text-xs text-gray-400 mt-2">
            {((complianceCount / complianceItems.length) * 100).toFixed(0)}% of frameworks
          </p>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Warnings</h4>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-4xl font-bold text-yellow-400">{warningCount}</p>
          <p className="text-xs text-gray-400 mt-2">Require attention</p>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Under Review</h4>
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-4xl font-bold text-orange-400">{reviewCount}</p>
          <p className="text-xs text-gray-400 mt-2">In progress</p>
        </div>
      </div>

      {/* Compliance Items */}
      <div className="space-y-3">
        {complianceItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-6 transition-all ${getStatusColor(item.status)}`}
          >
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4 flex-1">
                  {getStatusIcon(item.status)}
                  <div>
                    <h4 className="font-bold text-white text-lg">{item.title}</h4>
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'compliant'
                        ? 'bg-green-500/20 text-green-400'
                        : item.status === 'warning'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    {item.status === 'compliant'
                      ? '✓ Compliant'
                      : item.status === 'warning'
                      ? '⚠ Warning'
                      : '⏱ Review'}
                  </span>
                  {item.actions > 0 && (
                    <div className="mt-2 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                      {item.actions} actions
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Details */}
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-current opacity-70 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1">REQUIREMENT</p>
                    <p className="text-white">{item.requirement}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1">DEADLINE</p>
                      <p className="text-white">{item.deadline}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1">LAST AUDITED</p>
                      <p className="text-white">{item.lastAudited}</p>
                    </div>
                  </div>
                  {item.actions > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-black/30">
                      <p className="text-sm text-red-300">
                        <strong>⚠ {item.actions} action items pending</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Compliance Timeline */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Upcoming Compliance Deadlines
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-orange-500/30">
            <div>
              <p className="font-semibold text-white">Consumer Protection Act Amendment</p>
              <p className="text-sm text-gray-400">Deadline: 2026-07-15</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-orange-400">36 days</p>
              <p className="text-xs text-gray-500">remaining</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-yellow-500/30">
            <div>
              <p className="font-semibold text-white">SARS Tax Compliance Review</p>
              <p className="text-sm text-gray-400">Deadline: 2026-09-30</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-yellow-400">113 days</p>
              <p className="text-xs text-gray-500">remaining</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
