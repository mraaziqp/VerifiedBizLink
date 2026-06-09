'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, Save, Loader2 } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailVerification: true,
    connectionRequests: true,
    vettingUpdates: true,
    paymentReceipts: true,
    weeklyDigest: false,
    complianceAlerts: true,
    systemUpdates: true,
    marketingEmails: false,
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPreferences }),
      });

      if (response.ok) {
        alert('Notification preferences updated!');
      }
    } catch (error) {
      alert('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = (key: keyof typeof notificationPreferences) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const NOTIFICATION_GROUPS = [
    {
      title: 'Account & Verification',
      items: [
        { key: 'emailVerification', label: 'Email verification codes', desc: 'When you need to verify your email' },
        { key: 'vettingUpdates', label: 'Business vetting updates', desc: 'When your verification status changes' },
      ],
    },
    {
      title: 'Interactions & Social',
      items: [
        { key: 'connectionRequests', label: 'Connection requests', desc: 'When someone wants to connect' },
        { key: 'paymentReceipts', label: 'Payment receipts', desc: 'Confirmation of transactions' },
      ],
    },
    {
      title: 'Platform & Compliance',
      items: [
        { key: 'complianceAlerts', label: 'Compliance alerts', desc: 'Important regulatory updates' },
        { key: 'systemUpdates', label: 'System updates', desc: 'Maintenance and feature announcements' },
      ],
    },
    {
      title: 'Marketing & Promotions',
      items: [
        { key: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary of your activity' },
        { key: 'marketingEmails', label: 'Marketing emails', desc: 'Special offers and promotions' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/settings" className="mb-4 flex items-center gap-2 text-gray-400 hover:text-gray-200">
            <ChevronLeft className="w-5 h-5" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Notification Preferences</h1>
              <p className="text-gray-400">Control how we contact you</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {NOTIFICATION_GROUPS.map((group) => (
            <div key={group.title} className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-6">{group.title}</h2>
              <div className="space-y-4">
                {group.items.map((item) => {
                  const key = item.key as keyof typeof notificationPreferences;
                  return (
                  <div key={item.key} className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => togglePreference(key)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationPreferences[key]
                          ? 'bg-blue-600'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          notificationPreferences[key]
                            ? 'translate-x-6'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
                })}
              </div>
            </div>
          ))}

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </button>
            <Link href="/settings" className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 hover:bg-gray-800">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
