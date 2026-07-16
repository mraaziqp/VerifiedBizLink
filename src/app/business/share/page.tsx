'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Share2, Copy, Mail, MessageCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BusinessSharePage() {
  const [copied, setCopied] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.business) {
          setBusinessId(data.business.id);
          setCompanyName(data.business.company_name || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profileUrl =
    businessId && typeof window !== 'undefined' ? `${window.location.origin}/business/${businessId}` : '';
  const shareText = `Check out ${companyName || 'my business'} on VerifiedBizLink`;

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
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !businessId ? (
              <p className="text-sm text-gray-500">Create your business profile first to get a shareable link.</p>
            ) : (
              <>
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
                    <a href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}: ${profileUrl}`)}`}>
                      <Button variant="outline" className="w-full gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareText}: ${profileUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full gap-2">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>

                {/* QR Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">QR Code</label>
                  <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`}
                      alt="QR code linking to your public business profile"
                      width={128}
                      height={128}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
