'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Eye, Zap, DollarSign, BarChart3, Trash2, Edit, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Ad {
  id: string;
  title: string;
  description: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export default function BusinessAdsPage() {
  const [ads, setAds] = useState<Ad[]>([
    {
      id: '1',
      title: 'Summer Promotion',
      description: 'Get 20% off on all products this summer!',
      budget: 5000,
      spent: 2340,
      impressions: 15240,
      clicks: 342,
      status: 'active',
      createdAt: '3 days ago',
    },
    {
      id: '2',
      title: 'New Product Launch',
      description: 'Check out our new innovative product line',
      budget: 3000,
      spent: 3000,
      impressions: 8900,
      clicks: 210,
      status: 'completed',
      createdAt: '1 week ago',
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
  });

  const handleCreateAd = () => {
    if (formData.title && formData.description && formData.budget) {
      const newAd: Ad = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        budget: parseFloat(formData.budget),
        spent: 0,
        impressions: 0,
        clicks: 0,
        status: 'active',
        createdAt: 'just now',
      };
      setAds([newAd, ...ads]);
      setFormData({ title: '', description: '', budget: '' });
      setShowCreateForm(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    setAds(ads.map(ad => ({
      ...ad,
      status: ad.status === 'active' ? 'paused' : 'active',
    })));
  };

  const handleDeleteAd = (id: string) => {
    setAds(ads.filter(ad => ad.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'completed':
        return 'bg-slate-500/20 text-slate-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getTotalStats = () => {
    const totalBudget = ads.reduce((sum, ad) => sum + ad.budget, 0);
    const totalSpent = ads.reduce((sum, ad) => sum + ad.spent, 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);

    return { totalBudget, totalSpent, totalImpressions, totalClicks };
  };

  const stats = getTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 p-4">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Business Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Advertisement Manager</h1>
            <p className="text-slate-400 mt-1">Create and manage your business ads</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300">
            <Plus className="h-4 w-4" />
            Create Ad
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Total Budget</p>
              <p className="text-2xl font-bold text-white mt-2">R {stats.totalBudget.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Total Spent</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">R {stats.totalSpent.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Total Impressions</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.totalImpressions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Total Clicks</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.totalClicks.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Ad Form */}
        {showCreateForm && (
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Create New Advertisement</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Ad Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Sale 2026"
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Ad Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your ad and what you're promoting"
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Budget (R)</label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="5000"
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateAd} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                  Create Ad
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ads List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Ads ({ads.length})</h2>

          {ads.map((ad) => (
            <Card key={ad.id} className="bg-slate-800 border-slate-600 hover:border-yellow-400/30 transition-colors">
              <CardContent className="p-6 space-y-4">
                {/* Ad Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{ad.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">{ad.description}</p>
                    <p className="text-slate-500 text-xs mt-2">Created {ad.createdAt}</p>
                  </div>
                  <Badge className={getStatusColor(ad.status)}>
                    {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-slate-400 text-sm mb-2">
                    <span>Budget Usage</span>
                    <span>R {ad.spent.toLocaleString()} / R {ad.budget.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${(ad.spent / ad.budget) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Eye className="h-4 w-4" />
                      Impressions
                    </div>
                    <p className="text-xl font-bold text-white">{ad.impressions.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Zap className="h-4 w-4" />
                      Clicks
                    </div>
                    <p className="text-xl font-bold text-white">{ad.clicks.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <BarChart3 className="h-4 w-4" />
                      CTR
                    </div>
                    <p className="text-xl font-bold text-white">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0'}%
                    </p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <DollarSign className="h-4 w-4" />
                      CPC
                    </div>
                    <p className="text-xl font-bold text-white">
                      R {ad.clicks > 0 ? (ad.spent / ad.clicks).toFixed(2) : '0'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Button
                    size="sm"
                    onClick={() => handleToggleStatus(ad.id)}
                    className={`gap-2 ${ad.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {ad.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 border-slate-600 text-slate-300">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeleteAd(ad.id)}
                    className="gap-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
