'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, ChevronLeft, Save, Loader2, Check, AlertCircle } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setMessage('Enter your current and new password');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        setMessage('✅ Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error || 'Failed to change password'}`);
      }
    } catch (error) {
      setMessage('❌ Error changing password');
    } finally {
      setIsSaving(false);
    }
  };

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
            <Lock className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Security Settings</h1>
              <p className="text-gray-400">Manage your password and two-factor authentication</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Change Password */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>

            {message && (
              <div className={`mb-6 rounded-lg p-4 ${message.includes('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter a new password"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Confirm your new password"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={isSaving}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-gray-400 text-sm mt-1">Add an extra layer of security to your account</p>
              </div>
              <button
                onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  twoFAEnabled
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {twoFAEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            {!twoFAEnabled && (
              <p className="text-gray-400 text-sm">
                Enable 2FA to require a code from your phone when logging in. This significantly improves your account security.
              </p>
            )}
            {twoFAEnabled && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400">
                <p className="text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Two-factor authentication is enabled
                </p>
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4">Active Sessions</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                <div>
                  <p className="font-medium text-white">This Device</p>
                  <p className="text-sm text-gray-400">Last active: Just now</p>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">Current</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
