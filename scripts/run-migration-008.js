const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    // 1. Reports table
    await sql`CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type VARCHAR(50) NOT NULL,
      target_id UUID NOT NULL,
      reason VARCHAR(50) NOT NULL,
      details TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      admin_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`;

    // 2. Agent Activity Log
    await sql`CREATE TABLE IF NOT EXISTS agent_activity_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      business_id UUID REFERENCES users(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_id ON agent_activity_log(agent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at DESC)`;

    // 3. Agent Leads
    await sql`CREATE TABLE IF NOT EXISTS agent_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id UUID REFERENCES users(id) ON DELETE SET NULL,
      business_name VARCHAR(255),
      contact_name VARCHAR(255),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'new',
      notes TEXT,
      next_followup_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_leads_agent_id ON agent_leads(agent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_leads_status ON agent_leads(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_leads_followup ON agent_leads(next_followup_at)`;

    // 4. Verification columns on businesses
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_paid BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_paid_at TIMESTAMPTZ`;

    // 5. business_reviews columns
    await sql`ALTER TABLE business_reviews ADD COLUMN IF NOT EXISTS response TEXT`;
    await sql`ALTER TABLE business_reviews ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ`;
    await sql`ALTER TABLE business_reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE`;

    console.log('All migration statements executed successfully!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
})();
