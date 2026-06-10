# 📱 TWEET & BUSINESS ADVERTISING MANAGEMENT SYSTEM

**Status:** Complete specification  
**Date:** 2026-06-10  
**Purpose:** Manage tweets and create professional business advertisements  

---

## 📱 **TWEET MANAGEMENT FOR BUSINESS DASHBOARD**

### **New Tab: `/business-dashboard/tweets`**

#### **Features**

**View All Tweets:**
```
┌─────────────────────────────────────────────┐
│ My Tweets Management                        │
├─────────────────────────────────────────────┤
│ Total Tweets: 245                           │
│ [Connect Twitter] [Sync Latest]             │
├─────────────────────────────────────────────┤
│ Tweet List:                                 │
│                                             │
│ "Just launched new products! 🎉"            │
│ Created: 2 days ago                         │
│ Likes: 234 | Retweets: 45 | Replies: 12    │
│ [View on Twitter] [Delete] [Archive]        │
│                                             │
│ "Check out our new collection..."           │
│ Created: 1 week ago                         │
│ Likes: 567 | Retweets: 89 | Replies: 34    │
│ [View on Twitter] [Delete] [Archive]        │
│                                             │
├─────────────────────────────────────────────┤
│ Filters: [All] [This Month] [Archived]      │
│ Sort: [Most Recent] [Most Liked] [Trending] │
└─────────────────────────────────────────────┘
```

**Capabilities:**
- View all business tweets
- Delete tweets
- Archive tweets (hide without deleting)
- View engagement stats
- Filter by date
- Search tweets
- Sync with Twitter API
- Schedule tweets
- Cross-post with platform posts

---

### **Database Schema - Tweets Table**

```sql
CREATE TABLE business_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES users(id),
  tweet_id VARCHAR(255) UNIQUE, -- Twitter tweet ID
  content TEXT NOT NULL,
  twitter_url VARCHAR(500),
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE tweet_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES business_tweets(id),
  views_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### **Tweet Management API Endpoints**

```
GET    /api/business-dashboard/tweets
       - Return: All tweets with engagement stats

DELETE /api/business-dashboard/tweets/:id
       - Delete tweet (soft delete)

POST   /api/business-dashboard/tweets/:id/archive
       - Archive tweet

POST   /api/business-dashboard/tweets/sync
       - Sync tweets from Twitter API

GET    /api/business-dashboard/tweets/analytics
       - Return: Tweet analytics

POST   /api/business-dashboard/tweets/schedule
       - Schedule tweet to post later
```

---

### **Component Code**

**File:** `src/app/business-dashboard/tweets/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Archive, ExternalLink } from 'lucide-react';

interface Tweet {
  id: string;
  tweet_id: string;
  content: string;
  twitter_url: string;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  created_at: string;
  archived: boolean;
}

