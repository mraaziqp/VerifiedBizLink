'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { GlassBackground } from '@/components/shared/glass-ui';

export default function BusinessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessData, setBusinessData] = useState({
    companyName: '',
    industry: '',
    description: '',
    website: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/business/profile', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const biz = data?.business;
        if (biz) {
          setBusinessData({
            companyName: biz.company_name || '',
            industry: biz.industry || '',
            description: biz.description || '',
            website: biz.website || '',
            phone: biz.phone || '',
            address: biz.address || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load business data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: businessData.companyName,
          industry: businessData.industry,
          description: businessData.description,
          website: businessData.website,
          phone: businessData.phone,
          address: businessData.address,
        }),
      });

      if (response.ok) {
        alert('Business information updated successfully!');
      } else {
        alert('Failed to save business information');
      }
    } catch (error) {
      alert('Failed to save business information');
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
            <Building2 className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Information</h1>
              <p className="text-gray-500">Manage your company details and verification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={businessData.companyName}
                onChange={(e) => setBusinessData({ ...businessData, companyName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Your company name"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Industry
              </label>
              <select
                value={businessData.industry}
                onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select an industry</option>
                <option value="Finance">Finance & Banking</option>
                <option value="Technology">Technology</option>
                <option value="Legal">Legal Services</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Company Description
              </label>
              <textarea
                value={businessData.description}
                onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Tell us about your business..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={businessData.website}
                  onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="+27 (0) xxx xxx xxx"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={businessData.address}
                onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Street address"
              />
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
