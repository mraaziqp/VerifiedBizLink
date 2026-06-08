-- Subscription Tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_zar DECIMAL(10, 2) NOT NULL DEFAULT 0,
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time

  -- Features & Permissions (JSON for flexibility)
  features JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{}',

  -- Stripe Integration
  stripe_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),

  -- PayPal Integration
  paypal_plan_id VARCHAR(255),

  -- Tier Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by_admin_id UUID,

  CONSTRAINT valid_price CHECK (price_usd >= 0 AND price_zar >= 0)
);

-- Tier Features Breakdown (for easy querying)
CREATE TABLE IF NOT EXISTS tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  feature_description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Usage limits (if applicable)
  monthly_limit INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tier_id, feature_name)
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),

  -- Subscription Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, cancelled, expired

  -- Dates
  started_at TIMESTAMP DEFAULT NOW(),
  renews_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  ends_at TIMESTAMP,

  -- Payment Info
  stripe_subscription_id VARCHAR(255),
  paypal_subscription_id VARCHAR(255),

  -- Override Permissions (for special cases)
  permission_overrides JSONB DEFAULT '{}',

  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (renews_at IS NULL OR renews_at > started_at)
);

-- Tier Pricing History (audit trail for price changes)
CREATE TABLE IF NOT EXISTS tier_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,

  old_price_usd DECIMAL(10, 2),
  new_price_usd DECIMAL(10, 2),
  old_price_zar DECIMAL(10, 2),
  new_price_zar DECIMAL(10, 2),

  changed_by_admin_id UUID,
  reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions Lookup (all available permissions)
CREATE TABLE IF NOT EXISTS system_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'api', 'features', 'limits', 'support'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_tier_features_tier_id ON tier_features(tier_id);
CREATE INDEX idx_subscription_tiers_active ON subscription_tiers(is_active);

-- Insert default tiers
INSERT INTO subscription_tiers (name, description, price_usd, price_zar, billing_interval, display_order, is_active)
VALUES
  ('Free', 'Basic tier for individuals', 0, 0, 'one-time', 1, TRUE),
  ('Standard', 'For growing businesses', 50, 900, 'monthly', 2, TRUE),
  ('Premium', 'For established businesses', 100, 1800, 'monthly', 3, TRUE),
  ('Enterprise', 'Custom enterprise solutions', 0, 0, 'monthly', 4, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert common permissions
INSERT INTO system_permissions (code, name, description, category)
VALUES
  ('can_create_posts', 'Create Posts', 'Ability to create and publish posts', 'features'),
  ('can_view_analytics', 'View Analytics', 'Access to business analytics dashboard', 'features'),
  ('can_manage_team', 'Manage Team', 'Ability to invite and manage team members', 'features'),
  ('can_export_data', 'Export Data', 'Ability to export business data', 'features'),
  ('api_access', 'API Access', 'Access to REST API', 'api'),
  ('unlimited_api_calls', 'Unlimited API', 'Unlimited API calls (otherwise rate limited)', 'api'),
  ('advanced_reporting', 'Advanced Reports', 'Access to advanced reporting features', 'features'),
  ('priority_support', 'Priority Support', '24/7 priority support', 'support'),
  ('email_support', 'Email Support', 'Email support access', 'support'),
  ('custom_domain', 'Custom Domain', 'Ability to use custom domain', 'features'),
  ('white_label', 'White Label', 'White label solution', 'features')
ON CONFLICT (code) DO NOTHING;
