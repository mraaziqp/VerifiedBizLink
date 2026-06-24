'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3, Building2, FileText, ImageIcon, TrendingUp, Users,
  Settings, LogOut, Plus, Edit2, Eye, Share2, Loader2, AlertCircle,
  Zap, Award, Globe, MessageSquare, Calendar, ArrowRight, CheckCircle2,
  AlertTriangle, DollarSign, Activity, Clock, Star, Sparkles, Target,
  TrendingDown, Lightbulb, CheckSquare, Flame, Radio, Mail,
  BarChart, Filter, Search, Bell
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
  posts?: number;
  ads_active?: number;
  engagement_rate?: number;
  week_views?: number;
  profile_completion?: number;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-900 border-yellow-400',
  reviewing: 'bg-blue-900 border-blue-400',
  verified: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-900 border-red-400',
};

const QUICK_ACTIONS = [
  {
    href: '/business/posts',
    icon: MessageSquare,
    title: 'Write Post',
    description: 'Share updates with customers',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600'
  },
  {
    href: '/business/gallery',
    icon: ImageIcon,
    title: 'Upload Photos',
    description: 'Add images to your gallery',
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600'
  },
  {
    href: '/business/ads',
    icon: Zap,
    title: 'Create Campaign',
    description: 'Launch a new ad campaign',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600'
  }
];

const GROWTH_RECOMMENDATIONS = [
  {
    icon: ImageIcon,
    title: 'Add More Photos',
    description: 'Businesses with 5+ photos get 40% more views',
    action: 'Go to Gallery',
    href: '/business/gallery',
    priority: 'high',
    impact: '+40% views'
  },
  {
    icon: MessageSquare,
    title: 'Post More Regularly',
    description: 'Post 2-3 times per week to stay visible',
    action: 'Go to Posts',
    href: '/business/posts',
    priority: 'high',
    impact: '+25% engagement'
  },
  {
    icon: FileText,
    title: 'Complete Documents',
    description: 'Get verified faster with all documents uploaded',
    action: 'Upload Documents',
    href: '/business/documents',
    priority: 'medium',
    impact: '3-5 days'
  },
  {
    icon: Globe,
    title: 'Add Website Link',
    description: 'Businesses with websites get 60% more clicks',
    action: 'Edit Profile',
    href: '/business/profile',
    priority: 'medium',
    impact: '+60% clicks'
  }
];

const PROFILE_COMPLETION_ITEMS = [
  { label: 'Company Name', completed: true, weight: 15 },
  { label: 'Description', completed: true, weight: 15 },
  { label: 'Contact Info', completed: true, weight: 15 },
  { label: 'Photos (5+)', completed: false, weight: 20 },
  { label: 'Documents', completed: false, weight: 20 },
  { label: 'Website', completed: false, weight: 15 }
];

