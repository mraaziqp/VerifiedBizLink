# 📊 CUSTOMER & BUSINESS DASHBOARD IMPLEMENTATION PLAN

**Status:** Complete specification and implementation guide  
**Date:** 2026-06-10  
**Complexity:** High - Multiple dashboards with real-time features  

---

## 🎯 **OVERVIEW**

### **Customer Dashboard (Instagram-style)**
```
Personal hub for:
- Favorite stores & items
- Saved posts/wishlist
- Following & followers
- Activity feed
- Notifications/alerts
- Personalized recommendations
- Search history
```

### **Business Dashboard (Content Management)**
```
Business control center for:
- Post management (CRUD)
- Home page editor
- Analytics & insights
- Subscriber management
- Performance metrics
- Content calendar
- Engagement tracking
```

---

## 📁 **DATABASE SCHEMA**

### **1. Favorites Table**

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  business_id UUID NOT NULL REFERENCES users(id),
  item_type VARCHAR(50), -- 'store', 'product', 'service'
  item_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, business_id, item_id)
);
```

### **2. Saved Posts Table**

```sql
CREATE TABLE saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)
);
```

### **3. Following Table**

```sql
CREATE TABLE following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);
```

### **4. User Notifications Table**

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50), -- 'like', 'comment', 'follow', 'alert'
  title VARCHAR(255),
  message TEXT,
  related_user_id UUID REFERENCES users(id),
  related_post_id UUID REFERENCES posts(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **5. Post Analytics Table**

```sql
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **6. Business Profile Extensions**

```sql
ALTER TABLE users ADD COLUMN (
  bio_line_2 TEXT,
  website TEXT,
  phone_extended VARCHAR(20),
  business_hours JSONB, -- {"mon": "9am-5pm", "tue": "9am-5pm", ...}
  quick_links JSONB, -- [{"label": "Shop", "url": "..."}, ...]
  featured_posts UUID[], -- Array of featured post IDs
  home_page_layout VARCHAR(50) -- 'grid', 'carousel', 'featured'
);
```

### **7. Search History**

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  search_query VARCHAR(255),
  search_type VARCHAR(50), -- 'business', 'product', 'service'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🏠 **CUSTOMER DASHBOARD PAGES & FEATURES**

### **Route: `/dashboard`**

#### **1. Dashboard Home**
```
Layout:
┌─────────────────────────────────────────┐
│ Welcome back, John! 👋                  │
├─────────────────────────────────────────┤
│                                         │
│  Your Stats:                            │
│  ┌──────────┐ ┌──────────┐             │
│  │ 245      │ │ 89       │             │
│  │ Favorites│ │ Following│             │
│  └──────────┘ └──────────┘             │
│                                         │
│  ┌──────────┐ ┌──────────┐             │
│  │ 32       │ │ 15       │             │
│  │ Followers│ │ Saved    │             │
│  └──────────┘ └──────────┘             │
│                                         │
├─────────────────────────────────────────┤
│ Quick Actions:                          │
│ [Browse Favorites] [View Saved]         │
│ [Manage Following] [Notifications]      │
└─────────────────────────────────────────┘
```

**Components:**
- WelcomeCard
- StatsCard (4 metrics)
- QuickActionsBar
- RecentActivityFeed

---

#### **2. Favorites Management (`/dashboard/favorites`)**

```
Tabs:
┌──────────────┬────────────┬──────────┐
│ All (245)    │ Stores (156)│ Items(89)│
└──────────────┴────────────┴──────────┘

Grid View:
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Store Name │ │ Store Name │ │ Store Name │
│ ⭐⭐⭐⭐⭐   │ │ ⭐⭐⭐⭐⭐   │ │ ⭐⭐⭐⭐⭐   │
│            │ │            │ │            │
│ [Remove] [Share] │ [Remove][Share]│ [Remove][Share]
└────────────┘ └────────────┘ └────────────┘

Features:
- Search within favorites
- Filter by rating
- Sort by date added
- Bulk actions (remove, share)
- Export favorites list
```

