# 🚀 DASHBOARD - QUICK START IMPLEMENTATION

**Status:** Ready to build  
**Complexity:** Medium-High  
**Estimated Time:** 2-3 weeks  

---

## 🎯 **WHAT TO BUILD - In Order**

### **PRIORITY 1: Customer Dashboard (Week 1)**

#### **1.1 Create Dashboard Home Page**

**File:** `src/app/dashboard/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Bookmark, Bell } from 'lucide-react';

interface DashboardStats {
  favorites_count: number;
  following_count: number;
  followers_count: number;
  saved_posts_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch dashboard stats
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const quickActions = [
    { label: 'Browse Favorites', href: '/dashboard/favorites', icon: Heart },
    { label: 'View Saved', href: '/dashboard/saved', icon: Bookmark },
    { label: 'Manage Following', href: '/dashboard/following', icon: Users },
    { label: 'Notifications', href: '/dashboard/alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.fullName}! 👋
          </h1>
          <p className="text-gray-400">Manage your favorite stores, saved items, and connections</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <p className="text-sm text-gray-400">Favorites</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {stats?.favorites_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <p className="text-sm text-gray-400">Following</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">
                {stats?.following_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <p className="text-sm text-gray-400">Followers</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">
                {stats?.followers_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <p className="text-sm text-gray-400">Saved Items</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-400">
                {stats?.saved_posts_count || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-800/50 border-gray-700 mb-8">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quickActions.map(action => (
                <Button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Your Activity</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-center py-8">
              Your recent activity will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**What to add to navbar:**
- Link to `/dashboard`
- Show notification badge count

---

#### **1.2 Create Favorites Page**

**File:** `src/app/dashboard/favorites/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, X } from 'lucide-react';

