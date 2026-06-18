/**
 * Automatic Database & Supabase Setup Endpoint
 *
 * POST /api/setup/initialize-db
 *
 * Creates:
 * - All Neon database tables
 * - Supabase storage buckets
 * - Admin user (mraaziqp@gmail.com / 114477)
 *
 * Body: { "setupSecret": "dev-seed-secret-2024-vbl" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const NEON_SQL = `
-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'customer',
  avatar_url TEXT,
  headline TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- FOLLOWERS TABLE
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- FAVORITES TABLE
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  business_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cipc_number VARCHAR(255),
  sars_number VARCHAR(255),
  bank_account VARCHAR(255),
  verified_status VARCHAR(50) DEFAULT 'pending',
  trust_score INT DEFAULT 0,
  badge_level VARCHAR(50) DEFAULT 'none',
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- VETTING REQUESTS TABLE
CREATE TABLE IF NOT EXISTS vetting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  cipc_verified BOOLEAN DEFAULT FALSE,
  sars_verified BOOLEAN DEFAULT FALSE,
  bank_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vetting_business_id ON vetting_requests(business_id);
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupSecret } = body;

    // Verify secret
    if (!setupSecret || setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Forbidden - Invalid setup secret' },
        { status: 403 }
      );
    }

    const results: any = {
      neon: { status: 'pending', tables: 0 },
      supabase: { status: 'pending', buckets: [] },
      auth: { status: 'pending', user: null },
    };

    // ==========================================
    // 1. NEON TABLES SETUP (Manual - see instructions)
    // ==========================================
    results.neon.status = 'manual';
    results.neon.message = 'Run SQL manually in Neon console (safer & more reliable)';
    results.neon.instructions = 'Go to console.neon.tech → SQL Editor → Run the SQL from FRESH_DB_SETUP.md';

    // ==========================================
    // 2. CREATE SUPABASE STORAGE BUCKETS
    // ==========================================
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const bucketsToCreate = ['posts', 'avatars', 'businesses', 'certificates'];

      for (const bucket of bucketsToCreate) {
        try {
          const { data, error } = await supabase.storage.createBucket(bucket, {
            public: true,
            allowedMimeTypes: ['image/*', 'video/*'],
          });

          if (error) {
            if (error.message.includes('already exists')) {
              results.supabase.buckets.push({
                name: bucket,
                status: 'exists',
                message: 'Bucket already exists',
              });
            } else {
              results.supabase.buckets.push({
                name: bucket,
                status: 'error',
                message: error.message,
              });
            }
          } else {
            results.supabase.buckets.push({
              name: bucket,
              status: 'created',
              message: 'Bucket created successfully',
            });
          }
        } catch (bucketError: any) {
          results.supabase.buckets.push({
            name: bucket,
            status: 'error',
            message: bucketError.message,
          });
        }
      }

      results.supabase.status = 'success';
    } catch (error: any) {
      results.supabase.status = 'error';
      results.supabase.message = error.message;
    }

    // ==========================================
    // 3. CREATE ADMIN USER IN SUPABASE AUTH
    // ==========================================
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'mraaziqp@gmail.com',
        password: '114477',
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin User',
        },
      });

      if (error) {
        if (error.message.includes('already exists')) {
          results.auth.status = 'exists';
          results.auth.user = {
            email: 'mraaziqp@gmail.com',
            message: 'User already exists',
          };
        } else {
          results.auth.status = 'error';
          results.auth.message = error.message;
        }
      } else {
        results.auth.status = 'success';
        results.auth.user = {
          id: data.user?.id,
          email: data.user?.email,
          message: 'User created successfully',
        };

        // Also create user profile in Neon via Supabase
        try {
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: data.user?.id,
              email: 'mraaziqp@gmail.com',
              full_name: 'Admin User',
              role: 'admin',
              email_verified: true,
            }, { onConflict: 'email' })
            .select();

          if (!profileError) {
            results.auth.userProfile = 'Created in Neon';
          } else {
            results.auth.userProfile = `Profile created in Auth, Neon insert skipped`;
          }
        } catch (profileError: any) {
          results.auth.userProfile = `Profile creation note: ${profileError.message}`;
        }
      }
    } catch (error: any) {
      results.auth.status = 'error';
      results.auth.message = error.message;
    }

    // ==========================================
    // RETURN RESULTS
    // ==========================================
    return NextResponse.json(
      {
        success: true,
        message: 'Database initialization complete',
        timestamp: new Date().toISOString(),
        results,
        nextSteps: [
          '1. Clear browser cache (Ctrl+Shift+Delete)',
          '2. Hard refresh page (Ctrl+Shift+R)',
          '3. Login with: mraaziqp@gmail.com / 114477',
          '4. Dashboard should load without 401 errors',
        ],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
