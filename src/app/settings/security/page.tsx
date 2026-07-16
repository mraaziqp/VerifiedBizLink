'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, ChevronLeft, Save, Loader2, Check, ShieldCheck, X, Monitor } from 'lucide-react';

interface UserSession {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2fa, setLoading2fa] = useState(true);
  const [setupStep, setSetupStep] = useState<'idle' | 'scan' | 'confirm' | 'backup-codes' | 'disable'>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const loadSessions = () => {
    return fetch('/api/auth/sessions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.sessions) setSessions(data.sessions); })
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => {
    fetch('/api/auth/2fa/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setTwoFactorEnabled(data.enabled); })
      .catch(() => {})
      .finally(() => setLoading2fa(false));
    loadSessions();
  }, []);

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

  const startTwoFactorSetup = async () => {
    setTwoFaBusy(true);
    setTwoFaError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setQrCodeUrl(data.qrCodeUrl);
        setSetupStep('scan');
      } else {
        setTwoFaError(data.error || 'Failed to start setup');
      }
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTwoFactorSetup = async () => {
    setTwoFaBusy(true);
    setTwoFaError('');
    try {
      const res = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: setupCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes);
        setSetupStep('backup-codes');
        setTwoFactorEnabled(true);
        setSetupCode('');
      } else {
        setTwoFaError(data.error || 'Invalid code');
      }
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFaBusy(true);
    setTwoFaError('');
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(false);
        setSetupStep('idle');
        setDisablePassword('');
      } else {
        setTwoFaError(data.error || 'Failed to disable');
      }
    } finally {
      setTwoFaBusy(false);
    }
  };

  const revokeSession = async (id: string) => {
    await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
    loadSessions();
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
              <p className="text-gray-400">Manage your password, two-factor authentication, and active sessions</p>
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
                <p className="text-gray-400 text-sm mt-1">Require a code from an authenticator app when signing in</p>
              </div>
              {!loading2fa && setupStep === 'idle' && (
                twoFactorEnabled ? (
                  <button
                    onClick={() => setSetupStep('disable')}
                    className="px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-400 border border-red-500/30"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={startTwoFactorSetup}
                    disabled={twoFaBusy}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 disabled:opacity-50"
                  >
                    {twoFaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable'}
                  </button>
                )
              )}
            </div>

            {twoFaError && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-400 p-3 text-sm">{twoFaError}</div>
            )}

            {setupStep === 'idle' && !twoFactorEnabled && (
              <p className="text-gray-400 text-sm">
                Enable 2FA to require a code from your phone when logging in. This significantly improves your account security.
              </p>
            )}

            {setupStep === 'idle' && twoFactorEnabled && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400">
                <p className="text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Two-factor authentication is enabled
                </p>
              </div>
            )}

            {setupStep === 'scan' && (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.):</p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="2FA setup QR code" width={200} height={200} className="rounded-lg border border-gray-700" />
                </div>
                <label className="block text-sm font-medium text-gray-300">Then enter the 6-digit code it shows:</label>
                <input
                  inputMode="numeric"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white text-center text-xl tracking-widest focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={confirmTwoFactorSetup}
                    disabled={twoFaBusy || setupCode.length < 6}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {twoFaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirm & Enable
                  </button>
                  <button
                    onClick={() => { setSetupStep('idle'); setSetupCode(''); setTwoFaError(''); }}
                    className="rounded-lg border border-gray-600 px-4 py-3 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {setupStep === 'backup-codes' && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Two-factor authentication is now enabled.
                </div>
                <p className="text-gray-300 text-sm">
                  Save these one-time backup codes somewhere safe — each can be used once to sign in if you lose access to your authenticator app. They won&apos;t be shown again.
                </p>
                <div className="grid grid-cols-2 gap-2 bg-gray-800 rounded-lg p-4 font-mono text-sm text-white">
                  {backupCodes.map((code) => <div key={code}>{code}</div>)}
                </div>
                <button
                  onClick={() => setSetupStep('idle')}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  I&apos;ve saved these codes
                </button>
              </div>
            )}

            {setupStep === 'disable' && (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">Enter your password to disable two-factor authentication.</p>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={disableTwoFactor}
                    disabled={twoFaBusy || !disablePassword}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {twoFaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Disable 2FA
                  </button>
                  <button
                    onClick={() => { setSetupStep('idle'); setDisablePassword(''); setTwoFaError(''); }}
                    className="rounded-lg border border-gray-600 px-4 py-3 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4">Active Sessions</h2>
            {loadingSessions ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-400">No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                    <div className="flex items-start gap-3">
                      <Monitor className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">
                          {s.user_agent ? s.user_agent.slice(0, 60) : 'Unknown device'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {s.ip_address ? `${s.ip_address} • ` : ''}
                          Last active {new Date(s.last_seen_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {s.isCurrent ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full shrink-0">Current</span>
                    ) : (
                      <button
                        onClick={() => revokeSession(s.id)}
                        className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full shrink-0 hover:bg-red-500/30"
                      >
                        Sign out
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
