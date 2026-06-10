'use client';

import { CheckCircle2, Clock, AlertCircle, Users, TrendingUp, FileText } from 'lucide-react';

interface VettingRequest {
  id: string;
  businessName: string;
  owner: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  submittedDate: string;
  daysWaiting: number;
  score: number;
}

const MOCK_VETTING_REQUESTS: VettingRequest[] = [
  {
    id: '1',
    businessName: 'Tech Solutions (Pty) Ltd',
    owner: 'John Smith',
    status: 'pending',
    submittedDate: '2026-06-08',
    daysWaiting: 2,
    score: 0,
  },
  {
    id: '2',
    businessName: 'Global Imports CC',
    owner: 'Sarah Johnson',
    status: 'in-review',
    submittedDate: '2026-06-07',
    daysWaiting: 3,
    score: 75,
  },
  {
    id: '3',
    businessName: 'Digital Marketing Pro',
    owner: 'Michael Chen',
    status: 'in-review',
    submittedDate: '2026-06-05',
    daysWaiting: 5,
    score: 82,
  },
  {
    id: '4',
    businessName: 'Construction Plus',
    owner: 'James Wilson',
    status: 'pending',
    submittedDate: '2026-06-09',
    daysWaiting: 1,
    score: 0,
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'in-review':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'approved':
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'rejected':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'in-review':
      return <AlertCircle className="h-4 w-4" />;
    case 'approved':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'rejected':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export function VettingPortal() {
  const pendingCount = MOCK_VETTING_REQUESTS.filter(r => r.status === 'pending').length;
  const inReviewCount = MOCK_VETTING_REQUESTS.filter(r => r.status === 'in-review').length;
  const totalWaiting = MOCK_VETTING_REQUESTS.reduce((sum, r) => sum + r.daysWaiting, 0);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-400/70 text-sm">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400/50" />
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400/70 text-sm">In Review</p>
              <p className="text-3xl font-bold text-blue-400">{inReviewCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-400/50" />
          </div>
        </div>

        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400/70 text-sm">Total Days Waiting</p>
              <p className="text-3xl font-bold text-purple-400">{totalWaiting}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400/50" />
          </div>
        </div>
      </div>

      {/* Vetting Requests Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          Remaining Vetting Queue
        </h3>

        <div className="space-y-2">
          {MOCK_VETTING_REQUESTS.map((request) => (
            <div
              key={request.id}
              className="border border-gray-700 rounded-lg bg-gray-900/50 p-4 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base font-semibold text-white">{request.businessName}</h4>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Owner: {request.owner}</span>
                    <span>Submitted: {request.submittedDate}</span>
                    <span className="text-yellow-400">⏱️ {request.daysWaiting} days waiting</span>
                  </div>
                </div>

                <div className="text-right">
                  {request.score > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Vetting Score</p>
                      <p className="text-2xl font-bold text-cyan-400">{request.score}%</p>
                    </div>
                  )}
                  {request.status === 'pending' && (
                    <button className="mt-2 px-4 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs font-medium transition-colors">
                      Start Review
                    </button>
                  )}
                  {request.status === 'in-review' && (
                    <button className="mt-2 px-4 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors">
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <p className="text-cyan-400 text-sm">
          <strong>📋 Vetting Queue:</strong> You have <strong>{pendingCount} pending</strong> and <strong>{inReviewCount} in-review</strong> vetting requests.
          The average wait time is <strong>{(totalWaiting / MOCK_VETTING_REQUESTS.length).toFixed(1)} days</strong>.
        </p>
      </div>
    </div>
  );
}