interface Favorite {
  id: string;
  business_id: string;
  business_name: string;
  business_avatar: string;
  item_type: 'store' | 'product' | 'service';
  created_at: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filter, setFilter] = useState<'all' | 'store' | 'product' | 'service'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/favorites')
      .then(r => r.json())
      .then(data => setFavorites(data.favorites || []))
      .finally(() => setLoading(false));
  }, []);

  const handleRemoveFavorite = async (id: string) => {
    await fetch(`/api/dashboard/favorites/${id}`, { method: 'DELETE' });
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const filteredFavorites = favorites
    .filter(f => filter === 'all' || f.item_type === filter)
    .filter(f => f.business_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-2">My Favorites</h1>
        <p className="text-gray-400 mb-8">Total: {filteredFavorites.length}</p>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <Input
            placeholder="Search favorites..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            {(['all', 'store', 'product', 'service'] as const).map(type => (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                onClick={() => setFilter(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFavorites.map(fav => (
            <Card key={fav.id} className="bg-gray-800/50 border-gray-700 overflow-hidden">
              <div className="aspect-square bg-gray-700 flex items-center justify-center">
                <img
                  src={fav.business_avatar}
                  alt={fav.business_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">{fav.business_name}</h3>
                <p className="text-xs text-gray-400 capitalize mb-3">{fav.item_type}</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRemoveFavorite(fav.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredFavorites.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No favorites yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

#### **1.3 Create Following Page**

**File:** `src/app/dashboard/following/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX } from 'lucide-react';

interface Following {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  followers_count: number;
  verified: boolean;
}

export default function FollowingPage() {
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/following')
      .then(r => r.json())
      .then(data => setFollowing(data.following || []))
      .finally(() => setLoading(false));
  }, []);

  const handleUnfollow = async (id: string) => {
    await fetch(`/api/dashboard/following/${id}`, { method: 'DELETE' });
    setFollowing(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-2">Following</h1>
        <p className="text-gray-400 mb-8">Total: {following.length}</p>

        <div className="space-y-4">
          {following.map(user => (
            <Card key={user.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      {user.full_name}
                      {user.verified && <span className="text-yellow-400">✓</span>}
                    </h3>
                    <p className="text-sm text-gray-400">{user.followers_count} followers</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleUnfollow(user.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Unfollow
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {following.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Not following anyone yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### **PRIORITY 2: Business Dashboard (Week 1-2)**

#### **2.1 Create Business Dashboard Home**

**File:** `src/app/business-dashboard/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Heart, MessageSquare, Users, Edit } from 'lucide-react';

interface BusinessStats {
  views_count: number;
  likes_count: number;
  comments_count: number;
  followers_count: number;
  posts_count: number;
  engagement_rate: number;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.role?.includes('business')) {
      router.push('/');
      return;
    }

    fetch('/api/business-dashboard/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {user?.fullName}'s Business Dashboard
            </h1>
            <p className="text-gray-400">Manage your posts, analytics, and home page</p>
          </div>
          <Button onClick={() => router.push('/business-dashboard/posts')}>
            + Create Post
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Views" value={stats?.views_count || 0} icon={Eye} />
          <StatCard label="Likes" value={stats?.likes_count || 0} icon={Heart} />
          <StatCard label="Comments" value={stats?.comments_count || 0} icon={MessageSquare} />
          <StatCard label="Followers" value={stats?.followers_count || 0} icon={Users} />
          <StatCard label="Posts" value={stats?.posts_count || 0} />
          <StatCard label="Engagement" value={`${stats?.engagement_rate || 0}%`} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            title="Manage Posts"
            description="Create, edit, or schedule posts"
            onClick={() => router.push('/business-dashboard/posts')}
          />
          <ActionCard
            title="Edit Home Page"
            description="Customize your business home page"
            onClick={() => router.push('/business-dashboard/home-page')}
          />
          <ActionCard
            title="View Analytics"
            description="See detailed performance metrics"
            onClick={() => router.push('/business-dashboard/analytics')}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        {Icon && <Icon className="h-8 w-8 text-gray-600" />}
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, description, onClick }: any) {
  return (
    <Card
      className="bg-gray-800/50 border-gray-700 hover:border-primary/50 cursor-pointer transition"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{description}</p>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

#### **2.2 Create Post Management Page**

**File:** `src/app/business-dashboard/posts/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  status: 'published' | 'draft' | 'scheduled';
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business-dashboard/posts')
      .then(r => r.json())
      .then(data => setPosts(data.posts || []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this post?')) {
      await fetch(`/api/business-dashboard/posts/${id}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">My Posts</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Post
          </Button>
        </div>

        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-white mb-2">{post.content.substring(0, 100)}...</p>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>👁️ {post.views_count} views</span>
                      <span>❤️ {post.likes_count} likes</span>
                      <span>📅 {new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="text-yellow-400 capitalize">{post.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No posts yet. Create your first post!</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📋 **CREATE THESE PAGES NEXT**

### **Customer Dashboard Pages:**
- [ ] `/dashboard` (Home) ✓
- [ ] `/dashboard/favorites` ✓
- [ ] `/dashboard/following` ✓
- [ ] `/dashboard/saved`
- [ ] `/dashboard/alerts`
- [ ] `/dashboard/feed`

### **Business Dashboard Pages:**
- [ ] `/business-dashboard` (Home) ✓
- [ ] `/business-dashboard/posts` ✓
- [ ] `/business-dashboard/home-page`
- [ ] `/business-dashboard/analytics`
- [ ] `/business-dashboard/subscribers`
- [ ] `/business-dashboard/settings`

---

## 🔗 **ADD TO NAVBAR**

**Customer Navigation:**
```tsx
<Link href="/dashboard">Dashboard</Link>
```

**Business Navigation:**
```tsx
{user?.role === 'business' && (
  <Link href="/business-dashboard">Business Dashboard</Link>
)}
```

---

## ⚡ **API ENDPOINTS TO CREATE**

Create these in `src/app/api/`:

```
dashboard/
├── stats/route.ts
├── favorites/route.ts
├── saved-posts/route.ts
├── following/route.ts
└── notifications/route.ts

business-dashboard/
├── stats/route.ts
├── posts/route.ts
├── home-page/route.ts
├── analytics/route.ts
├── subscribers/route.ts
└── settings/route.ts
```

---

## 🎯 **TOTAL TIME ESTIMATE**

```
Customer Dashboard:     5-7 days
Business Dashboard:     7-10 days
API Endpoints:          3-5 days
Real-time Features:     3-5 days
Testing & Refinement:   2-3 days
─────────────────────
Total:                  20-30 days (3-4 weeks)
```

---

**Everything is ready to implement!** 🚀

See `DASHBOARD_IMPLEMENTATION_PLAN.md` for complete specifications!
