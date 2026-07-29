'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { GlassBackground } from '@/components/shared/glass-ui';

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    bio: '',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const user = await response.json();
        setProfileData({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          location: user.location || '',
          headline: user.headline || '',
          bio: user.bio || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileData.fullName,
          phone: profileData.phone,
          location: profileData.location,
          headline: profileData.headline,
          bio: profileData.bio,
        }),
      });

      if (response.ok) {
        alert('Profile updated successfully!');
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || 'Failed to save profile');
      }
    } catch (error) {
      alert('Failed to save profile');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <GlassBackground>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/settings" className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-500">Update your personal information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-2 text-sm text-gray-500">This is your login email and can't be changed here.</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="+27 (0) xxx xxx xxx"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Location
              </label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="City, Province"
              />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Professional Headline
              </label>
              <input
                type="text"
                value={profileData.headline}
                onChange={(e) => setProfileData({ ...profileData, headline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Business Director"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Tell us about yourself..."
              />
              <p className="mt-2 text-sm text-gray-500">Max 500 characters</p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-6">
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
                    Save Changes
                  </>
                )}
              </button>
              <Link href="/settings" className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-100">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </GlassBackground>
  );
}