**Components:**
- FavoritesGrid
- FavoriteCard
- FilterBar
- SearchBox
- BulkActionsBar

---

#### **3. Saved Posts (`/dashboard/saved`)**

```
List View:
┌──────────────────────────────────────────┐
│ Business Name - 2 days ago               │
│ "Amazing new collection just dropped!"   │
│ [Image] or [Video]                       │
│ ❤️ 245  💬 32  💾 15 (saved)            │
│ [Unsave] [Share] [Go to Post]            │
├──────────────────────────────────────────┤
│ [Next Post...]                           │
└──────────────────────────────────────────┘

Features:
- Preview post
- Quick unsave
- Share post
- Go to business
- Sort by date/business
- Search saved posts
```

**Components:**
- SavedPostsList
- PostCard
- PreviewModal
- FilterAndSort

---

#### **4. Following (`/dashboard/following`)**

```
Following List:
┌─────────────────────────────────────────┐
│ Business Logo | Business Name    | ⭐⭐⭐│
│ 245 followers | Verified ✓       |[Unfollow]
├─────────────────────────────────────────┤
│ Business Logo | Business Name    | ⭐⭐⭐│
│ 890 followers | Verified ✓       |[Unfollow]
└─────────────────────────────────────────┘

Followers List:
[Show who's following you]
- Profile pic
- Username
- Follow button
- Recent activity

Features:
- See who unfollowed you
- Get notified of new followers
- Sort by engagement
- Filter by category
```

**Components:**
- FollowingList
- FollowingCard
- FollowersList
- FollowerCard
- NotificationAlert

---

#### **5. Notifications & Alerts (`/dashboard/alerts`)**

```
Real-time Alerts:
┌──────────────────────────────────────────┐
│ 🔴 New Comment                           │
│ Sarah commented on your saved post       │
│ "Love this! 💕"                         │
│ 2 minutes ago        [Mark Read] [×]     │
├──────────────────────────────────────────┤
│ 🔴 New Follower                          │
│ John started following you               │
│ 5 minutes ago        [Follow Back] [×]   │
├──────────────────────────────────────────┤
│ 🔴 Price Alert                           │
│ "Blue Jacket" in your favorites          │
│ Price dropped 20%! ($80 → $64)           │
│ [View Item] [Set New Alert]              │
└──────────────────────────────────────────┘

Features:
- Real-time notifications
- Filter by type
- Mark as read
- Set custom alerts
- Price drop notifications
- Stock availability alerts
- New posts from favorites
```

**Components:**
- NotificationsList
- NotificationCard
- AlertSettings
- RealTimeListener

---

#### **6. Personalized Feed (`/dashboard/feed`)**

```
AI-Powered Feed (like Instagram):
- Based on favorites
- Based on following
- Based on search history
- Based on engagement
- Recommended businesses
- Trending items
- Similar to saved posts

Features:
- Infinite scroll
- Like/save posts
- Comment
- Share
- Report content
```

**Components:**
- PersonalizedFeed
- PostCard
- RecommendationCard
- TrendingSection

---

## 💼 **BUSINESS DASHBOARD PAGES & FEATURES**

### **Route: `/business-dashboard`**

#### **1. Dashboard Home (`/business-dashboard`)**

```
Overview:
┌──────────────────────────────────────────────────┐
│ Welcome, [Business Name]! 👋                     │
├──────────────────────────────────────────────────┤
│ This Week's Performance:                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 2,450    │ │ 156      │ │ 32       │         │
│ │ Views    │ │ Likes    │ │ Comments │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 245      │ │ 34       │ │ 98.5%    │         │
│ │ Followers│ │ New Posts│ │ Engagement         │
│ └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│ Quick Actions:                                  │
│ [+ New Post] [Edit Profile] [View Analytics]   │
│ [Manage Home Page] [Settings]                   │
└──────────────────────────────────────────────────┘
```

**Components:**
- WelcomeSection
- PerformanceCards
- QuickActionsBar
- RecentActivityWidget

---

#### **2. Post Management (`/business-dashboard/posts`)**

