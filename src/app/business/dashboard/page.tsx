'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, Building2, FileText, ImageIcon, TrendingUp, Users,
  Settings, LogOut, Edit2, Eye, Loader2, AlertCircle,
  Zap, Award, Globe, MessageSquare, ArrowRight, CheckCircle2,
  AlertTriangle, Activity, Clock, Star, Sparkles, Target,
  Lightbulb, CheckSquare, Flame, Radio,
  BarChart, Bell, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';
import { TrustScoreInfo } from '@/components/ui/trust-score-info';

interface Business {
  id: string;
  company_name: string;
  description: string;
  industry: string;
  status: 'pending' | 'reviewing' | 'verified' | 'rejected';
  trust_score: number;
  logo_url: string;
  cover_image_url?: string | null;
  website: string;
  phone: string;
  address: string;
  doc_count: number;
  verified_at?: string;
}

interface BusinessStats {
  views: number;
  week_views: number;
  week_change_pct: number | null;
  month_views: number;
  connections: number;
  reviews: number;
  verified: boolean;
  ads_active: number;
  ads_limit: number;
  profile_completion: number;
  gallery_count: number;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

const QUICK_ACTIONS = [
  {
    href: '/business/posts',
    icon: MessageSquare,
    title: 'Write Post',
    description: 'Share updates with customers',
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    textColor: 'text-blue-400'
  },
  {
    href: '/business/gallery',
    icon: ImageIcon,
    title: 'Upload Photos',
    description: 'Add images to your gallery',
    iconBg: 'bg-purple-500/10 border border-purple-500/20',
    textColor: 'text-purple-400'
  },
  {
    href: '/business/ads',
    icon: Zap,
    title: 'Create Campaign',
    description: 'Launch a new ad campaign',
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    textColor: 'text-amber-400'
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

function getTrustScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
  if (score >= 60) return { label: 'Good', color: 'text-green-400' };
  if (score >= 30) return { label: 'Building', color: 'text-yellow-600' };
  return { label: 'Get Verified', color: 'text-gray-500' };
}

function getProfileCompletionItems(business: Business, stats: BusinessStats | null) {
  return [
    { label: 'Company Name', completed: !!business.company_name },
    { label: 'Description', completed: !!business.description },
    { label: 'Contact Info', completed: !!(business.phone || business.address) },
    { label: 'Photos (5+)', completed: (stats?.gallery_count ?? 0) >= 5 },
    { label: 'Documents', completed: business.doc_count > 0 },
    { label: 'Website', completed: !!business.website },
  ];
}

export default function BusinessDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'tasks'>('overview');

  const canManage = !!user && (user.role === 'business' || ['admin', 'banker', 'lawyer'].includes(user.role));

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setActivity((data.notifications || []).slice(0, 5));
      }
    } catch {
      /* Recent Activity card just shows nothing — not worth an error state */
    }
  }, []);

  const activityIcon = (type: string) => {
    if (type.includes('review')) return Star;
    if (type.includes('connection')) return Users;
    if (type.includes('document') || type.includes('vetting')) return FileText;
    if (type.includes('payment') || type.includes('ad')) return TrendingUp;
    return Bell;
  };

  const fetchBusinessData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    } else if (!canManage) {
      router.push('/dashboard');
    } else {
      fetchBusinessData();
      fetchActivity();
    }
  }, [user, authLoading, canManage, router, fetchBusinessData, fetchActivity]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto" />
          <p className="text-gray-600 font-medium">Loading your business dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">{error}</h2>
              <p className="text-gray-500">Please try again or contact support.</p>
              <Button onClick={() => router.push('/')} className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 text-yellow-400 mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">
                {user?.role === 'business' ? 'Create your business profile' : "This account doesn't have a business profile"}
              </h2>
              <p className="text-gray-500 text-sm">
                {user?.role === 'business'
                  ? 'Set up your company details in the Vetting Hub to unlock your business dashboard, posts, gallery, and ads.'
                  : 'Viewing as staff — this dashboard is empty until a business profile exists for this account.'}
              </p>
              <Link href="/vetting">
                <Button className="w-full bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                  Go to Vetting Hub
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileCompletion = stats?.profile_completion ?? 0;
  const profileCompletionItems = getProfileCompletionItems(business, stats);
  const step1Complete = profileCompletionItems.every((item) => item.completed);

  return (
    <GlassBackground>
      {/* Cover Photo — same field shown on the public profile page; previously
          fetched here but never rendered, so owners couldn't see their own
          cover photo without opening their public page in another tab. */}
      {business.cover_image_url && (
        <div className="relative w-full h-32 sm:h-44 overflow-hidden">
          <Image
            src={business.cover_image_url}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
          <Link
            href="/business/profile"
            className="absolute bottom-3 right-3 text-xs font-medium bg-slate-950/70 backdrop-blur text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition"
          >
            Change cover photo
          </Link>
        </div>
      )}

      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="h-11 w-11 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center ring-2 ring-yellow-300">
                  <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-slate-900" />
                </div>
                {business.status === 'verified' && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 ring-2 ring-white">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-lg sm:text-3xl font-bold text-gray-900 truncate">{business.company_name}</h1>
                  {business.status === 'verified' && (
                    <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs shrink-0">VERIFIED</Badge>
                  )}
                </div>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{business.industry || 'Business'} • {profileCompletion}% Complete</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link href="/">
                <Button
                  variant="outline"
                  className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-100 hidden sm:flex"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link href={`/business/${business.id}`} target="_blank">
                <Button
                  variant="outline"
                  className="gap-2 border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 hidden sm:flex"
                >
                  <Eye className="h-4 w-4" />
                  View Public Page
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="gap-2 border-gray-300 text-gray-900 hover:bg-gray-100 sm:hidden h-9 w-9"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2 border-gray-300 text-gray-900 hover:bg-gray-100 hidden sm:flex"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <Link href={`/business/${business.id}`} target="_blank" className="sm:hidden block mb-4">
            <Button
              variant="outline"
              className="w-full gap-2 border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 h-11"
            >
              <Eye className="h-4 w-4" />
              View Public Page
            </Button>
          </Link>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap transition ${
                activeTab === 'overview'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap transition ${
                activeTab === 'insights'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Lightbulb className="h-4 w-4 inline mr-2" />
              Growth Insights
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap transition ${
                activeTab === 'tasks'
                  ? 'bg-yellow-400 text-slate-900'
                  : 'text-gray-600 hover:bg-gray-100'
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
              <div className={`mb-6 p-4 rounded-lg border-l-4 flex items-start gap-4 backdrop-blur-xl ${
                business.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/50' :
                business.status === 'reviewing' ? 'bg-blue-500/10 border-blue-500/50' :
                business.status === 'rejected' ? 'bg-red-500/10 border-red-500/50' :
                'bg-gray-200 border-gray-300'
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {business.status === 'reviewing' ? (
                    <Clock className="h-5 w-5 text-yellow-400" />
                  ) : business.status === 'pending' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  ) : business.status === 'rejected' ? (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {business.status === 'pending' ? 'Complete Your Profile' :
                     business.status === 'reviewing' ? 'Under Review' :
                     business.status === 'rejected' ? 'Action Required' :
                     'Get Verified'}
                  </h3>
                  <p className={`text-sm ${
                    business.status === 'pending' ? 'text-yellow-700' :
                    business.status === 'reviewing' ? 'text-blue-700' :
                    business.status === 'rejected' ? 'text-red-700' :
                    'text-gray-600'
                  }`}>
                    {business.status === 'pending' ? 'Complete your profile to unlock verified status and get more visibility.' :
                     business.status === 'reviewing' ? 'We\'re reviewing your documents. Typically takes 3-5 business days.' :
                     business.status === 'rejected' ? 'Please review and resubmit your application.' :
                     'Submit your business for verification to unlock a trust badge and more visibility.'}
                  </p>
                </div>
              </div>
            )}

            {/* Profile Completion Progress */}
            <div className="mb-8 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-400" />
                  Profile Completion: {profileCompletion}%
                </h3>
                {profileCompletion < 100 && (
                  <span className="text-sm text-yellow-600 font-medium">+{100 - profileCompletion}% to full potential</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {profileCompletionItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0"></div>
                    )}
                    <span className={`text-sm ${item.completed ? 'text-green-400' : 'text-gray-500'}`}>
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
                <Card className="relative bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-2">This Week</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-gray-900">{stats?.week_views || 0}</p>
                          {stats?.week_change_pct !== null && stats?.week_change_pct !== undefined && (
                            <p className={`text-sm font-medium mb-1 ${stats.week_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stats.week_change_pct >= 0 ? '+' : ''}{stats.week_change_pct}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Total Views */}
              <div className="group relative">
                <Card className="relative bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-2">Total Views</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-gray-900">{stats?.views || 0}</p>
                          <p className="text-gray-500 text-xs">lifetime</p>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Eye className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Ads */}
              <Link href="/business/ads" className="group relative block">
                <Card className="relative bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-2">Active Ads</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-gray-900">{stats?.ads_active ?? 0}</p>
                          <p className="text-gray-500 text-xs mb-1">of {stats?.ads_limit ?? 0} allowed</p>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Flame className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Trust Score */}
              <div className="group relative">
                <Card className="relative bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-2 flex items-center gap-1">
                          Trust Score
                          <TrustScoreInfo score={business.trust_score} className="text-gray-500 hover:text-yellow-400" />
                        </p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-gray-900">{business.trust_score}%</p>
                          <p className={`text-sm font-medium mb-1 ${getTrustScoreLabel(business.trust_score).color}`}>
                            {getTrustScoreLabel(business.trust_score).label}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Award className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div className={`group h-full rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl p-5 shadow-lg cursor-pointer transition-colors hover:border-gray-300 ${glassInteractive}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`inline-flex p-2 ${action.textColor} ${action.iconBg} rounded-lg mb-3`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                            <p className="text-gray-500 text-sm">{action.description}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-yellow-400 transition mt-1" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* All Features Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Your Business</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/business/posts">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-cyan-400" />
                        </div>
                        <Badge className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20">Popular</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Posts</h3>
                      <p className="text-gray-500 text-sm">Share updates with your audience</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/gallery">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <ImageIcon className="h-5 w-5 text-purple-400" />
                        </div>
                        <Badge className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20">{stats?.gallery_count ?? 0} images</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Gallery</h3>
                      <p className="text-gray-500 text-sm">Showcase your business</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/ads">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <Zap className="h-5 w-5 text-amber-400" />
                        </div>
                        <Badge className="bg-gray-100 text-gray-600 border-gray-300">New</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Ad Campaigns</h3>
                      <p className="text-gray-500 text-sm">Boost your visibility</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/analytics">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-yellow-400" />
                        </div>
                        <Badge className="bg-gray-100 text-gray-600 border-gray-300">Live</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
                      <p className="text-gray-500 text-sm">Track performance</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/profile">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <Edit2 className="h-5 w-5 text-blue-400" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Edit Profile</h3>
                      <p className="text-gray-500 text-sm">Update your business details</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/documents">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <FileText className="h-5 w-5 text-emerald-400" />
                        </div>
                        <Badge className="bg-gray-100 text-gray-600 border-gray-300">{business?.doc_count ?? 0} docs</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
                      <p className="text-gray-500 text-sm">Verification document status</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/business/settings">
                  <Card className="h-full bg-white/80 backdrop-blur-xl border-gray-200 hover:border-yellow-500/30 hover:shadow-lg transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                          <Settings className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
                      <p className="text-gray-500 text-sm">Visibility, notifications, security</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Activity Feed */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-yellow-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activity.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No activity yet — it&apos;ll show up here as customers view your profile, connect, and review you.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {activity.map((item) => {
                      const Icon = activityIcon(item.type);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-6 hover:bg-gray-100 transition">
                          <div>
                            <p className="font-medium text-gray-900">{item.message}</p>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Icon className="h-5 w-5 text-yellow-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              Growth Insights & Recommendations
            </h2>

            <div className="grid grid-cols-1 gap-4 mb-8">
              {GROWTH_RECOMMENDATIONS.map((rec, i) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={i}
                    className={`bg-white/80 backdrop-blur-xl border-l-4 border border-gray-200 rounded-2xl p-6 flex items-start justify-between shadow-lg transition-colors hover:shadow-xl ${
                      rec.priority === 'high'
                        ? 'border-amber-500/60'
                        : 'border-blue-500/60'
                    }`}
                  >
                    <div className="flex gap-4 flex-1">
                      <div className={`p-3 rounded-lg flex-shrink-0 border ${
                        rec.priority === 'high'
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-blue-500/10 border-blue-500/20'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          rec.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{rec.title}</h3>
                        <p className="text-gray-500 text-sm mb-3">{rec.description}</p>
                        <div className="flex items-center gap-4">
                          <Badge className={`${
                            rec.priority === 'high'
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-700 border-blue-500/20'
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

            {/* Growth Snapshot — your own numbers, not a peer comparison (there's
                no industry benchmark dataset behind this yet). */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200 mb-8">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-yellow-400" />
                  Your Growth Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-900 font-medium">Profile Completeness</span>
                      <span className="text-yellow-600">{profileCompletion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${profileCompletion}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-900 font-medium">Monthly Views</span>
                      <span className="text-yellow-600">{stats?.month_views ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (stats?.month_views ?? 0) * 2)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-900 font-medium">Connections</span>
                      <span className="text-yellow-600">{stats?.connections ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (stats?.connections ?? 0) * 5)}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Tips */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Smart Tips to Grow Your Business
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-100 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-gray-900 font-medium mb-1">Add More Photos</p>
                    <p className="text-gray-500 text-sm">Profiles with 5+ photos get more visibility. You currently have {stats?.gallery_count ?? 0}.</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-gray-900 font-medium mb-1">Post Consistently</p>
                    <p className="text-gray-500 text-sm">Businesses that post 2-3 times per week see 25% higher engagement and visibility.</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-gray-900 font-medium mb-1">Try Ads</p>
                    <p className="text-gray-500 text-sm">Verified businesses with ads get 3x more customer inquiries. Start with as little as R100.</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg border-l-2 border-yellow-400">
                    <p className="text-gray-900 font-medium mb-1">Get Verified</p>
                    <p className="text-gray-500 text-sm">Verified businesses rank higher and get verified badges. Upload all documents to speed up verification.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-yellow-400" />
              Priority Tasks & Verification Progress
            </h2>

            {/* Verification Checklist */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200 mb-8">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-400" />
                  Get Verified in 3 Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`flex gap-4 p-4 bg-gray-100 rounded-lg border-l-2 ${step1Complete ? 'border-green-400' : 'border-gray-300'}`}>
                    <div className="flex-shrink-0">
                      {step1Complete ? (
                        <CheckCircle2 className="h-6 w-6 text-green-400 mt-1" />
                      ) : (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-gray-900 text-sm font-bold mt-1">1</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Step 1: Complete Profile {step1Complete ? '✓' : `(${profileCompletion}%)`}</h4>
                      <p className="text-gray-500 text-sm mb-3">
                        {step1Complete
                          ? "You've filled out your basic information. Great start!"
                          : 'Fill in your company name, description, contact info, website, and add photos.'}
                      </p>
                      {!step1Complete && (
                        <Link href="/business/profile">
                          <Button size="sm" className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                            Complete Profile
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-100 rounded-lg border-l-2 border-yellow-400">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-400 text-slate-900 text-sm font-bold mt-1">2</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Step 2: Upload Documents</h4>
                      <p className="text-gray-500 text-sm mb-3">Upload business registration, tax documents, or certifications.</p>
                      <Link href="/business/documents">
                        <Button size="sm" className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">
                          Upload Now
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-100 rounded-lg border-l-2 border-gray-300">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-gray-900 text-sm font-bold mt-1">3</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Step 3: Admin Review</h4>
                      <p className="text-gray-500 text-sm">Our team reviews your documents. Usually takes 3-5 business days.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  Your Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Upload business documents',
                      description: 'Business registration, tax certificate, etc.',
                      done: business.doc_count > 0,
                      priority: 'High Priority',
                      priorityClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                      href: '/business/documents',
                    },
                    {
                      label: 'Add website to profile',
                      description: '+60% more customer clicks when website is linked',
                      done: !!business.website,
                      priority: 'Medium Priority',
                      priorityClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
                      href: '/business/profile',
                    },
                    {
                      label: 'Upload 5 high-quality photos',
                      description: 'Complete your gallery for better visibility',
                      done: (stats?.gallery_count ?? 0) >= 5,
                      priority: 'Medium Priority',
                      priorityClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
                      href: '/business/gallery',
                    },
                  ].map((item) => (
                    <Link key={item.label} href={item.href} className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded border border-gray-300 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.label}</p>
                        <p className="text-gray-500 text-sm">{item.description}</p>
                      </div>
                      <Badge className={item.priority === 'High Priority' && !item.done ? item.priorityClass : 'bg-gray-200 text-gray-600 border-gray-300'}>
                        {item.done ? 'Done' : item.priority}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </GlassBackground>
  );
}
