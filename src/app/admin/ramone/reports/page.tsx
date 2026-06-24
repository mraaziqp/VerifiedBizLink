'use client';

import { ArrowLeft, Download, BarChart3, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  frequency: string;
  generated: string;
}

export default function RamoneReportsPage() {
  const reports: Report[] = [
    {
      id: '1',
      name: 'Monthly Verification Report',
      description: 'Complete summary of all verifications and rejections for the month',
      type: 'PDF',
      frequency: 'Monthly',
      generated: '2026-06-24',
    },
    {
      id: '2',
      name: 'Quality Metrics Report',
      description: 'In-depth analysis of accuracy, approval rates, and quality standards',
      type: 'Excel',
      frequency: 'Weekly',
      generated: '2026-06-24',
    },
    {
      id: '3',
      name: 'Industry Breakdown Report',
      description: 'Detailed breakdown of verifications by business industry',
      type: 'PDF',
      frequency: 'Monthly',
      generated: '2026-06-01',
    },
    {
      id: '4',
      name: 'Performance Analysis Report',
      description: 'Your personal performance metrics and improvement areas',
      type: 'Excel',
      frequency: 'Monthly',
      generated: '2026-06-01',
    },
    {
      id: '5',
      name: 'Audit Trail Export',
      description: 'Complete log of all your actions for compliance purposes',
      type: 'CSV',
      frequency: 'On-demand',
      generated: 'Now',
    },
    {
      id: '6',
      name: 'Rejection Analysis Report',
      description: 'Analyze rejection patterns and feedback for continuous improvement',
      type: 'PDF',
      frequency: 'Weekly',
      generated: '2026-06-23',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-teal-400" />
            Generate Reports
          </h1>
          <p className="text-gray-400 mt-2">Export verification data and performance metrics</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-blue-900/20 border-blue-500/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">Generate Custom Report</h3>
                  <p className="text-gray-400 text-sm mt-1">Create a report with custom date range and filters</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Create Report</Button>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-500/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">Schedule Reports</h3>
                  <p className="text-gray-400 text-sm mt-1">Set up automatic report generation and delivery</p>
                </div>
                <Calendar className="h-8 w-8 text-green-400" />
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700">Configure Schedule</Button>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reports.map(report => (
              <Card key={report.id} className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <FileText className="h-6 w-6 text-gray-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-white">{report.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{report.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                    <div className="p-2 bg-gray-900 rounded">
                      <p className="text-gray-400">Type</p>
                      <p className="text-white font-medium">{report.type}</p>
                    </div>
                    <div className="p-2 bg-gray-900 rounded">
                      <p className="text-gray-400">Frequency</p>
                      <p className="text-white font-medium">{report.frequency}</p>
                    </div>
                    <div className="p-2 bg-gray-900 rounded">
                      <p className="text-gray-400">Last Gen</p>
                      <p className="text-white font-medium text-xs">{report.generated}</p>
                    </div>
                  </div>

                  <Button className="w-full bg-gray-700 hover:bg-gray-600 gap-2">
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Export Settings */}
        <Card className="bg-gray-800/40 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Default Export Format</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">Include in all reports</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-300">Audit trail</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-300">Business details</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-gray-300">Personal performance notes</span>
                </label>
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
              Save Export Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
