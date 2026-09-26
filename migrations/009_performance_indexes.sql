-- Performance indexes for the queries the app runs on every page view.
-- Same statements as src/lib/db-indexes.ts (run by POST /api/setup/migrate).
-- Paste into the Neon SQL editor one statement at a time: CONCURRENTLY
-- cannot run inside a transaction block, so do not wrap these in BEGIN/COMMIT.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_user_id ON businesses (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_verified_trust ON businesses (status, trust_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_created ON posts (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_receiver_status ON connections (receiver_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_status_created ON job_postings (status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_business_created ON job_postings (business_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_job ON job_applications (job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_applicant ON job_applications (applicant_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_business ON ads (business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_serving ON ads (slot_placement, is_boosted DESC, created_at DESC) WHERE is_active = true;

-- Duplicate message indexes (two code paths created the same pair under
-- different names). Only drop if the keeper exists:
--   SELECT indexname FROM pg_indexes WHERE tablename = 'messages';
-- DROP INDEX CONCURRENTLY IF EXISTS idx_messages_pair;      -- keeper: messages_pair_idx
-- DROP INDEX CONCURRENTLY IF EXISTS idx_messages_receiver;  -- keeper: messages_receiver_unread_idx