export default function BusinessDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'tasks'>('overview');
  const [showFilters, setShowFilters] = useState(false);

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
        setStats({
          ...data.stats,
          week_views: Math.floor(data.stats?.views * 0.3) || 0,
          profile_completion: 60
        });
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

  const profileCompletion = PROFILE_COMPLETION_ITEMS.reduce((sum, item) => {
    return sum + (item.completed ? item.weight : 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto" />
          <p className="text-slate-300 font-medium">Loading your business dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-white">{error}</h2>
              <p className="text-slate-400">Please try again or contact support.</p>
              <Button onClick={() => router.push('/')} className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center ring-2 ring-yellow-300">
                  <Building2 className="h-8 w-8 text-slate-900" />
                </div>
                {business.status === 'verified' && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 ring-2 ring-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">{business.company_name}</h1>
                  {business.status === 'verified' && (
                    <Badge className="bg-green-500 text-white border-0">VERIFIED</Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm mt-1">{business.industry || 'Business'} • Profile {profileCompletion}% Complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition text-yellow-400 hover:text-yellow-300 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2 border-slate-600 text-white hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'overview'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'insights'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Lightbulb className="h-4 w-4 inline mr-2" />
              Growth Insights
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'tasks'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CheckSquare className="h-4 w-4 inline mr-2" />
              Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Status Alert */}
            {business.status !== 'verified' && (
              <div className={`mb-6 p-4 rounded-lg border-l-4 flex items-start gap-4 ${
                business.status === 'pending' ? 'bg-yellow-900 border-yellow-400' :
                business.status === 'reviewing' ? 'bg-blue-900 border-blue-400' :
                'bg-red-900 border-red-400'
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {business.status === 'reviewing' ? (
                    <Clock className="h-5 w-5 text-yellow-400" />
                  ) : business.status === 'pending' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {business.status === 'pending' ? '⏳ Complete Your Profile' :
                     business.status === 'reviewing' ? '🔍 Under Review' :
                     '⚠️ Action Required'}
                  </h3>
                  <p className={`text-sm ${
                    business.status === 'pending' ? 'text-yellow-200' :
                    business.status === 'reviewing' ? 'text-blue-200' :
                    'text-red-200'
                  }`}>
                    {business.status === 'pending' ? 'Complete your profile to unlock verified status and get more visibility.' :
                     business.status === 'reviewing' ? 'We\'re reviewing your documents. Typically takes 3-5 business days.' :
                     'Please review and resubmit your application.'}
                  </p>
                </div>
              </div>
            )}

            {/* Profile Completion Progress */}
            <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-400" />
                  Profile Completion: {profileCompletion}%
                </h3>
                {profileCompletion < 100 && (
                  <span className="text-sm text-yellow-400 font-medium">+{100 - profileCompletion}% to full potential</span>
                )}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {PROFILE_COMPLETION_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-500 flex-shrink-0"></div>
                    )}
                    <span className={`text-sm ${item.completed ? 'text-green-400' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Views This Week */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition"></div>
                <Card className="relative bg-slate-800 border-slate-700 hover:border-yellow-400 transition">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">This Week</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-white">{stats?.week_views || 0}</p>
                          <p className="text-green-400 text-sm font-medium mb-1">+15%</p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Total Views */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition"></div>
                <Card className="relative bg-slate-800 border-slate-700 hover:border-yellow-400 transition">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Total Views</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-white">{stats?.views || 0}</p>
                          <p className="text-slate-400 text-xs">lifetime</p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700 rounded-lg">
                        <Eye className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Rate */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition"></div>
                <Card className="relative bg-slate-800 border-slate-700 hover:border-yellow-400 transition">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Engagement</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-white">8.2%</p>
                          <p className="text-green-400 text-sm font-medium mb-1">+2.1%</p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700 rounded-lg">
                        <Flame className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trust Score */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition"></div>
                <Card className="relative bg-slate-800 border-slate-700 hover:border-yellow-400 transition">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Trust Score</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-white">{business.trust_score}%</p>
                          <p className="text-green-400 text-sm font-medium mb-1">Excellent</p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700 rounded-lg">
                        <Award className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div className="group relative h-full">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${action.color} rounded-lg blur opacity-0 group-hover:opacity-50 transition`}></div>
                        <div className="relative bg-slate-800 border border-slate-700 group-hover:border-yellow-400 rounded-lg p-5 cursor-pointer transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className={`inline-block p-2 ${action.textColor} bg-slate-700 rounded-lg mb-3`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <h3 className="font-semibold text-white mb-1">{action.title}</h3>
                              <p className="text-slate-400 text-sm">{action.description}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-yellow-400 transition mt-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* All Features Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Manage Your Business</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/business/posts">
                  <Card className="h-full bg-slate-800 border-slate-700 hover:border-yellow-400 hover:shadow-lg transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-cyan-900 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-cyan-400" />
                        </div>
                        <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700">Popular</Badge>
                      </div>
                      <h3 className="font-semibold text-white mb-2">Posts</h3>
                      <p className="text-slate-400 text-sm">Share updates with your audience</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/gallery">
                  <Card className="h-full bg-slate-800 border-slate-700 hover:border-yellow-400 hover:shadow-lg transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-900 rounded-lg">
                          <ImageIcon className="h-5 w-5 text-purple-400" />
                        </div>
                        <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700">{business.doc_count} images</Badge>
                      </div>
                      <h3 className="font-semibold text-white mb-2">Gallery</h3>
                      <p className="text-slate-400 text-sm">Showcase your business</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/ads">
                  <Card className="h-full bg-slate-800 border-slate-700 hover:border-yellow-400 hover:shadow-lg transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-orange-900 rounded-lg">
                          <Zap className="h-5 w-5 text-orange-400" />
                        </div>
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600">New</Badge>
                      </div>
                      <h3 className="font-semibold text-white mb-2">Ad Campaigns</h3>
                      <p className="text-slate-400 text-sm">Boost your visibility</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/analytics">
                  <Card className="h-full bg-slate-800 border-slate-700 hover:border-yellow-400 hover:shadow-lg transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-yellow-900 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-yellow-400" />
                        </div>
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600">Live</Badge>
                      </div>
                      <h3 className="font-semibold text-white mb-2">Analytics</h3>
                      <p className="text-slate-400 text-sm">Track performance</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Activity Feed */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-yellow-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-700">
                  <div className="flex items-center justify-between p-6 hover:bg-slate-700/50 transition">
                    <div>
                      <p className="font-medium text-white">5 new profile views</p>
                      <p className="text-sm text-slate-400">Today at 2:30 PM</p>
                    </div>
                    <Eye className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex items-center justify-between p-6 hover:bg-slate-700/50 transition">
                    <div>
                      <p className="font-medium text-white">New contact request received</p>
                      <p className="text-sm text-slate-400">Yesterday at 10:15 AM</p>
                    </div>
                    <MessageSquare className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex items-center justify-between p-6 hover:bg-slate-700/50 transition">
                    <div>
                      <p className="font-medium text-white">Your ad campaign got 23 clicks</p>
                      <p className="text-sm text-slate-400">2 days ago</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              Growth Insights & Recommendations
            </h2>

            <div className="grid grid-cols-1 gap-4 mb-8">
              {GROWTH_RECOMMENDATIONS.map((rec, i) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={i}
                    className={`bg-slate-800 border-l-4 rounded-lg p-6 flex items-start justify-between hover:shadow-lg transition ${
                      rec.priority === 'high'
                        ? 'border-orange-400'
                        : 'border-blue-400'
                    }`}
                  >
                    <div className="flex gap-4 flex-1">
                      <div className={`p-3 rounded-lg flex-shrink-0 ${
                        rec.priority === 'high'
                          ? 'bg-orange-900'
                          : 'bg-blue-900'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          rec.priority === 'high'
                            ? 'text-orange-400'
                            : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">{rec.title}</h3>
                        <p className="text-slate-400 text-sm mb-3">{rec.description}</p>
                        <div className="flex items-center gap-4">
                          <Badge className={`${
                            rec.priority === 'high'
                              ? 'bg-orange-900 text-orange-300 border-orange-700'
                              : 'bg-blue-900 text-blue-300 border-blue-700'
                          }`}>
                            Impact: {rec.impact}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Link href={rec.href}>
                      <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 ml-4">
                        {rec.action}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Industry Benchmarks */}
            <Card className="bg-slate-800 border-slate-700 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-yellow-400" />
                  How You Compare to Similar Businesses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Profile Completeness</span>
                      <span className="text-yellow-400">60% (vs 45% average)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Monthly Views</span>
                      <span className="text-yellow-400">342 (vs 280 average)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Engagement Rate</span>
                      <span className="text-yellow-400">8.2% (vs 6.5% average)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Tips */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Smart Tips to Grow Your Business
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-700/50 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-white font-medium mb-1">📸 Add More Photos</p>
                    <p className="text-slate-400 text-sm">Profiles with 5+ photos receive 40% more views. You currently have {business.doc_count}.</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-white font-medium mb-1">📝 Post Consistently</p>
                    <p className="text-slate-400 text-sm">Businesses that post 2-3 times per week see 25% higher engagement and visibility.</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-white font-medium mb-1">💰 Try Ads</p>
                    <p className="text-slate-400 text-sm">Verified businesses with ads get 3x more customer inquiries. Start with as little as R50.</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-white font-medium mb-1">⭐ Get Verified</p>
                    <p className="text-slate-400 text-sm">Verified businesses rank higher and get verified badges. Upload all documents to speed up verification.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-yellow-400" />
              Priority Tasks & Verification Progress
            </h2>

            {/* Verification Checklist */}
            <Card className="bg-slate-800 border-slate-700 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-400" />
                  Get Verified in 3 Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-slate-700/50 rounded-lg border-l-2 border-green-400">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-green-400 mt-1" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Step 1: Complete Profile ✓</h4>
                      <p className="text-slate-400 text-sm">You've filled out your basic information. Great start!</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-slate-700/50 rounded-lg border-l-2 border-yellow-400">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-400 text-slate-900 text-sm font-bold mt-1">2</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Step 2: Upload Documents</h4>
                      <p className="text-slate-400 text-sm mb-3">Upload business registration, tax documents, or certifications.</p>
                      <Link href="/business/documents">
                        <Button size="sm" className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                          Upload Now
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-slate-700/50 rounded-lg border-l-2 border-slate-600">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-600 text-white text-sm font-bold mt-1">3</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Step 3: Admin Review</h4>
                      <p className="text-slate-400 text-sm">Our team reviews your documents. Usually takes 3-5 business days.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  Your Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-600 cursor-pointer" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Upload business documents</p>
                      <p className="text-slate-400 text-sm">Business registration, tax certificate, etc.</p>
                    </div>
                    <Badge className="bg-orange-900 text-orange-300 border-orange-700">High Priority</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-600 cursor-pointer" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Add website to profile</p>
                      <p className="text-slate-400 text-sm">+60% more customer clicks when website is linked</p>
                    </div>
                    <Badge className="bg-blue-900 text-blue-300 border-blue-700">Medium Priority</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-600 cursor-pointer" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Upload 5 high-quality photos</p>
                      <p className="text-slate-400 text-sm">Complete your gallery for better visibility</p>
                    </div>
                    <Badge className="bg-blue-900 text-blue-300 border-blue-700">Medium Priority</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-600 cursor-pointer" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Create your first post</p>
                      <p className="text-slate-400 text-sm">Share an update about your business</p>
                    </div>
                    <Badge className="bg-slate-700 text-slate-300 border-slate-600">Optional</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
