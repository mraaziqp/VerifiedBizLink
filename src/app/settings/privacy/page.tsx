'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, ChevronLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { GlassBackground } from '@/components/shared/glass-ui';

export default function PrivacySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'verified_only',
    showInSearch: true,
    allowMessages: true,
    shareAnalytics: false,
    marketingConsent: false,
  });

  useEffect(() => {
    fetch('/api/users/privacy-settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.settings) setPrivacySettings(data.settings); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/users/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: privacySettings }),
      });

      if (response.ok) {
        alert('Privacy settings updated!');
      } else {
        alert('Failed to save settings');
      }
    } catch {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <GlassBackground>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/settings" className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy & Data</h1>
              <p className="text-gray-500">Control your data and visibility</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Profile Visibility */}
          <div className="rounded-xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Visibility</h2>
            <div className="space-y-3">
              {[
                { value: 'public', label: 'Everyone', desc: 'Your profile is public' },
                { value: 'verified_only', label: 'Verified Users Only', desc: 'Only verified businesses can see your profile' },
                { value: 'connections', label: 'Connections Only', desc: 'Only your connections can see your profile' },
                { value: 'private', label: 'Private', desc: 'No one can see your profile except admins' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 p-4 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-100">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={privacySettings.profileVisibility === option.value}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Search & Discovery */}
          <div className="rounded-xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Search & Discovery</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Appear in search results</p>
                  <p className="text-sm text-gray-500">Your profile can be found via search</p>
                </div>
                <button
                  onClick={() => setPrivacySettings({ ...privacySettings, showInSearch: !privacySettings.showInSearch })}
                  className={`w-12 h-6 rounded-full transition-colors ${privacySettings.showInSearch ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacySettings.showInSearch ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </label>

              <label className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Allow direct messages</p>
                  <p className="text-sm text-gray-500">Users can message you directly</p>
                </div>
                <button
                  onClick={() => setPrivacySettings({ ...privacySettings, allowMessages: !privacySettings.allowMessages })}
                  className={`w-12 h-6 rounded-full transition-colors ${privacySettings.allowMessages ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacySettings.allowMessages ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          </div>

          {/* Data & Analytics */}
          <div className="rounded-xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Data & Analytics</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Share usage analytics</p>
                  <p className="text-sm text-gray-500">Help us improve by sharing anonymized usage data</p>
                </div>
                <button
                  onClick={() => setPrivacySettings({ ...privacySettings, shareAnalytics: !privacySettings.shareAnalytics })}
                  className={`w-12 h-6 rounded-full transition-colors ${privacySettings.shareAnalytics ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacySettings.shareAnalytics ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </label>

              <label className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Marketing communications</p>
                  <p className="text-sm text-gray-500">Receive emails about new features and offers</p>
                </div>
                <button
                  onClick={() => setPrivacySettings({ ...privacySettings, marketingConsent: !privacySettings.marketingConsent })}
                  className={`w-12 h-6 rounded-full transition-colors ${privacySettings.marketingConsent ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacySettings.marketingConsent ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          </div>

          {/* POPIA Compliance */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 mb-1">POPIA Compliance</p>
                <p className="text-sm text-amber-700">
                  Your data is protected under South Africa&apos;s Protection of Personal Information Act (POPIA). We never sell your data to third parties.
                  <Link href="/privacy" className="ml-1 underline hover:no-underline">
                    Read our privacy policy
                  </Link>
                </p>
              </div>
            </div>
          </div>

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
                  Save Settings
                </>
              )}
            </button>
            <Link href="/settings" className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </GlassBackground>
  );
}