export default function TweetsPage() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business-dashboard/tweets')
      .then(r => r.json())
      .then(data => setTweets(data.tweets || []))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteTweet = async (id: string) => {
    if (confirm('Delete this tweet?')) {
      await fetch(`/api/business-dashboard/tweets/${id}`, { method: 'DELETE' });
      setTweets(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleArchiveTweet = async (id: string) => {
    await fetch(`/api/business-dashboard/tweets/${id}/archive`, { method: 'POST' });
    setTweets(prev => prev.map(t => t.id === id ? { ...t, archived: !t.archived } : t));
  };

  const filteredTweets = tweets
    .filter(t => {
      if (filter === 'active') return !t.archived;
      if (filter === 'archived') return t.archived;
      return true;
    })
    .filter(t => t.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Tweet Management</h1>
          <p className="text-gray-400">Manage your tweets and engagement</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Tweets" value={tweets.length} />
          <StatCard label="Total Likes" value={tweets.reduce((sum, t) => sum + t.likes_count, 0)} />
          <StatCard label="Total Retweets" value={tweets.reduce((sum, t) => sum + t.retweets_count, 0)} />
          <StatCard label="Avg Engagement" value={Math.round(tweets.reduce((sum, t) => sum + (t.likes_count + t.retweets_count), 0) / tweets.length) || 0} />
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-8">
          <Input
            placeholder="Search tweets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            {(['all', 'active', 'archived'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Tweets List */}
        <div className="space-y-4">
          {filteredTweets.map(tweet => (
            <Card key={tweet.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <p className="text-white mb-3">{tweet.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <div className="flex gap-4">
                    <span>❤️ {tweet.likes_count}</span>
                    <span>🔄 {tweet.retweets_count}</span>
                    <span>💬 {tweet.replies_count}</span>
                  </div>
                  <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(tweet.twitter_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Twitter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchiveTweet(tweet.id)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {tweet.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTweet(tweet.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTweets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400">No tweets to display</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
```

---

## 🎯 **BUSINESS ADVERTISEMENT/PROMOTION SYSTEM**

### **New Tab: `/business-dashboard/advertisements`**

#### **Features**

**Advertisement Management:**
```
┌─────────────────────────────────────────────────────┐
│ Business Advertisements                             │
├─────────────────────────────────────────────────────┤
│ [+ Create Advertisement]                            │
├─────────────────────────────────────────────────────┤
│ Active Ads: 3  |  Total Spent: $2,450  |  ROI: 245% │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Ad: "Spring Collection 50% OFF"                     │
│ Status: ✅ Active                                   │
│ Budget: $500 | Spent: $342 | Remaining: $158       │
│ Views: 12,450 | Clicks: 345 | CTR: 2.8%            │
│ Created: 2 weeks ago | Expires: in 5 days          │
│ [Edit] [Pause] [Boost] [View Analytics] [Delete]   │
│                                                     │
│ Ad: "New Arrivals Exclusive"                        │
│ Status: ⏸️ Paused                                   │
│ Budget: $300 | Spent: $289 | Remaining: $11        │
│ Views: 8,920 | Clicks: 201 | CTR: 2.3%             │
│ Created: 3 weeks ago | Expires: in 2 days          │
│ [Edit] [Resume] [Archive] [View Analytics] [Delete] │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Filter: [All] [Active] [Paused] [Expired]           │
│ Sort: [Most Recent] [Best Performing]               │
└─────────────────────────────────────────────────────┘
```

#### **Create Advertisement Flow**

```
Step 1: Choose Format
┌──────────────────────────────┐
│ ☑️ Image Ad (1200x628px)    │
│ ☐ Video Ad (max 30s)         │
│ ☐ Carousel Ad (3-5 images)   │
│ ☐ Text Only Ad               │
└──────────────────────────────┘

Step 2: Design Ad
┌──────────────────────────────┐
│ Headline: [Enter text]       │
│ Description: [Enter text]    │
│ CTA Button: [Shop Now]       │
│ [Upload Image] or [Video]    │
│ Preview: [Show preview]      │
└──────────────────────────────┘

Step 3: Target Audience
┌──────────────────────────────┐
│ Target Location: [Select]    │
│ Interest Categories: [Multi] │
│ Age Range: [Select]          │
│ Budget: [Set budget]         │
│ Duration: [Start-End dates]  │
└──────────────────────────────┘

Step 4: Review & Publish
┌──────────────────────────────┐
│ Review everything            │
│ [Preview] [Edit] [Publish]   │
└──────────────────────────────┘
```

---

### **Database Schema - Advertisements**

```sql
CREATE TABLE business_advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  format VARCHAR(50), -- 'image', 'video', 'carousel', 'text'
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  status VARCHAR(50), -- 'active', 'paused', 'expired', 'draft'
  budget DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_location VARCHAR(255),
  target_interests TEXT[], -- Array of interests
  target_age_min INTEGER,
  target_age_max INTEGER,
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES business_advertisements(id),
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  roi NUMERIC(5,2),
  UNIQUE(ad_id, date)
);

CREATE TABLE ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES business_advertisements(id),
  ctr NUMERIC(5,2), -- Click through rate
  conversion_rate NUMERIC(5,2),
  roi NUMERIC(5,2), -- Return on investment
  cost_per_click DECIMAL(10,2),
  cost_per_conversion DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### **Advertisement API Endpoints**

```
GET    /api/business-dashboard/advertisements
       - Return: All ads with performance metrics

POST   /api/business-dashboard/advertisements
       - Create new ad

PUT    /api/business-dashboard/advertisements/:id
       - Update ad

DELETE /api/business-dashboard/advertisements/:id
       - Delete ad

POST   /api/business-dashboard/advertisements/:id/pause
       - Pause ad

POST   /api/business-dashboard/advertisements/:id/resume
       - Resume paused ad

POST   /api/business-dashboard/advertisements/:id/boost
       - Increase budget/extend duration

GET    /api/business-dashboard/advertisements/:id/analytics
       - Get detailed ad analytics

GET    /api/business-dashboard/advertisements/stats
       - Get aggregate ad stats
```

---

### **Component Code - Advertisement Management**

**File:** `src/app/business-dashboard/advertisements/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Pause, Play, TrendingUp } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'expired' | 'draft';
  budget: number;
  spent: number;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  start_date: string;
  end_date: string;
}

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business-dashboard/advertisements')
      .then(r => r.json())
      .then(data => setAds(data.advertisements || []))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = ads.reduce((sum, ad) => sum + ad.spent, 0);
  const totalViews = ads.reduce((sum, ad) => sum + ad.views_count, 0);
  const totalRoi = ads.length > 0 ? Math.round((totalViews / totalSpent) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Advertisement Manager</h1>
            <p className="text-gray-400">Create and manage business promotions</p>
          </div>
          <Button>+ Create Ad</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Ads" value={ads.filter(a => a.status === 'active').length} />
          <StatCard label="Total Spent" value={`$${totalSpent.toFixed(2)}`} />
          <StatCard label="Total Views" value={totalViews} />
          <StatCard label="Avg ROI" value={`${totalRoi}%`} />
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {ads.map(ad => (
            <Card key={ad.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{ad.title}</h3>
                    <div className="flex gap-6 text-sm text-gray-400">
                      <span>Status: <span className={ad.status === 'active' ? 'text-green-400' : 'text-gray-400'}>{ad.status}</span></span>
                      <span>Budget: ${ad.budget} | Spent: ${ad.spent}</span>
                      <span>👁️ {ad.views_count} views</span>
                      <span>🔗 {ad.clicks_count} clicks</span>
                      <span>✅ {ad.conversions_count} conversions</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
```

---

## 📋 **UPDATE BUSINESS DASHBOARD NAVIGATION**

Add two new tabs:

**File:** `src/app/business-dashboard/layout.tsx` (or navigation component)

```tsx
const dashboardTabs = [
  { name: 'Home', href: '/business-dashboard' },
  { name: 'Posts', href: '/business-dashboard/posts' },
  { name: 'Tweets', href: '/business-dashboard/tweets' }, ← NEW
  { name: 'Advertisements', href: '/business-dashboard/advertisements' }, ← NEW
  { name: 'Home Page', href: '/business-dashboard/home-page' },
  { name: 'Analytics', href: '/business-dashboard/analytics' },
  { name: 'Subscribers', href: '/business-dashboard/subscribers' },
  { name: 'Settings', href: '/business-dashboard/settings' },
];
```

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Phase 1: Tweet Management (3-4 days)**
- [ ] Create tweets table
- [ ] Build tweets page
- [ ] Add delete/archive functionality
- [ ] Connect Twitter API
- [ ] Test with real tweets

### **Phase 2: Advertisement System (5-7 days)**
- [ ] Create advertisements tables
- [ ] Build ad management page
- [ ] Build ad creator form
- [ ] Add performance analytics
- [ ] Test with sample ads

### **Phase 3: Integration (2-3 days)**
- [ ] Add tabs to dashboard navigation
- [ ] Connect to analytics
- [ ] Real-time performance updates
- [ ] Testing & refinement

---

**Total Implementation: ~2 weeks**

Everything is specified and ready to build! 🚀