```
Posts List:
┌────────────────────────────────────────────┐
│ [+ Create New Post]                        │
├────────────────────────────────────────────┤
│ "Amazing Sale 50% OFF" - 2 days ago        │
│ [Thumbnail] Views: 1,245 | Likes: 156      │
│ Status: Published | Engagement: 98%        │
│ [Edit] [Duplicate] [Archive] [Delete]      │
├────────────────────────────────────────────┤
│ "New Collection Launch" - 5 days ago       │
│ [Thumbnail] Views: 2,341 | Likes: 234      │
│ Status: Published | Engagement: 124%       │
│ [Edit] [Duplicate] [Archive] [Delete]      │
└────────────────────────────────────────────┘

Filters & Sorting:
- Filter by status (published, draft, scheduled)
- Sort by date, views, engagement
- Search posts
- Bulk actions (archive, delete)

Features:
- Post editor (title, content, images, videos)
- Schedule posts
- Preview before posting
- View post analytics
- Duplicate posts
- Archive/restore posts
```

**Components:**
- PostsList
- PostCard
- PostEditor
- PostScheduler
- PostAnalytics

---

#### **3. Home Page Editor (`/business-dashboard/home-page`)**

```
Page Builder:
┌─────────────────────────────────────────────┐
│ My Business Home                            │
│ [Edit] [Preview] [Save] [Publish]          │
├─────────────────────────────────────────────┤
│                                             │
│ [1] Hero Section                            │
│     ┌─────────────────────────────────┐    │
│     │ [Change Banner Image]            │    │
│     │ Title: "Welcome to [Business]"   │    │
│     │ Subtitle: "Your tagline here"    │    │
│     │ CTA Button: [Customize]          │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [2] About Section                           │
│     ┌─────────────────────────────────┐    │
│     │ Bio: [Edit]                      │    │
│     │ Location: [Edit]                 │    │
│     │ Phone: [Edit]                    │    │
│     │ Website: [Edit]                  │    │
│     │ Hours: [Edit]                    │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [3] Featured Posts Section                  │
│     ┌─────────────────────────────────┐    │
│     │ Select posts to feature:         │    │
│     │ ☑️ Post 1                        │    │
│     │ ☑️ Post 2                        │    │
│     │ ☑️ Post 3                        │    │
│     │ [Reorder]                        │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [4] Products/Services Section               │
│     ┌─────────────────────────────────┐    │
│     │ Add products/services            │    │
│     │ [+ Add Item]                     │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [5] Testimonials Section                    │
│     ┌─────────────────────────────────┐    │
│     │ Display customer reviews         │    │
│     │ [Auto-load from posts] or [Add] │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [6] Quick Links                             │
│     ┌─────────────────────────────────┐    │
│     │ Website: [Edit]                  │    │
│     │ Email: [Edit]                    │    │
│     │ Social Media: [Edit]             │    │
│     └─────────────────────────────────┘    │
│                                             │
│ [Save Changes] [Cancel]                    │
└─────────────────────────────────────────────┘

Layout Options:
- Grid layout
- Carousel layout
- Featured layout
- Custom layout
```

**Components:**
- PageBuilder
- HeroSection
- AboutSection
- FeaturedPostsSection
- ProductsSection
- TestimonialsSection
- QuickLinksSection
- LayoutSelector

---

#### **4. Analytics & Insights (`/business-dashboard/analytics`)**

```
Analytics Dashboard:
┌───────────────────────────────────────────┐
│ Time Period: [Last 7 Days ▼]              │
├───────────────────────────────────────────┤
│                                           │
│ Views Over Time (Chart)                   │
│ ╱╲  ╱╲                                    │
│╱  ╲╱  ╲ [2500 views]                     │
│       └                                   │
│                                           │
├───────────────────────────────────────────┤
│ Top Posts                                 │
│ 1. "Sale 50% OFF" - 2,450 views - 98%   │
│ 2. "New Collection" - 2,341 views - 124% │
│ 3. "Behind the Scenes" - 890 views - 45% │
│                                           │
├───────────────────────────────────────────┤
│ Engagement Metrics                        │
│ • Average Views per Post: 456             │
│ • Average Likes: 89                       │
│ • Average Comments: 12                    │
│ • Engagement Rate: 98.5%                  │
│                                           │
├───────────────────────────────────────────┤
│ Audience Insights                         │
│ • Total Followers: 245                    │
│ • New Followers This Week: 12             │
│ • Unfollow Rate: 2%                       │
│ • Peak Active Time: 6-8 PM                │
│                                           │
├───────────────────────────────────────────┤
│ Conversion Metrics                        │
│ • Click-Through Rate: 3.2%                │
│ • Share Rate: 1.5%                        │
│ • Save Rate: 4.8%                         │
└───────────────────────────────────────────┘

Features:
- Time period selector
- Compare periods
- Export reports
- Download PDF
- Custom date range
```

