-- Fix users table schema to support both Supabase Auth and password-based auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0;

-- Add vetting_score if missing (for verified badges)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vetting_score INTEGER DEFAULT 0;

-- Ensure businesses table has all required columns
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS industry VARCHAR(255) DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reg_number VARCHAR(255) DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS vat_number VARCHAR(255) DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'unregistered';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0;

-- Create documents table if missing
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) DEFAULT 'other',
  file_url VARCHAR(500) DEFAULT '',
  status VARCHAR(50) DEFAULT 'uploaded',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts table if missing
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_likes table if missing
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table if missing
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create connections table if missing
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- Create compliance_reports table if missing
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id UUID REFERENCES users(id),
  reporter_id UUID REFERENCES users(id),
  report_type VARCHAR(255) NOT NULL,
  risk_level VARCHAR(50) DEFAULT 'medium',
  description TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table if missing
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_name VARCHAR(255) DEFAULT '',
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(50) DEFAULT '',
  target_id VARCHAR(255) DEFAULT '',
  target_name VARCHAR(255) DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table if missing
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) DEFAULT 'info',
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
