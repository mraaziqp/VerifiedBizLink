'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Share2, Copy, Mail, MessageCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function BusinessSharePage() {
  const [copied, setCopied] = useState(false);
  const profileUrl = typeof window !== 'undefined' ? window.location.origin + '/business/profile' : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Share Your Business Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Share Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <Button onClick={handleCopyLink} className="gap-2">
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Share Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Share Via</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">QR Code</label>
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">QR Code</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
