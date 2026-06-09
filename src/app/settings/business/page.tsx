'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ChevronLeft, Save, Loader2 } from 'lucide-react';

export default function BusinessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessData, setBusinessData] = useState({
    companyName: '',
    registrationNumber: '',
    industry: '',
    description: '',
    website: '',
    phone: '',
    address: '',
    employees: '',
  });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        setBusinessData({
          companyName: user.company_name || '',
          registrationNumber: user.registration_number || '',
          industry: user.industry || '',
          description: user.company_description || '',
          website: user.website || '',
          phone: user.phone || '',
          address: user.address || '',
          employees: user.employees || '',
        });
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
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...businessData }),
      });

      if (response.ok) {
        alert('Business information updated successfully!');
      }
    } catch (error) {
      alert('Failed to save business information');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

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
            <Building2 className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Business Information</h1>
              <p className="text-gray-400">Manage your company details and verification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={businessData.companyName}
                  onChange={(e) => setBusinessData({ ...businessData, companyName: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Your company name"
                />
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={businessData.registrationNumber}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  placeholder="CIPC Registration"
                  disabled
                />
                <p className="mt-2 text-sm text-gray-500">Auto-filled from verification</p>
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Industry
              </label>
              <select
                value={businessData.industry}
                onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Description
              </label>
              <textarea
                value={businessData.description}
                onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Tell us about your business..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={businessData.website}
                  onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="+27 (0) xxx xxx xxx"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={businessData.address}
                onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Street address"
              />
            </div>

            {/* Employees */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Employees
              </label>
              <select
                value={businessData.employees}
                onChange={(e) => setBusinessData({ ...businessData, employees: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-100">51-100</option>
                <option value="100-500">100-500</option>
                <option value="500+">500+</option>
              </select>
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
              <Link href="/settings" className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 hover:bg-gray-800">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
