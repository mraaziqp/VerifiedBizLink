-- ==========================================
-- VERIFIED BIZLINK DATABASE MIGRATIONS
-- Complete dashboard & feature implementation
-- ==========================================

-- ==========================================
-- 1. CUSTOMER DASHBOARD TABLES
-- ==========================================

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50), -- 'store', 'product', 'service'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, business_id)
);

-- Saved posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)
);

-- Following table
CREATE TABLE IF NOT EXISTS following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50), -- 'like', 'comment', 'follow', 'alert'
  title VARCHAR(255),
  message TEXT,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query VARCHAR(255),
  search_type VARCHAR(50), -- 'business', 'product', 'service'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. BUSINESS DASHBOARD TABLES
-- ==========================================

-- Post analytics table
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id)
);

-- Business tweets table
CREATE TABLE IF NOT EXISTS business_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id VARCHAR(255) UNIQUE,
  content TEXT NOT NULL,
  twitter_url VARCHAR(500),
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE
);

-- Tweet analytics table
CREATE TABLE IF NOT EXISTS tweet_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES business_tweets(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ADVERTISEMENT TABLES
-- ==========================================

-- Business advertisements table
CREATE TABLE IF NOT EXISTS business_advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  format VARCHAR(50), -- 'image', 'video', 'carousel', 'text'
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft', -- 'active', 'paused', 'expired', 'draft'
  budget DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_location VARCHAR(255),
  target_interests TEXT[],
  target_age_min INTEGER,
  target_age_max INTEGER,
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad analytics table
CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES business_advertisements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  roi NUMERIC(5,2),
  UNIQUE(ad_id, date)
);

-- Ad performance table
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES business_advertisements(id) ON DELETE CASCADE,
  ctr NUMERIC(5,2), -- Click through rate
  conversion_rate NUMERIC(5,2),
  roi NUMERIC(5,2),
  cost_per_click DECIMAL(10,2),
  cost_per_conversion DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ad_id)
);

-- ==========================================
-- 4. COMMENTS & ENGAGEMENT TABLES
-- ==========================================

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url VARCHAR(500), -- Optional image in comment
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comment likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

-- ==========================================
-- 5. INDEXES FOR PERFORMANCE
-- ==========================================

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_business_id ON favorites(business_id);

-- Saved posts indexes
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);

-- Following indexes
CREATE INDEX IF NOT EXISTS idx_following_follower_id ON following(follower_id);
CREATE INDEX IF NOT EXISTS idx_following_following_id ON following(following_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(read);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- Advertisements indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_business_id ON business_advertisements(business_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON business_advertisements(status);

-- Tweets indexes
CREATE INDEX IF NOT EXISTS idx_business_tweets_business_id ON business_tweets(business_id);
CREATE INDEX IF NOT EXISTS idx_business_tweets_archived ON business_tweets(archived);

-- ==========================================
-- 6. ENABLE RLS (Row Level Security)
-- ==========================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE following ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_tweets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can see their own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only see/manage their own comments
CREATE POLICY "Users can see all comments" ON post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON post_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy: Businesses can only see/manage their own advertisements
CREATE POLICY "Businesses can see their own ads" ON business_advertisements
  FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Businesses can create ads" ON business_advertisements
  FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Businesses can update their own ads" ON business_advertisements
  FOR UPDATE USING (auth.uid() = business_id);

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
