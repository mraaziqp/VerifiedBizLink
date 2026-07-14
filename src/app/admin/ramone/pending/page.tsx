'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2, ArrowLeft, MapPin, Phone, Globe, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Business {
  id: string;
  company_name: string;
  industry: string;
  address: string;
  phone?: string;
  website?: string;
  trust_score: number;
  status: string;
  submitted_at: string;
  owner_name: string;
  owner_email: string;
  doc_count: number;
  reg_number: string;
  vat_number: string;
}

export default function RamonePendingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingBusinesses();
  }, []);

  const fetchPendingBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/businesses?status=pending');
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (businessId: string) => {
    setApprovingId(businessId);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' }),
      });
      if (res.ok) {
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
      }
    } catch (error) {
      console.error('Failed to approve business:', error);
    } finally {
      setApprovingId(null);
    }
  };

  const filteredBusinesses = businesses.filter(b =>
    b.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link href="/admin/ramone" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Back to Command Center
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-400" />
            Pending Verifications
          </h1>
          <p className="text-gray-400 mt-2">Businesses awaiting your review and approval</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by company name or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Businesses Grid */}
        {filteredBusinesses.length === 0 ? (
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">All caught up! No pending verifications.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBusinesses.map(business => (
              <Card key={business.id} className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white">{business.company_name}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">Owner: {business.owner_name}</p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300">
                      {business.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Business Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Industry</p>
                      <p className="text-white font-medium">{business.industry}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Documents</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {business.doc_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">CIPC #</p>
                      <p className="text-white font-mono text-sm">{business.reg_number || 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">VAT #</p>
                      <p className="text-white font-mono text-sm">{business.vat_number || 'Pending'}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    {business.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="text-gray-300">{business.address}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a href={`tel:${business.phone}`} className="text-blue-400 hover:underline">
                          {business.phone}
                        </a>
                      </div>
                    )}
                    {business.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Submit Date */}
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    Submitted: {new Date(business.submitted_at).toLocaleDateString()} at {new Date(business.submitted_at).toLocaleTimeString()}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link href={`/admin/vetting?business=${business.id}`}>
                      <Button variant="outline" className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                        Review Documents
                      </Button>
                    </Link>
                    <Button
                      className="bg-green-600 hover:bg-green-700 w-full"
                      onClick={() => handleApprove(business.id)}
                      disabled={approvingId === business.id}
                    >
                      {approvingId === business.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
