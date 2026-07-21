'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, ArrowLeft, MapPin, Phone, Globe, Star, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface VerifiedBusiness {
  id: string;
  company_name: string;
  industry: string;
  address: string;
  phone?: string;
  website?: string;
  trust_score: number;
  verified_at: string;
  owner_name: string;
  owner_email: string;
}

export default function RamoneVerifiedPage() {
  const [businesses, setBusinesses] = useState<VerifiedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score-high' | 'score-low'>('newest');

  useEffect(() => {
    fetchVerifiedBusinesses();
  }, []);

  const fetchVerifiedBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/businesses?status=verified');
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

  let filteredBusinesses = businesses.filter(b =>
    b.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredBusinesses.sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime();
      case 'oldest': return new Date(a.verified_at).getTime() - new Date(b.verified_at).getTime();
      case 'score-high': return b.trust_score - a.trust_score;
      case 'score-low': return a.trust_score - b.trust_score;
      default: return 0;
    }
  });

  const handleDownloadReport = () => {
    const header = ['Company Name', 'Industry', 'Trust Score', 'Verified At', 'Owner Name', 'Owner Email', 'Address', 'Phone', 'Website'];
    const rows = filteredBusinesses.map((b) => [
      b.company_name, b.industry, String(b.trust_score), b.verified_at,
      b.owner_name, b.owner_email, b.address || '', b.phone || '', b.website || '',
    ]);
    const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verified-businesses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
            <Shield className="h-8 w-8 text-green-400" />
            Verified Businesses
          </h1>
          <p className="text-gray-400 mt-2">Successfully verified businesses with trust scores</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm">Total Verified</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{filteredBusinesses.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm">Average Trust Score</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">
                {filteredBusinesses.length > 0
                  ? Math.round(filteredBusinesses.reduce((sum, b) => sum + b.trust_score, 0) / filteredBusinesses.length)
                  : 0}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm">Export Data</p>
              <Button onClick={handleDownloadReport} disabled={filteredBusinesses.length === 0} className="mt-2 w-full bg-purple-600 hover:bg-purple-700" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="score-high">Highest Score</option>
            <option value="score-low">Lowest Score</option>
          </select>
        </div>

        {/* Businesses List */}
        {filteredBusinesses.length === 0 ? (
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No verified businesses found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBusinesses.map(business => (
              <Card key={business.id} className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-white text-xl">{business.company_name}</CardTitle>
                    <Badge className="bg-green-500/20 text-green-300">✓ Verified</Badge>
                  </div>
                  <p className="text-sm text-gray-400">Owner: {business.owner_name}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trust Score */}
                  <div className="bg-gray-900 rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Trust Score</span>
                      <span className="text-2xl font-bold text-green-400">{business.trust_score}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${business.trust_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Industry</p>
                      <p className="text-white font-medium">{business.industry}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Verified</p>
                      <p className="text-white font-medium">
                        {new Date(business.verified_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
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

                  {/* View Certificate */}
                  <Link href={`/business/${business.id}`} className="block">
                    <Button variant="outline" className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10">
                      View Certificate & Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
