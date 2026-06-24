'use client';

import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  business: string;
  decision: 'approved' | 'rejected' | 'updated';
  timestamp: string;
  notes: string;
}

export default function RamoneAuditPage() {
  const auditLogs: AuditLog[] = [
    {
      id: '1',
      action: 'Graded document: Business Registration',
      business: 'NextGen Solutions',
      decision: 'approved',
      timestamp: '2026-06-24 14:32',
      notes: 'All documents verified and approved',
    },
    {
      id: '2',
      action: 'Updated business status to VERIFIED',
      business: 'Arctic Logistics',
      decision: 'approved',
      timestamp: '2026-06-24 13:15',
      notes: 'Complete verification with high trust score',
    },
    {
      id: '3',
      action: 'Graded document: Tax Clearance',
      business: 'Thorne Capital',
      decision: 'rejected',
      timestamp: '2026-06-24 11:48',
      notes: 'Document expired, request renewal',
    },
    {
      id: '4',
      action: 'Updated review notes',
      business: 'Quantum Cyber',
      decision: 'updated',
      timestamp: '2026-06-24 10:20',
      notes: 'Awaiting additional documentation',
    },
    {
      id: '5',
      action: 'Graded document: CIPC Registration',
      business: 'Fox Logistics',
      decision: 'approved',
      timestamp: '2026-06-23 15:45',
      notes: 'Valid and current registration',
    },
  ];

  const getIcon = (decision: string) => {
    switch (decision) {
      case 'approved': return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-400" />;
      case 'updated': return <Edit2 className="h-5 w-5 text-blue-400" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            Audit Trail
          </h1>
          <p className="text-gray-400 mt-2">Complete log of all your actions and decisions for compliance</p>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4 mb-6">
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
            <option>All Actions</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Updated</option>
          </select>
          <input
            type="date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
          <Button variant="outline" className="border-gray-700">Search</Button>
        </div>

        {/* Audit Logs */}
        <div className="space-y-3">
          {auditLogs.map(log => (
            <Card key={log.id} className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getIcon(log.decision)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{log.action}</h3>
                        <p className="text-sm text-gray-400">{log.business}</p>
                      </div>
                      <span className="text-xs text-gray-500">{log.timestamp}</span>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-gray-400 mt-2 p-2 bg-gray-900 rounded">
                        {log.notes}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      log.decision === 'approved' ? 'bg-green-500/20 text-green-300' :
                      log.decision === 'rejected' ? 'bg-red-500/20 text-red-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {log.decision.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="bg-gray-800/40 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900 rounded">
                <p className="text-gray-400 text-sm mb-2">Total Actions Logged</p>
                <p className="text-2xl font-bold text-white">4,287</p>
              </div>
              <div className="p-4 bg-gray-900 rounded">
                <p className="text-gray-400 text-sm mb-2">Last 30 Days</p>
                <p className="text-2xl font-bold text-white">847</p>
              </div>
              <div className="p-4 bg-gray-900 rounded">
                <p className="text-gray-400 text-sm mb-2">Compliance Status</p>
                <p className="text-2xl font-bold text-green-400">100%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
