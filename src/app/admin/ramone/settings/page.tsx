'use client';

import { ArrowLeft, Settings, Bell, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RamoneSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-gray-400" />
            Admin Preferences
          </h1>
          <p className="text-gray-400 mt-2">Configure your vetting tools and notification settings</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Notification Settings */}
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'New documents to review', enabled: true },
                { label: 'Document rejected feedback', enabled: true },
                { label: 'Daily summary report', enabled: false },
                { label: 'Weekly performance stats', enabled: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                  <span className="text-gray-300">{item.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked={item.enabled}
                    className="w-4 h-4 rounded"
                  />
                </div>
              ))}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Default View</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                  <option>Vetting Desk (Tabbed)</option>
                  <option>Document Queue</option>
                  <option>Business List</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Items Per Page</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                  <option>10 items</option>
                  <option>20 items</option>
                  <option>50 items</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                <span className="text-gray-300">Dark Mode</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                Save Display Settings
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-900 rounded">
                <p className="text-gray-400 text-sm mb-2">Email</p>
                <p className="text-white font-medium">ramone@verifiedbizlink.co.za</p>
              </div>
              <Button variant="outline" className="w-full border-gray-700">
                Change Password
              </Button>
              <Button variant="outline" className="w-full border-gray-700">
                Enable Two-Factor Authentication
              </Button>
              <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded">
                <p className="text-blue-300 text-sm">
                  ✓ Two-factor authentication is enabled on your account for extra security.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Settings */}
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle>Vetting Tool Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Auto-save Documents</label>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Show Document Preview</label>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Enable Keyboard Shortcuts</label>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                Save Tool Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