**Components:**
- AnalyticsDashboard
- ViewsChart
- TopPostsList
- MetricsCards
- AudienceInsights
- ConversionMetrics

---

#### **5. Subscriber Management (`/business-dashboard/subscribers`)**

```
Subscribers List:
┌──────────────────────────────────────────┐
│ Total Subscribers: 245                   │
│ This Week: +12 new                       │
├──────────────────────────────────────────┤
│ [Search Subscriber] [Filter] [Export]    │
├──────────────────────────────────────────┤
│ Username    │ Email        │ Joined      │
│─────────────┼──────────────┼─────────────│
│ john_doe    │ john@... ✓   │ 2 weeks ago │
│ sarah_smith │ sarah@...✓   │ 5 days ago  │
│ mike_wilson │ mike@... ✓   │ yesterday   │
├──────────────────────────────────────────┤
│ [Previous] [1] [2] [3] [Next]            │
└──────────────────────────────────────────┘

Features:
- View all followers
- Send messages to followers
- Segment followers
- Export subscriber list
- Track growth
```

**Components:**
- SubscribersList
- SubscriberCard
- FollowerMetrics
- ExportButton

---

#### **6. Settings (`/business-dashboard/settings`)**

```
Business Settings:
┌──────────────────────────────────────────┐
│ Business Profile                         │
│ - Name: [Edit]                           │
│ - Description: [Edit]                    │
│ - Logo: [Upload New]                     │
│ - Banner: [Upload New]                   │
│ - Category: [Select]                     │
│ - Verified Status: ✓ Verified            │
│                                          │
│ Contact Information                      │
│ - Email: [Edit]                          │
│ - Phone: [Edit]                          │
│ - Website: [Edit]                        │
│ - Social Media Links: [Add/Edit]         │
│                                          │
│ Notification Preferences                 │
│ ☑️ New followers                         │
│ ☑️ New comments                          │
│ ☑️ New likes                             │
│ ☑️ Weekly digest                         │
│ ☐ Email notifications                   │
│                                          │
│ [Save Changes] [Cancel]                  │
└──────────────────────────────────────────┘
```

**Components:**
- ProfileSettings
- ContactSettings
- NotificationSettings

---

## 🔄 **API ENDPOINTS NEEDED**

### **Customer Dashboard APIs**

```
GET    /api/dashboard/stats
       - Return: favorites_count, followers_count, etc.

GET    /api/dashboard/favorites
       - Return: List of favorite stores/items
       - Query: ?type=store&limit=10

POST   /api/dashboard/favorites
       - Add favorite

DELETE /api/dashboard/favorites/:id
       - Remove favorite

GET    /api/dashboard/saved-posts
       - Return: Saved posts list

POST   /api/dashboard/saved-posts/:postId
       - Save a post

DELETE /api/dashboard/saved-posts/:postId
       - Unsave a post

GET    /api/dashboard/following
       - Return: List of following

POST   /api/dashboard/following/:businessId
       - Follow a business

DELETE /api/dashboard/following/:businessId
       - Unfollow

GET    /api/dashboard/notifications
       - Return: User notifications (real-time)

POST   /api/dashboard/notifications/:id/read
       - Mark notification as read

GET    /api/dashboard/feed
       - Return: Personalized feed (algorithmic)

POST   /api/dashboard/search-history
       - Log search query
```

### **Business Dashboard APIs**

