'use client';

import { CheckCircle2, Shield, Award, TrendingUp } from 'lucide-react';

export function VerificationHero() {
  return (
    <div className="mb-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 md:p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full blur-lg opacity-50" />
          <div className="relative bg-gradient-to-br from-green-400 to-emerald-600 rounded-full p-2">
            <CheckCircle2 className="h-8 w-8 text-white" fill="currentColor" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold text-green-900 mb-2">
            Verified Business Platform
          </h2>
          <p className="text-green-700 text-sm md:text-base">
            All businesses verified through official CIPC and SARS channels. Trade with confidence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-900">Verified</p>
            <p className="text-sm text-green-700">CIPC & SARS</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <Award className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-900">Trusted</p>
            <p className="text-sm text-green-700">Official Records</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-900">Growing</p>
            <p className="text-sm text-green-700">Active Connections</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-900">Secure</p>
            <p className="text-sm text-green-700">Encrypted Data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
