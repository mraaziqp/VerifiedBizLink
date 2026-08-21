-- ==========================================
-- 008_complete_upgrade.sql
-- VerifiedBizLink Feature Upgrade Migration
-- Reports, Reviews, Agent Logs, Verification Fee
-- All statements are idempotent (safe to re-run)
-- ==========================================

-- ── 1. Reports Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,  -- 'post', 'business', 'comment'
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL,       -- 'spam', 'inappropriate', 'misleading', 'harassment', 'scam', 'other'
  details TEXT,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'reviewed', 'dismissed', 'actioned'
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ── 2. Agent Activity Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,  -- 'signup', 'email_verified', 'payment_completed', 'status_change', 'commission_earned', 'lead_updated'
  business_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_id ON agent_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at DESC);

-- ── 3. Agent Leads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_name VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',  -- 'new', 'contacted', 'interested', 'signed_up', 'paid', 'lost'
  notes TEXT,
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_leads_agent_id ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_leads_status ON agent_leads(status);
CREATE INDEX IF NOT EXISTS idx_agent_leads_followup ON agent_leads(next_followup_at);

-- ── 4. Verification Fee Columns ───────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_paid_at TIMESTAMPTZ;

-- ── 5. Ensure business_reviews table has all needed columns ───────────────
-- The table may already exist from previous migrations; add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_reviews' AND column_name = 'response') THEN
    ALTER TABLE business_reviews ADD COLUMN response TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_reviews' AND column_name = 'response_at') THEN
    ALTER TABLE business_reviews ADD COLUMN response_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_reviews' AND column_name = 'is_visible') THEN
    ALTER TABLE business_reviews ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_reviewer ON business_reviews(reviewer_id);

-- ── 6. Migration Complete ─────────────────────────────────────────────────
