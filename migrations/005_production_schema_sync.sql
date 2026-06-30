-- 005_production_schema_sync.sql
-- Brings the live schema in line with what the application code expects.
-- All statements are idempotent (safe to re-run). Applied 2026-06-30 to fix
-- 500s on: POST /api/posts, POST /api/users/preferences,
-- GET /api/businesses/packages, GET /api/explore/businesses, and the
-- audit_logs INSERTs used across admin/business routes.

-- ── audit_logs: superset of columns referenced across all routes ──────────
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- ── businesses: package/trial fields + geo coordinates ────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) DEFAULT 'free';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_package VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ── user_preferences: onboarding fields + unique key for upsert ───────────
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS industries JSONB DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS province TEXT DEFAULT '';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preferences_user_id ON user_preferences(user_id);

-- ── users: onboarding flag ────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