```
GET    /api/business-dashboard/stats
       - Return: views, likes, followers, etc.

GET    /api/business-dashboard/posts
       - Return: All posts with analytics

POST   /api/business-dashboard/posts
       - Create new post

PUT    /api/business-dashboard/posts/:id
       - Update post

DELETE /api/business-dashboard/posts/:id
       - Delete post

POST   /api/business-dashboard/posts/:id/schedule
       - Schedule post for later

GET    /api/business-dashboard/home-page
       - Return: Home page settings

PUT    /api/business-dashboard/home-page
       - Update home page

GET    /api/business-dashboard/analytics
       - Return: Detailed analytics

GET    /api/business-dashboard/subscribers
       - Return: Followers list

POST   /api/business-dashboard/message-subscribers
       - Send message to followers

GET    /api/business-dashboard/settings
       - Return: Business settings

PUT    /api/business-dashboard/settings
       - Update settings
```

---

## 📂 **COMPONENT STRUCTURE**

```
src/components/
├── dashboard/
│   ├── customer/
│   │   ├── DashboardHome.tsx
│   │   ├── FavoritesGrid.tsx
│   │   ├── SavedPostsList.tsx
│   │   ├── FollowingList.tsx
│   │   ├── NotificationsList.tsx
│   │   ├── PersonalizedFeed.tsx
│   │   └── StatsCard.tsx
│   │
│   └── business/
│       ├── BusinessDashboardHome.tsx
│       ├── PostsList.tsx
│       ├── PostEditor.tsx
│       ├── HomePageBuilder.tsx
│       ├── AnalyticsDashboard.tsx
│       ├── SubscribersList.tsx
│       ├── BusinessSettings.tsx
│       └── PerformanceCards.tsx

src/pages/
├── /dashboard
│   ├── page.tsx (home)
│   ├── favorites/page.tsx
│   ├── saved/page.tsx
│   ├── following/page.tsx
│   ├── alerts/page.tsx
│   └── feed/page.tsx
│
└── /business-dashboard
    ├── page.tsx (home)
    ├── posts/page.tsx
    ├── home-page/page.tsx
    ├── analytics/page.tsx
    ├── subscribers/page.tsx
    └── settings/page.tsx
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Core Customer Dashboard (Week 1)**
- [ ] Create favorites management
- [ ] Create saved posts
- [ ] Create following list
- [ ] Build dashboard home
- [ ] API endpoints

### **Phase 2: Core Business Dashboard (Week 1-2)**
- [ ] Post management (CRUD)
- [ ] Analytics dashboard
- [ ] Home page builder
- [ ] Settings page
- [ ] API endpoints

### **Phase 3: Advanced Features (Week 2)**
- [ ] Notifications system
- [ ] Real-time updates
- [ ] Personalized feed (algorithmic)
- [ ] Post scheduling
- [ ] Subscriber messaging

### **Phase 4: Enhancements (Week 3)**
- [ ] Post duplication
- [ ] Bulk actions
- [ ] Export reports
- [ ] Advanced analytics
- [ ] A/B testing

---

## ✅ **INTEGRATION POINTS**

**Customer Dashboard Integration:**
- Link from main navbar
- Show notification badge
- Access from profile
- Show saved posts count

**Business Dashboard Integration:**
- Link from business profile
- Show post status
- Quick post creation
- Analytics in sidebar

---

## 💡 **KEY FEATURES TO IMPLEMENT**

**Real-Time Features:**
- ✅ Live notification updates (WebSocket/Polling)
- ✅ Live analytics (refresh every 30s)
- ✅ Live follower count
- ✅ Real-time engagement metrics

**Smart Features:**
- ✅ Personalized feed algorithm
- ✅ Price drop alerts
- ✅ Stock availability alerts
- ✅ Best posting time recommendation
- ✅ Engagement optimization tips

**User Experience:**
- ✅ Quick actions
- ✅ Drag-and-drop builder
- ✅ Preview before posting
- ✅ One-click sharing
- ✅ Infinite scroll feed

---

**Everything is specified and ready to build!** 🚀
