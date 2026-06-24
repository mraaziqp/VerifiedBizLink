'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3, Building2, FileText, ImageIcon, TrendingUp, Users,
  Settings, LogOut, Plus, Edit2, Eye, Share2, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Business {
  id: string;
  company_name: string;
  description: string;
  industry: string;
  status: 'pending' | 'reviewing' | 'verified' | 'rejected';
  trust_score: number;
  avatar_url: string;
  website: string;
  phone: string;
  address: string;
  doc_count: number;
  verified_at?: string;
}

interface BusinessStats {
  views: number;
  contacts: number;
  reviews: number;
  verified: boolean;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function BusinessDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'business') {
      router.push('/dashboard');
    } else {
      fetchBusinessData();
    }
  }, [user, router]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/business/profile');
      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setStats(data.stats);
      } else {
        setError('Failed to load business data');
      }
    } catch (error) {
      console.error('Error fetching business:', error);
      setError('Error loading your business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 font-medium">Loading your business dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">{error}</h2>
              <p className="text-gray-600">Please try again or contact support.</p>
              <Button onClick={() => router.push('/')} className="w-full">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.company_name}</h1>
                <p className="text-sm text-gray-600">Business Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Verification Status Alert */}
        {business.status !== 'verified' && (
          <Card className={`mb-6 border-l-4 ${
            business.status === 'pending' ? 'border-yellow-500 bg-yellow-50' :
            business.status === 'reviewing' ? 'border-blue-500 bg-blue-50' :
            'border-red-500 bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {business.status === 'pending' ? 'Pending Verification' :
                     business.status === 'reviewing' ? 'Under Review' :
                     'Verification Rejected'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {business.status === 'pending' ? 'Your business is waiting for initial review. Please complete your profile.' :
                     business.status === 'reviewing' ? 'Your documents are being reviewed by our team. This usually takes 3-5 business days.' :
                     'Your verification was not approved. Please review and resubmit documents.'}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[business.status]}>
                  {business.status.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Profile Views</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.views || 0}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Contact Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.contacts || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.reviews || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Trust Score</p>
                  <p className="text-3xl font-bold text-gray-900">{business.trust_score}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/business/profile">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Edit2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="outline">15 min</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Edit Profile</h3>
                <p className="text-sm text-gray-600">Update your business information and contact details</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/business/gallery">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge variant="outline">{business.doc_count} items</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Image Gallery</h3>
                <p className="text-sm text-gray-600">Manage your business photos and images</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/business/documents">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge variant="outline">{business.doc_count} docs</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
                <p className="text-sm text-gray-600">Upload and manage verification documents</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/business/analytics">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <Badge variant="outline">Analytics</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
                <p className="text-sm text-gray-600">View detailed performance and engagement metrics</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/business/share">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-pink-600" />
                  </div>
                  <Badge variant="outline">Share</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Share Profile</h3>
                <p className="text-sm text-gray-600">Share your business profile with others</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/business/settings">
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-gray-600" />
                  </div>
                  <Badge variant="outline">Settings</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Business Settings</h3>
                <p className="text-sm text-gray-600">Configure visibility and notification preferences</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Profile viewed</p>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Contact request received</p>
                  <p className="text-sm text-gray-600">Yesterday at 3:45 PM</p>
                </div>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Profile updated</p>
                  <p className="text-sm text-gray-600">3 days ago</p>
                </div>
                <Edit2 className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
